import {Server, Socket} from 'socket.io';
import * as http from "http";
import jwt from 'jsonwebtoken';
import Logger from "../logger/logger";
import Filter from "bad-words";

import {RoomsService} from './rooms-service';
import {MessageGeneratorService} from "./message-generator-service";
import {UsersService} from "./users-service";
import {Message} from "../interfaces/message";
import {User} from "../interfaces/user";
import {UserTokenPayload} from "../interfaces/userTokenPayload";
import {RoomPopulatedUsers} from "../interfaces/roomPopulatedUsers";
import {ExpiredUserTokenException} from "./exceptions/user-related-exceptions/expired-user-token-exception";
import {UnauthorizedActionException} from "./exceptions/user-related-exceptions/unauthorized-action-exception";

import {abstractExceptionHandler} from './exceptions/abstract-exception-handler'
import {ProblemRemovingSocketFromSocketIORoomException} from "./exceptions/room-related-exceptions/problem-removing-socket-from-socket-i-o-room-exception";
import {InvalidMessageQueryDataException} from "./exceptions/message-related-exceptions/invalid-message-query-data-exception";
import {ProfaneLanguageNotAllowedException} from "./exceptions/general-exceptions/profane-language-not-allowed-exception";
import {UserNotInRoomException} from "./exceptions/user-related-exceptions/user-not-in-room-exception";

export const socket = (server: http.Server) => {
    const io = new Server(server, {
        cors: {
            origin: [process.env.NG_APP_URL]
        }
    });

    // get UsersService singleton instance
    const usersServiceSingleton = UsersService.getInstance();
    // get RoomsService singleton instance
    const roomsServiceSingleton = RoomsService.getInstance();
    // get MessageGeneratorService singleton instance
    const msgGeneratorSingleton = MessageGeneratorService.getInstance();

    // setup socketIO auth middleware, THIS ONLY RUNS ONCE ON SOCKET_IO CONNECTION ESTABLISHMENT!!!!
    io.use((async (socket: Socket, next) => {
        // check if socket auth payload is present
        if (socket.handshake.headers.cookie) {
            let userId: UserTokenPayload;
            // get token value from cookie, token is stored as access_token=token-value string
            const token = socket.handshake.headers.cookie?.split('=')[1];

            try {
                // verify token validity
                userId = (jwt.verify(token, process.env.JWT_SECRET)) as UserTokenPayload;
            } catch (err) {
                if (err instanceof Error) {
                    Logger.warn(`Socket: AuthMiddleware: Failed to validate user auth header with err message ${err.message}`);

                    // check if user token expired
                    if (err.name === 'TokenExpiredError') {
                        Logger.warn('ExpressMiddleware: TokenExpiredErr caught, cleanup user state using token from cookie.');

                        // handle remove user from room and remove user's expired token
                        await usersServiceSingleton.verifyUserTokenFetchUser(token!);
                    }
                    next(new ExpiredUserTokenException());
                }
            }
            // save users tokenId to DB
            await usersServiceSingleton.saveUsersSocketID(userId!._id, socket.id);

            // if no err set userId and token as session variables on data property
            socket.data.userId = userId!._id;
            socket.data.token = token;
            // continue chain
            next();
        } else {
            // no cookie present on socketIO connection request
            Logger.warn(`Socket: io.use: Problem authenticating user, no cookie provided socket.handshake.headers.cookie = ${socket.handshake.headers.cookie}.`);

            next(new UnauthorizedActionException());
        }
    }));


    // listen to new connection and get socket instance of the connected party
    io.on('connection', (socket: Socket) => {
        Logger.debug(`Socket: io.on connection: New Websocket connection.`);

        // HANDLE INCOMING CREATE ROOM SOCKET_IO REQUEST
        socket.on('createRoom', async ({newRoom}, callback) => {
            try {
                // verify user token helper
                const {currentUser} = await usersServiceSingleton.verifyUserTokenFetchUser(socket.data.token);

                // response is error if there was a problem and roomName if not
                const {roomName} = await roomsServiceSingleton.createRoom(currentUser, newRoom);

                // send roomUsersUpdate to all sockets in current room
                await sendUsersInRoomUpdate(io, roomName);

                // send roomsListUpdate to all sockets
                await sendRoomsListUpdate(io);

                // if no err current user joins chat group, response is the room name
                socket.join(roomName!);

                Logger.debug(`Socket: socket.on createRoom: The socket ${socket.id} has joined the room ${roomName}.`);

                // helper method that sends greeting messages and returns callback to listener
                await sendInitialMessages(io, socket, currentUser!, roomName!, callback);

            } catch (e) {
                // handle any propagated error
                abstractExceptionHandler(e, callback);
            }
        });

        // HANDLE INCOMING EDIT ROOM SOCKET_IO REQUEST
        socket.on('editRoom', async ({room}, callback) => {
            try {
                // verify user token helper
                const {currentUser} = await usersServiceSingleton.verifyUserTokenFetchUser(socket.data.token);

                // check if current user has ownership of the room
                const {foundRoom} = await usersServiceSingleton.checkUserRoomOwnershipFetchRoom(currentUser?._id, room._id);

                // check if the newly provided roomName is already in use
                await roomsServiceSingleton.checkIfRoomNameExists(room.name, foundRoom!._id);

                // if all is well edit room
                await roomsServiceSingleton.editRoom(room, foundRoom!);

                // send roomsListUpdate to all sockets
                await sendRoomsListUpdate(io);

                // send updated rooms list created by user
                const {allUserRooms} = await roomsServiceSingleton.fetchAllUserRooms(currentUser!);

                // emit fetchUserRooms socketIO event with allUserRooms found to specific socket
                socket.emit('fetchUserRooms', allUserRooms);

            } catch (e) {
                abstractExceptionHandler(e, callback);
            }
        });

        // HANDLE INCOMING DELETE_ROOM SOCKET_IO REQUESTS
        socket.on('deleteRoom', async ({roomId}, callback) => {
            try {
                // verify user token helper
                const {currentUser} = await usersServiceSingleton.verifyUserTokenFetchUser(socket.data.token);

                // check if current user has ownership of the room
                const {foundRoom} = await usersServiceSingleton.checkUserRoomOwnershipFetchRoom(currentUser?._id, roomId);

                await roomsServiceSingleton.deleteRoom(foundRoom!._id);

                // delete room from socketIO itself by removing all the sockets from it
                // get socketIO clientSocket ids for all sockets that are in room
                const clientSocketIds = io.sockets.adapter.rooms.get(foundRoom!.name);
                if (clientSocketIds && clientSocketIds.size !== 0) {
                    // iterate through all clientSocket ids that are in the room
                    for (const clientId of clientSocketIds) {
                        // get client socket of user in room by using its id
                        const clientSocket = io.sockets.sockets.get(clientId);
                        // if the clientSocket was retrieved call leave on it in order to remove it from the room
                        if (clientSocket) {
                            //you can do whatever you need with this
                            clientSocket.leave(foundRoom!.name);
                        }
                    }
                    Logger.debug(`socket.ts deleteRoom: removed all sockets from SocketIO instance of the room.`);
                } else {
                    Logger.warn(`socket.ts deleteRoom: Failed to retrieve the socketIds of all the clients inside the room ${foundRoom?.name}`);
                }

                // send roomsListUpdate to all sockets
                await sendRoomsListUpdate(io);

                // send updated rooms list created by user
                const {allUserRooms} = await roomsServiceSingleton.fetchAllUserRooms(currentUser!);

                // emit fetchUserRooms socketIO event with allUserRooms found
                socket.emit('fetchUserRooms', allUserRooms);

            } catch (e) {
                abstractExceptionHandler(e, callback);
            }
        });

        // HANDLE INCOMING JOIN_ROOM SOCKET_IO REQUEST
        socket.on('joinRoom', async ({roomName}, callback) => {
            try {
                // verify user token helper
                const {currentUser} = await usersServiceSingleton.verifyUserTokenFetchUser(socket.data.token);

                // update rooms state
                await roomsServiceSingleton.joinRoom(currentUser, roomName);

                // if no err socket joins the room
                socket.join(roomName);

                Logger.debug(`Socket: socket.on joinRoom: The socket ${socket.id} has joined the room ${roomName}.`);

                // send roomUsersUpdate to all sockets in current room
                await sendUsersInRoomUpdate(io, roomName);

                // helper method that sends greeting messages and returns callback to listener
                await sendInitialMessages(io, socket, currentUser, roomName, callback);

            } catch (e) {
                abstractExceptionHandler(e, callback);
            }
        });

        // HANDLE INCOMING LEAVE_ROOM SOCKET_IO REQUEST
        socket.on('leaveRoom', async ({roomName}, callback) => {
            try {
                // verify user token helper
                const {currentUser} = await usersServiceSingleton.verifyUserTokenFetchUser(socket.data.token);

                // fetch roomData for provided roomName
                const {room} = await roomsServiceSingleton.fetchRoom(roomName);

                // update roomsState by removing the user
                await roomsServiceSingleton.leaveRoom(currentUser!._id, room!);

                // send roomUsersUpdate to all sockets in current room
                await sendUsersInRoomUpdate(io, roomName);

                // if no error user leaves socketIO group
                socket.leave(roomName);

                Logger.debug(`Socket: socket.on leaveRoom: The socket ${socket.id} has left the room ${roomName}.`);

                // generate Server message that user has left the room
                const userLeftMsg: Message = msgGeneratorSingleton.generateMessage(undefined, `${currentUser?.name} has left the chat.`);
                // send message from server to all users in room
                io.to(roomName).emit('message', userLeftMsg);

            } catch (e) {
                abstractExceptionHandler(e, callback);
            }
        });

        // HANDLE INCOMING KICK_USER_FROM_ROOM SOCKET_IO REQUEST
        socket.on('kickUserFromRoom', async ({roomName, userId}, callback) => {
            try {
                Logger.debug(`socket.ts: kickUserFromRoom triggered for room ${roomName} and userId ${userId}`);

                // verify user token helper
                const {currentUser} = await usersServiceSingleton.verifyUserTokenFetchUser(socket.data.token);

                // fetch room by room name
                const {room} = await roomsServiceSingleton.fetchRoom(roomName);

                await roomsServiceSingleton.kickUserFromRoom(room, userId, currentUser!);

                // get kicked user data
                const {user} = await usersServiceSingleton.fetchUserById(userId);

                // remove user's socket instance from SocketIO room state
                Logger.debug(`Socket: socket.on kickUserFromRoom(): Triggered removeSocketFromRoom() (socketIO room state).`);
                removeSocketFromRoom(io, user!, roomName, 'kick');

                // send roomUsersUpdate to all sockets in current room
                await sendUsersInRoomUpdate(io, roomName);

                Logger.debug(`Socket: socket.on kickUserFromRoom(): The user ${user?.name} was kicked from the room ${roomName} successfully.`);

                // send socketIO emit to all users within the room that the user was kicked
                const userWasKickedMsg: Message = msgGeneratorSingleton.generateMessage(undefined, `${user?.name} was kicked from the room.`);
                io.to(roomName).emit('message', userWasKickedMsg);

            } catch (e) {
                abstractExceptionHandler(e, callback);
            }
        });

        // HANDLE INCOMING BAN USER FROM ROOM SOCKET_IO REQUEST
        socket.on('banUserFromRoom', async ({roomName, userId}, callback) => {
            try {
                Logger.debug(`socket.ts: banUserFromRoom triggered for room ${roomName} and userId ${userId}`);

                // verify user token helper
                const {currentUser} = await usersServiceSingleton.verifyUserTokenFetchUser(socket.data.token);

                // fetch room by room name
                const {room} = await roomsServiceSingleton.fetchRoom(roomName);

                await roomsServiceSingleton.banUserFromRoom(room, userId, currentUser);

                // get banned user data, needed for socketId of banned user
                const {user} = await usersServiceSingleton.fetchUserById(userId);

                // remove user's socket instance from SocketIO room state
                Logger.debug(`Socket: socket.on banUserFromRoom(): Triggered removeSocketFromRoom() (socketIO room state).`);
                removeSocketFromRoom(io, user, roomName, 'ban');

                // send roomUsersUpdate to all sockets in current room
                await sendUsersInRoomUpdate(io, roomName);

                Logger.debug(`Socket: socket.on banUserFromRoom(): The user ${user.name} was banned from the room ${roomName} successfully.`);

                // send socketIO emit message as Server to all users within the room that the user was banned
                const userWasBannedMsg: Message = msgGeneratorSingleton.generateMessage(undefined, `${user.name} was banned from the room.`);
                io.to(roomName).emit('message', userWasBannedMsg);

            } catch (e) {
                abstractExceptionHandler(e, callback);
            }
        });

        // HANDLE INCOMING FETCH_ROOM SOCKET_IO REQUEST
        socket.on('fetchRoom', async ({roomName}, callback) => {
            try {
                Logger.debug(`socket.ts: socket.on fetchRoom triggered for room ${roomName}`);
                // verify user token helper
                await usersServiceSingleton.verifyUserTokenFetchUser(socket.data.token);

                // fetch room by room name
                const {room} = await roomsServiceSingleton.fetchRoom(roomName);

                // if room was found emit fetchRoom event with roomData
                socket.emit('fetchRoom', room);

            } catch (e) {
                abstractExceptionHandler(e, callback);
            }
        });

        // HANDLE INCOMING FETCH_ALL_ROOMS SOCKET_IO REQUEST
        socket.on('fetchAllRooms', async (callback) => {
            try {
                // verify user token helper
                await usersServiceSingleton.verifyUserTokenFetchUser(socket.data.token);

                // fetch all created rooms
                const {allRooms} = await roomsServiceSingleton.fetchAllRooms();

                // emit fetchAllRooms SocketIO request by sending all created rooms
                socket.emit('fetchAllRooms', allRooms);

            } catch (e) {
                abstractExceptionHandler(e, callback);
            }
        });

        // HANDLE INCOMING FETCH_USER_ROOMS SOCKET_IO REQUEST
        socket.on('fetchUserRooms', async (callback) => {
            try {
                // verify user token helper
                const {currentUser} = await usersServiceSingleton.verifyUserTokenFetchUser(socket.data.token);

                // fetch all rooms created by specific user
                const {allUserRooms} = await roomsServiceSingleton.fetchAllUserRooms(currentUser!);

                // emit fetchUserRooms socketIO event with allUserRooms found
                socket.emit('fetchUserRooms', allUserRooms);

            } catch (e) {
                abstractExceptionHandler(e, callback);
            }
        });

        // HANDLE SEND_MESSAGE SOCKET_IO REQUEST
        socket.on('sendMessage', async ({roomName, message}, callback) => {
            try {
                // check if proper message was sent
                if (!message || message.trim() === '') {
                    throw new InvalidMessageQueryDataException();
                }

                // catch profane language in message
                const badWordsFilter = new Filter();

                if (badWordsFilter.isProfane(message)) {
                    Logger.debug(`Socket.ts: socket.on sendMessage: Profane language check triggered in room ${roomName}.`);
                    throw new ProfaneLanguageNotAllowedException();
                }

                const {room, currentUser} = await initialUserRoomChecksAndDataRetrieval(socket.data.token, roomName);

                // generate proper Message obj
                const chatMessage: Message = msgGeneratorSingleton.generateMessage(currentUser, message);
                // update room chat history
                const {savedChatMessage} = await roomsServiceSingleton.saveChatHistory(room, chatMessage);

                // emit socketIO only to sockets that are in the room
                io.to(room.name).emit('message', savedChatMessage);

                Logger.info(`Socket.ts: sendMessage() triggered for message ${savedChatMessage?.text}`);

                callback('Info: Message sent successfully!');
            } catch (e) {
                abstractExceptionHandler(e, callback);
            }
        });

        // HANDLE EDIT MESSAGE SOCKET_IO EVENT
        socket.on('editMessage', async ({roomName, editedMessage}: { roomName: string; editedMessage: Message }, callback) => {
            try {
                Logger.debug(`socket.ts: editMessage: Triggered for roomName ${roomName} and editedMessage ${editedMessage.text}`);

                // check if proper message was sent
                if (!editedMessage || editedMessage.text.trim() === '' || !editedMessage._id) {
                    throw new InvalidMessageQueryDataException();
                }

                // use helper method for initial room/user related checks and to retrieve currentUser data as well as room data
                const {room} = await initialUserRoomChecksAndDataRetrieval(socket.data.token, roomName);

                // check if user is author of the message that he is editing
                usersServiceSingleton.checkIfMessageBelongsToUser(editedMessage, socket.data.userId);

                // edit user message
                const {updatedRoom} = await usersServiceSingleton.editUserMessage(editedMessage, room!);

                // emit socketIO event roomChatHistoryEdited only to sockets that are in the room while passing the updatedRoom data
                io.to(room!.name).emit('roomDataUpdate', updatedRoom);

                Logger.debug(`socket.ts: editMessage: emitted roomDataUpdate with updatedRoomData`);

            } catch (e) {
                abstractExceptionHandler(e, callback);
            }
        });

        // CATCH SOCKET_IO DISCONNECT EVENT
        socket.on('disconnect', async (reason: string) => {
            // remove user's socketId from DB before disconnect
            await usersServiceSingleton.removeUsersSocketID(socket.data.userId, socket.id);

            Logger.warn(`Socket: socket.on disconnect: SocketIO connection closed for socket ${socket.id}. Reason: ${reason}.`);
        });
    });
}

// HELPER METHODS
// initial user checks and get specific room and currentUser data
const initialUserRoomChecksAndDataRetrieval = async (token: string, roomName: string): Promise<{ room: RoomPopulatedUsers, currentUser: User }> => {

    const {currentUser} = await UsersService.getInstance().verifyUserTokenFetchUser(token);

    // check if room exists
    const {room} = await RoomsService.getInstance().fetchRoom(roomName);

    // check if user in actual room where he is sending a message
    const {userIsInRoom} = RoomsService.getInstance().checkIfUserIsInRoom(room.usersInRoom, currentUser.id, roomName);
    // check if isUserInRoomErr exists
    if (!userIsInRoom) {
        throw new UserNotInRoomException();
    }

    return {room, currentUser};
}

const sendInitialMessages = async (io: Server, socket: any, currentUser: User, roomName: string, callback: any) => {
    // get msgGeneratorSingleton instance
    const msgGeneratorSingleton = MessageGeneratorService.getInstance();
    // Send greetings from app msg to current socket.
    const welcomeMsg: Message = msgGeneratorSingleton.generateMessage(undefined, 'Welcome to the Chat app! Please follow our guidelines.');

    // send message to specific user
    io.to(socket.id).emit('message', welcomeMsg);

    // send socketIO emit to all users within the room
    const newUserInRoomMsg: Message = msgGeneratorSingleton.generateMessage(undefined, `${currentUser.name} has joined the chat.`);
    socket.broadcast.to(roomName).emit('message', newUserInRoomMsg);

    // return callback with roomName
    callback(roomName);
}

// remove socket instance from SocketIO room
const removeSocketFromRoom = (io: Server, user: User, roomName: string, kickOrBan: string) => {
    // get msgGeneratorSingleton instance
    const msgGeneratorSingleton = MessageGeneratorService.getInstance();
    // if we got here user exists, get socket instance by using user's socketID and call leave room on that instance
    if (user.socketId) {
        // get client's socket instance by using the user's socketId
        const client = io.sockets.sockets.get(user.socketId);

        // remove client's socket from the room
        client!.leave(roomName);

        // generate kickedFromRoomMsg and notify the client socket that it was kicked from the room
        const removedFromRoomMsg = msgGeneratorSingleton.generateMessage(undefined, `You were ${kickOrBan === 'kick' ? 'kicked' : 'banned'} from the room by the admin.`);
        client!.emit(kickOrBan === 'kick' ? 'kickedFromRoom' : 'bannedFromRoom', removedFromRoomMsg);

        Logger.debug(`Socket: removeSocketFromRoom():  Updated socketIO room state by removing socketInstance ${user!.socketId} from room.`);
    } else {
        // if there was no socketId for the given user return an err
        Logger.error(`Socket: removeSocketFromRoom(): Problem removing user from SocketIO room with socketID ${user!.socketId} roomName= ${roomName}`);
        throw new ProblemRemovingSocketFromSocketIORoomException();
    }
}


const sendUsersInRoomUpdate = async (io: Server, roomName: string) => {
    // get latest room data
    const {room} = await RoomsService.getInstance().fetchRoom(roomName);

    Logger.debug(`Socket.ts: sendUsersInRoomUpdate: Sent update with room data for room ${roomName}`);
    // send socketIO roomDataUpdate emit to all users within the room
    io.to(roomName).emit('roomDataUpdate', room);
}

const sendRoomsListUpdate = async (io: Server) => {
    // fetch all rooms
    const {allRooms} = await RoomsService.getInstance().fetchAllRooms();

    Logger.debug('Socket.ts: sendRoomsListUpdate: Sent rooms list update');
    // send socketIO roomsListUpdate emit to all users
    io.emit('roomsListUpdate', allRooms);
}

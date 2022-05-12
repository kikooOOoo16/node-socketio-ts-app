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
import {ExceptionFactory} from "./exceptions/exception-factory";
import {customExceptionType} from "./exceptions/custom-exception-type";
import {CustomException} from "./exceptions/custom-exception";
import {UserTokenPayload} from "../interfaces/userTokenPayload";
import {RoomPopulatedUsers} from "../interfaces/roomPopulatedUsers";

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
            let customException: CustomException;
            // get token value from cookie, token is stored as access_token=token-value string
            const token = socket.handshake.headers.cookie?.split('=')[1];

            try {
                // verify token validity
                userId = (jwt.verify(token, process.env.JWT_SECRET)) as UserTokenPayload;
            } catch (err) {
                if (err instanceof Error) {
                    Logger.warn(`Socket: AuthMiddleware: Failed to validate user auth header with err message ${err.message}`);
                    customException = ExceptionFactory.createException(customExceptionType.UNAUTHORIZED_ACTION);
                    // check if user token expired
                    if (err.name === 'TokenExpiredError') {
                        Logger.warn('ExpressMiddleware: TokenExpiredErr caught, cleanup user state using token from cookie.');
                        customException = ExceptionFactory.createException(customExceptionType.EXPIRED_USER_TOKEN);
                        // handle remove user from room and remove user's expired token
                        await usersServiceSingleton.verifyUserTokenFetchUser(token!);
                    }
                    next(new Error(customException.printError()));
                }
            }
            // save users tokenId to DB
            const {err: saveUsersSocketIDErr} = await usersServiceSingleton.saveUsersSocketID(userId!._id, socket.id);
            // check if socketId was saved if not return err
            if (saveUsersSocketIDErr !== '') {
                next(new Error(saveUsersSocketIDErr));
            }
            // if no err set userId and token as session variables on data property
            socket.data.userId = userId!._id;
            socket.data.token = token;
            // continue chain
            next();
        } else {
            // no cookie present on socketIO connection request
            Logger.warn(`Socket: io.use: Problem authenticating user, no cookie provided socket.handshake.headers.cookie = ${socket.handshake.headers.cookie}.`);
            const customException: CustomException = ExceptionFactory.createException(customExceptionType.UNAUTHORIZED_ACTION);
            next(new Error(customException.printError()));
        }
    }));


    // listen to new connection and get socket instance of the connected party
    io.on('connection', (socket: Socket) => {
        Logger.debug(`Socket: io.on connection: New Websocket connection.`);

        // HANDLE INCOMING CREATE ROOM SOCKET_IO REQUEST
        socket.on('createRoom', async ({newRoom}, callback) => {
            // verify user token helper
            const {currentUser, err} = await usersServiceSingleton.verifyUserTokenFetchUser(socket.data.token);

            // check if verifyUserToken returned an error
            if (err !== '') {
                return callback(err);
            }

            // response is error if there was a problem and roomName if not
            const {roomName, createRoomErr} = await roomsServiceSingleton.createRoom(currentUser!, newRoom);

            // check if response is an error, if not current socket joins the newly created room
            if (createRoomErr !== '') {
                return callback(createRoomErr);
            }

            // send roomUsersUpdate to all sockets in current room
            await sendUsersInRoomUpdate(io, roomName!, callback);

            // send roomsListUpdate to all sockets
            await sendRoomsListUpdate(io, callback);

            // if no err current user joins chat group, response is the room name
            socket.join(roomName!);

            Logger.debug(`Socket: socket.on createRoom: The socket ${socket.id} has joined the room ${roomName}.`);

            // helper method that sends greeting messages and returns callback to listener
            await sendInitialMessages(io, socket, currentUser!, roomName!, callback);
        });

        // HANDLE INCOMING EDIT ROOM SOCKET_IO REQUEST
        socket.on('editRoom', async ({room}, callback) => {
            // verify user token helper
            const {currentUser, err} = await usersServiceSingleton.verifyUserTokenFetchUser(socket.data.token);

            // check if verifyUserToken returned an error
            if (err !== '') {
                return callback(err);
            }

            // check if current user has ownership of the room
            const {err: checkRoomOwnershipErr, foundRoom} = await usersServiceSingleton.checkUserRoomOwnershipFetchRoom(currentUser?._id, room._id);
            // check if checkUserRoomOwnership passed if not return err
            if (checkRoomOwnershipErr !== '') {
                return callback(checkRoomOwnershipErr);
            }

            // check if the newly provided roomName is already in use
            const {err: checkIfRoomNameExistsErr} = await roomsServiceSingleton.checkIfRoomNameExists(room.name, foundRoom!._id);
            // if the provided room name is in use return an err
            if (checkIfRoomNameExistsErr !== '') {
                return callback(checkIfRoomNameExistsErr);
            }

            // if all is well edit room
            const {err: editRoomErr} = await roomsServiceSingleton.editRoom(room, foundRoom!);
            // check if edit room returned an error
            if (editRoomErr) {
                return callback(editRoomErr);
            }

            // send roomsListUpdate to all sockets
            await sendRoomsListUpdate(io, callback);

            // send updated rooms list created by user
            const {allUserRooms, err: fetchUserRoomsErr} = await roomsServiceSingleton.fetchAllUserRooms(currentUser!);

            // check if error occurred during fetchAllUserRooms
            if (fetchUserRoomsErr !== '') {
                return callback(fetchUserRoomsErr);
            }

            // emit fetchUserRooms socketIO event with allUserRooms found to specific socket
            socket.emit('fetchUserRooms', allUserRooms);
        });

        // HANDLE INCOMING DELETE_ROOM SOCKET_IO REQUESTS
        socket.on('deleteRoom', async ({roomId}, callback) => {
            // verify user token helper
            const {currentUser, err} = await usersServiceSingleton.verifyUserTokenFetchUser(socket.data.token);

            // check if verifyUserToken returned an error
            if (err !== '') {
                return callback(err);
            }

            // check if current user has ownership of the room
            const {err: checkRoomOwnershipErr, foundRoom} = await usersServiceSingleton.checkUserRoomOwnershipFetchRoom(currentUser?._id, roomId);
            // check if checkUserRoomOwnership passed if not return err
            if (checkRoomOwnershipErr !== '') {
                return callback(checkRoomOwnershipErr);
            }

            const {err: deleteRoomErr} = await roomsServiceSingleton.deleteRoom(foundRoom!._id);
            // check if deleteRoom passed if not return err
            if (deleteRoomErr !== '') {
                return callback(deleteRoomErr);
            }

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
            await sendRoomsListUpdate(io, callback);

            // send updated rooms list created by user
            const {allUserRooms, err: fetchUserRoomsErr} = await roomsServiceSingleton.fetchAllUserRooms(currentUser!);

            // check if error occurred during fetchAllUserRooms
            if (fetchUserRoomsErr !== '') {
                return callback(fetchUserRoomsErr);
            }

            // emit fetchUserRooms socketIO event with allUserRooms found
            socket.emit('fetchUserRooms', allUserRooms);
        });

        // HANDLE INCOMING JOIN_ROOM SOCKET_IO REQUEST
        socket.on('joinRoom', async ({roomName}, callback) => {
            // verify user token helper
            const {currentUser, err} = await usersServiceSingleton.verifyUserTokenFetchUser(socket.data.token);

            // check if verifyUserToken returned an error
            if (err !== '') {
                return callback(err);
            }

            // update rooms state
            const {err: joinRoomErr} = await roomsServiceSingleton.joinRoom(currentUser!, roomName);

            // if err return callback with err message
            if (joinRoomErr !== '') {
                return callback(joinRoomErr);
            }
            // if no err socket joins the room
            socket.join(roomName);

            Logger.debug(`Socket: socket.on joinRoom: The socket ${socket.id} has joined the room ${roomName}.`);

            // send roomUsersUpdate to all sockets in current room
            await sendUsersInRoomUpdate(io, roomName, callback);

            // helper method that sends greeting messages and returns callback to listener
            await sendInitialMessages(io, socket, currentUser!, roomName, callback);
        });

        // HANDLE INCOMING LEAVE_ROOM SOCKET_IO REQUEST
        socket.on('leaveRoom', async ({roomName}, callback) => {
            // verify user token helper
            const {currentUser, err} = await usersServiceSingleton.verifyUserTokenFetchUser(socket.data.token);

            // check if verifyUserToken returned an error
            if (err !== '') {
                return callback(err);
            }

            // fetch roomData for provided roomName
            const {room, err: fetchRoomErr} = await roomsServiceSingleton.fetchRoom(roomName);

            // check if proper room obj or error msg
            if (fetchRoomErr !== '') {
                return callback(err);
            }

            // update roomsState by removing the user
            const {err: leaveRoomErr} = await roomsServiceSingleton.leaveRoom(currentUser!._id, room!);

            // if err return callback with err message
            if (leaveRoomErr) {
                return callback(leaveRoomErr);
            }

            // send roomUsersUpdate to all sockets in current room
            await sendUsersInRoomUpdate(io, roomName, callback);

            // if no error user leaves socketIO group
            socket.leave(roomName);

            Logger.debug(`Socket: socket.on leaveRoom: The socket ${socket.id} has left the room ${roomName}.`);

            // send socketIO emit to all users within the room
            const userLeftMsg: Message = msgGeneratorSingleton.generateMessage(undefined, `${currentUser?.name} has left the chat.`);
            io.to(roomName).emit('message', userLeftMsg);
        });

        // HANDLE INCOMING KICK_USER_FROM_ROOM SOCKET_IO REQUEST
        socket.on('kickUserFromRoom', async ({roomName, userId}, callback) => {

            Logger.debug(`socket.ts: kickUserFromRoom triggered for room ${roomName} and userId ${userId}`);

            // verify user token helper
            const {currentUser, err: verifyTokenErr} = await usersServiceSingleton.verifyUserTokenFetchUser(socket.data.token);
            // check if verifyUserToken returned an error
            if (verifyTokenErr !== '') {
                return callback(verifyTokenErr);
            }

            // fetch room by room name
            const {room, err: fetchRoomErr} = await roomsServiceSingleton.fetchRoom(roomName);

            // if an error occurred return error string
            if (fetchRoomErr !== '') {
                return callback(fetchRoomErr);
            }

            const {err: kickUserErr} = await roomsServiceSingleton.kickUserFromRoom(room!, userId, currentUser!);
            // check if user was removed from the room
            if (kickUserErr !== '') {
                return callback(kickUserErr);
            }

            // get kicked user data
            const {err: findUserErr, user} = await usersServiceSingleton.fetchUserById(userId);
            // check if user data was found in DB
            if (findUserErr !== '') {
                return callback(findUserErr);
            }

            // remove user's socket instance from SocketIO room state
            Logger.debug(`Socket: socket.on kickUserFromRoom(): Triggered removeSocketFromRoom() (socketIO room state).`);
            const {err: removeSocketFromRoomErr} = removeSocketFromRoom(io, user!, roomName, 'kick');
            // check if socket was removed from SocketIO room successfully
            if (removeSocketFromRoomErr !== '') {
                return callback(removeSocketFromRoomErr);
            }

            // send roomUsersUpdate to all sockets in current room
            await sendUsersInRoomUpdate(io, roomName, callback);

            Logger.debug(`Socket: socket.on kickUserFromRoom(): The user ${user?.name} was kicked from the room ${roomName} successfully.`);

            // send socketIO emit to all users within the room that the user was kicked
            const userWasKickedMsg: Message = msgGeneratorSingleton.generateMessage(undefined, `${user?.name} was kicked from the room.`);
            io.to(roomName).emit('message', userWasKickedMsg);
        });

        // HANDLE INCOMING BAN USER FROM ROOM SOCKET_IO REQUEST
        socket.on('banUserFromRoom', async ({roomName, userId}, callback) => {
            Logger.debug(`socket.ts: banUserFromRoom triggered for room ${roomName} and userId ${userId}`);

            // verify user token helper
            const {currentUser, err: verifyTokenErr} = await usersServiceSingleton.verifyUserTokenFetchUser(socket.data.token);
            // check if verifyUserToken returned an error
            if (verifyTokenErr !== '') {
                return callback(verifyTokenErr);
            }

            // fetch room by room name
            const {room, err: fetchRoomErr} = await roomsServiceSingleton.fetchRoom(roomName);

            // if an error occurred return error string
            if (fetchRoomErr !== '') {
                return callback(fetchRoomErr);
            }

            const {err: banUserFromRoom} = await roomsServiceSingleton.banUserFromRoom(room!, userId, currentUser!);
            // check if user was banned from the room successfully
            if (banUserFromRoom !== '') {
                return callback(banUserFromRoom);
            }

            // get banned user data, needed for socketId of banned user
            const {err: findUserErr, user} = await usersServiceSingleton.fetchUserById(userId);
            // check if user data was found in DB
            if (findUserErr !== '') {
                return callback(findUserErr);
            }

            // remove user's socket instance from SocketIO room state
            Logger.debug(`Socket: socket.on banUserFromRoom(): Triggered removeSocketFromRoom() (socketIO room state).`);
            const {err: removeSocketFromRoomErr} = removeSocketFromRoom(io, user!, roomName, 'ban');
            // check if socket was removed from SocketIO room successfully
            if (removeSocketFromRoomErr !== '') {
                return callback(removeSocketFromRoomErr);
            }

            // send roomUsersUpdate to all sockets in current room
            await sendUsersInRoomUpdate(io, roomName, callback);

            Logger.debug(`Socket: socket.on banUserFromRoom(): The user ${user?.name} was banned from the room ${roomName} successfully.`);

            // send socketIO emit to all users within the room that the user was kicked
            const userWasBannedMsg: Message = msgGeneratorSingleton.generateMessage(undefined, `${user?.name} was banned from the room.`);
            io.to(roomName).emit('message', userWasBannedMsg);
        });

        // HANDLE INCOMING FETCH_ROOM SOCKET_IO REQUEST
        socket.on('fetchRoom', async ({roomName}, callback) => {
            Logger.debug(`socket.ts: socket.on fetchRoom triggered for room ${roomName}`);
            // verify user token helper
            const {err} = await usersServiceSingleton.verifyUserTokenFetchUser(socket.data.token);

            // check if verifyUserToken returned an error
            if (err !== '') {
                return callback(err);
            }
            // fetch room by room name
            const {room, err: fetchRoomErr} = await roomsServiceSingleton.fetchRoom(roomName);

            // if an error occurred return error string
            if (fetchRoomErr !== '') {
                return callback(fetchRoomErr);
            }
            // if room was found emit fetchRoom event with roomData
            socket.emit('fetchRoom', room);
        });

        // HANDLE INCOMING FETCH_ALL_ROOMS SOCKET_IO REQUEST
        socket.on('fetchAllRooms', async (callback) => {
            // verify user token helper
            const {err: verifyTokenErr} = await usersServiceSingleton.verifyUserTokenFetchUser(socket.data.token);

            // check if verifyUserToken returned an error
            if (verifyTokenErr !== '') {
                return callback(verifyTokenErr);
            }
            // fetch all created rooms
            const {allRooms, err: fetchAllRoomsError} = await roomsServiceSingleton.fetchAllRooms();
            // if an error occurred return error string
            if (fetchAllRoomsError !== '') {
                return callback(fetchAllRoomsError);
            }
            // emit fetchAllRooms SocketIO request by sending all created rooms
            socket.emit('fetchAllRooms', allRooms);
        });

        // HANDLE INCOMING FETCH_USER_ROOMS SOCKET_IO REQUEST
        socket.on('fetchUserRooms', async (callback) => {
            // verify user token helper
            const {currentUser, err: verifyTokenErr} = await usersServiceSingleton.verifyUserTokenFetchUser(socket.data.token);

            // check if verifyUserToken returned an error
            if (verifyTokenErr !== '') {
                return callback(verifyTokenErr);
            }
            // fetch all rooms created by specific user
            const {allUserRooms, err: fetchUserRoomsErr} = await roomsServiceSingleton.fetchAllUserRooms(currentUser!);

            if (fetchUserRoomsErr !== '') {
                return callback(fetchUserRoomsErr);
            }
            // emit fetchUserRooms socketIO event with allUserRooms found
            socket.emit('fetchUserRooms', allUserRooms);
        });

        // HANDLE SEND_MESSAGE SOCKET_IO REQUEST
        socket.on('sendMessage', async ({roomName, message}, callback) => {
            let customException: CustomException;
            // check if proper message was sent
            if (!message || message.trim() === '') {
                customException = ExceptionFactory.createException(customExceptionType.INVALID_MESSAGE_SENT);
                return callback(customException.printError());
            }

            // catch profane language in message
            const badWordsFilter = new Filter();

            if (badWordsFilter.isProfane(message)) {
                Logger.debug(`Socket.ts: socket.on sendMessage: Profane language check triggered in room ${roomName}.`);
                customException = ExceptionFactory.createException(customExceptionType.PROFANE_LANGUAGE_NOT_ALLOWED);
                const badWordsErr = customException.printError();
                return callback(badWordsErr);
            }

            const {err, room, currentUser} = await initialUserRoomChecksAndDataRetrieval(socket.data.token, roomName);
            // check if initial checks passed and we got the required userData and roomData
            if (err !== '') {
                return callback(err);
            }

            // generate proper Message obj
            const chatMessage: Message = msgGeneratorSingleton.generateMessage(currentUser!, message);
            // update room chat history
            const {err: saveChatError, savedChatMessage} = await roomsServiceSingleton.saveChatHistory(room!, chatMessage);
            // check if err
            if (saveChatError !== '') {
                return callback(saveChatError);
            }

            // emit socketIO only to sockets that are in the room
            io.to(room!.name).emit('message', savedChatMessage);

            Logger.info(`Socket.ts: sendMessage() triggered for message ${savedChatMessage?.text}`);

            callback('Info: Message sent successfully!');
        });

        // HANDLE EDIT MESSAGE SOCKET_IO EVENT
        socket.on('editMessage', async ({roomName, editedMessage}: { roomName: string; editedMessage: Message }, callback) => {
            Logger.debug(`socket.ts: editMessage: Triggered for roomName ${roomName} and editedMessage ${editedMessage.text}`);
            let customException: CustomException;
            // check if proper message was sent
            if (!editedMessage || editedMessage.text.trim() === '' || !editedMessage._id) {
                customException = ExceptionFactory.createException(customExceptionType.INVALID_MESSAGE_SENT);
                return callback(customException.printError());
            }

            // use helper method for initial room/user related checks and to retrieve currentUser data as well as room data
            const {err, room} = await initialUserRoomChecksAndDataRetrieval(socket.data.token, roomName);
            // check if initial checks passed and we got the required userData and roomData
            if (err !== '') {
                return callback(err);
            }

            // check if user is author of the message that he is editing
            const {checkIfMessageBelongsToUserErr} = usersServiceSingleton.checkIfMessageBelongsToUser(editedMessage, socket.data.userId);
            // return err if message doesn't belong to user
            if (checkIfMessageBelongsToUserErr !== '') {
                return callback(checkIfMessageBelongsToUserErr);
            }

            // edit user message
            const {err: editUserMessageErr, updatedRoom} = await usersServiceSingleton.editUserMessage(editedMessage, room!);
            // check if message was edited and room was updated successfully
            if (editUserMessageErr !== '') {
                return callback(editUserMessageErr);
            }

            // emit socketIO event roomChatHistoryEdited only to sockets that are in the room while passing the updatedRoom data
            io.to(room!.name).emit('roomDataUpdate', updatedRoom);
            Logger.debug(`socket.ts: editMessage: emitted roomDataUpdate with updatedRoomData`);
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
const initialUserRoomChecksAndDataRetrieval = async (token: string, roomName: string): Promise<{ err: string, room: RoomPopulatedUsers | undefined, currentUser: User | undefined }> => {

    const {currentUser, err} = await UsersService.getInstance().verifyUserTokenFetchUser(token);

    // check if verifyUserToken returned an error
    if (err !== '') {
        return {err, room: undefined, currentUser: undefined};
    }
    // check if room exists
    const {room, err: fetchRoomErr} = await RoomsService.getInstance().fetchRoom(roomName);

    // return fetchRoom err
    if (fetchRoomErr !== '') {
        return {err: fetchRoomErr, room: undefined, currentUser: undefined};
    }

    // check if user in actual room where he is sending a message
    const {isUserInRoomErr} = UsersService.getInstance().checkIfUserInRoom(currentUser!, room!);
    // check if isUserInRoomErr exists
    if (isUserInRoomErr !== '') {
        return {err: isUserInRoomErr, room: undefined, currentUser: undefined};
    }

    return {err: '', room, currentUser};
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
    let err = '';
    // get msgGeneratorSingleton instance
    const msgGeneratorSingleton = MessageGeneratorService.getInstance();
    // if we got here user exists, get socket instance by using user's socketID and call leave room on that instance
    if (user!.socketId) {
        // get client's socket instance by using the user's socketId
        const client = io.sockets.sockets.get(user!.socketId);

        // remove client's socket from the room
        client!.leave(roomName);

        // generate kickedFromRoomMsg and notify the client socket that it was kicked from the room
        const removedFromRoomMsg = msgGeneratorSingleton.generateMessage(undefined, `You were ${kickOrBan === 'kick'? 'kicked' : 'banned'} from the room by the admin.`);
        client!.emit(kickOrBan==='kick'? 'kickedFromRoom' : 'bannedFromRoom', removedFromRoomMsg);

        Logger.debug(`Socket: removeSocketFromRoom():  Updated socketIO room state by removing socketInstance ${user!.socketId} from room.`);
    } else {
        // if there was no socketId for the given user return an err
        Logger.error(`Socket: removeSocketFromRoom(): Problem removing user from SocketIO room with socketID ${user!.socketId} roomName= ${roomName}`);
        const customException = ExceptionFactory.createException(customExceptionType.PROBLEM_REMOVING_SOCKET_FROM_SOCKET_IO_ROOM);
        err = customException.printError();
        return {err};
    }
    return {err};
}


const sendUsersInRoomUpdate = async (io: Server, roomName: string, callback: any) => {
    // get latest room data
    const {room, err: fetchRoomErr} = await RoomsService.getInstance().fetchRoom(roomName);
    // check for errors
    if (fetchRoomErr !== '') {
        return callback(fetchRoomErr);
    }
    Logger.debug(`Socket.ts: sendUsersInRoomUpdate: Sent update with room data for room ${roomName}`);
    // send socketIO roomDataUpdate emit to all users within the room
    io.to(roomName).emit('roomDataUpdate', room);
}

const sendRoomsListUpdate = async (io: Server, callback: any) => {
    // fetch all rooms
    const {allRooms, err} = await RoomsService.getInstance().fetchAllRooms();
    // check for errors
    if (err !== '') {
        return callback(err);
    }
    Logger.debug('Socket.ts: sendRoomsListUpdate: Sent rooms list update');
    // send socketIO roomsListUpdate emit to all users
    io.emit('roomsListUpdate', allRooms);
}

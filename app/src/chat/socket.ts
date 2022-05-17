import {Server, Socket} from 'socket.io';
import * as http from "http";
import Logger from "../logger/logger";

import {ServiceFactory} from "../services/service-factory";
import {ServiceTypes} from "../services/service-types";
import {Message} from "../interfaces/message";
import {UserTokenPayload} from "../interfaces/userTokenPayload";

import {abstractExceptionHandler} from './exceptions/abstract-exception-handler'
import {AbstractException} from "./exceptions/abstract-exception";
import {UnauthorizedActionException} from "./exceptions/user-related-exceptions/unauthorized-action-exception";
import {InvalidMessageQueryDataException} from "./exceptions/message-related-exceptions/invalid-message-query-data-exception";
import {SocketHelper} from "./socket-helper";
import {UsersService} from "../services/chat-services/users-service";
import {RoomsService} from "../services/chat-services/rooms-service";
import {MessageGeneratorService} from "../services/chat-services/message-generator-service";
import {AuthService} from "../services/auth-services/auth-service";
import {RoomUsersManagerService} from "../services/chat-services/room-users-manager-service";
import {ProfaneWordsFilter} from "./profane-words-filter";
import {Room as RoomModel} from "../interfaces/room";

export const socket = (server: http.Server) => {
    const io = new Server(server, {
        cors: {
            origin: [process.env.NG_APP_URL]
        }
    });

    // get services and helper class instances
    const authService: AuthService = ServiceFactory.createService(ServiceTypes.AUTH_SERVICE);
    const usersService: UsersService = ServiceFactory.createService(ServiceTypes.USERS_SERVICE);
    const roomsService: RoomsService = ServiceFactory.createService(ServiceTypes.ROOMS_SERVICE);
    const roomUsersManagerService: RoomUsersManagerService = ServiceFactory.createService(ServiceTypes.ROOM_USERS_MANAGER_SERVICE);
    const messageGeneratorService: MessageGeneratorService = ServiceFactory.createService(ServiceTypes.MESSAGE_GENERATOR_SERVICE);
    const socketHelper = new SocketHelper();
    const profaneWordsFilter = new ProfaneWordsFilter();

    // setup socketIO auth middleware, THIS ONLY RUNS ONCE ON SOCKET_IO CONNECTION ESTABLISHMENT!!!!
    io.use((async (socket: Socket, next) => {
        // check if socket auth payload is present
        if (socket.handshake.headers.cookie) {

            let userTokenPayload: UserTokenPayload;
            // get token value from cookie, token is stored as access_token=token-value string
            const token = socket.handshake.headers.cookie.split('=')[1];

            try {
                userTokenPayload = await authService.verifyJWT(token);
            } catch (e) {
                if (e instanceof AbstractException) {
                    Logger.error(`socket: io.use middleware: Error caught = ${e.message}`);
                    return next(e);
                }
                Logger.error(`socket: io.use middleware: Non AbstractException Error type caught = ${e.message}`);
            }

            await usersService.saveUsersSocketID(userTokenPayload!._id, socket.id);

            // if no err set userId and token as session variables on data property
            socket.data.userId = userTokenPayload!._id;
            socket.data.token = token;

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
                // verify user token
                const tokenPayload: UserTokenPayload = await authService.verifyJWT(socket.data.token);

                // fetch user by id
                const {user: currentUser} = await usersService.fetchUserById(tokenPayload._id);

                // response is error if there was a problem and roomName if not
                const {roomName} = await roomsService.createRoom(currentUser, newRoom);

                // send roomUsersUpdate to all sockets in current room
                await socketHelper.sendUsersInRoomUpdate(io, roomName);

                // send roomsListUpdate to all sockets
                await socketHelper.sendRoomsListUpdate(io);

                // if no err current user joins chat group, response is the room name
                socket.join(roomName);

                Logger.debug(`Socket: socket.on createRoom: The socket ${socket.id} has joined the room ${roomName}.`);

                // helper method that sends greeting messages and returns callback to listener
                await socketHelper.sendInitialMessages(io, socket, currentUser, roomName, callback);

            } catch (e) {
                // handle any propagated error
                abstractExceptionHandler(e, callback);
            }
        });

        // HANDLE INCOMING EDIT ROOM SOCKET_IO REQUEST
        socket.on('editRoom', async ({room}, callback) => {
            try {
                // verify user token
                const tokenPayload: UserTokenPayload = await authService.verifyJWT(socket.data.token);

                // fetch user by id
                const {user: currentUser} = await usersService.fetchUserById(tokenPayload._id);

                // fetch room by id
                const {room: foundRoom} = await roomsService.fetchRoomById(room._id);

                // check if current user has ownership of the room
                await usersService.checkUserRoomOwnership(currentUser._id, foundRoom);

                // check if the newly provided roomName is already in use
                await roomsService.checkIfRoomNameExists(room.name, foundRoom._id);

                // if all is well edit room
                await roomsService.editRoom(room, foundRoom);

                // send roomsListUpdate to all sockets
                await socketHelper.sendRoomsListUpdate(io);

                // send updated rooms list created by user
                const {allUserRooms} = await roomsService.fetchAllUserRooms(currentUser);

                // emit fetchUserRooms socketIO event with allUserRooms found to specific socket
                socket.emit('fetchUserRooms', allUserRooms);

            } catch (e) {
                abstractExceptionHandler(e, callback);
            }
        });

        // HANDLE INCOMING DELETE_ROOM SOCKET_IO REQUESTS
        socket.on('deleteRoom', async ({roomId}, callback) => {
            try {
                // verify user token
                const tokenPayload: UserTokenPayload = await authService.verifyJWT(socket.data.token);

                const {user: currentUser} = await usersService.fetchUserById(tokenPayload._id);

                const {room: foundRoom} = await roomsService.fetchRoomById(roomId);

                // check if current user has ownership of the room
                await usersService.checkUserRoomOwnership(currentUser._id, foundRoom);

                await roomsService.deleteRoom(foundRoom._id);

                // delete room from socketIO itself by removing all the sockets from it
                socketHelper.removeAllSocketsFromRoom(io, foundRoom.name);

                // send roomsListUpdate to all sockets
                await socketHelper.sendRoomsListUpdate(io);

                // send updated rooms list created by user
                const {allUserRooms} = await roomsService.fetchAllUserRooms(currentUser);

                // emit fetchUserRooms socketIO event with allUserRooms found
                socket.emit('fetchUserRooms', allUserRooms);

            } catch (e) {
                abstractExceptionHandler(e, callback);
            }
        });

        // HANDLE INCOMING JOIN_ROOM SOCKET_IO REQUEST
        socket.on('joinRoom', async ({roomName}, callback) => {
            try {
                // verify user token
                const tokenPayload: UserTokenPayload = await authService.verifyJWT(socket.data.token);

                // fetch user by id
                const {user: currentUser} = await usersService.fetchUserById(tokenPayload._id);

                // update rooms state
                await roomUsersManagerService.joinRoom(currentUser, roomName);

                // if no err socket joins the room
                socket.join(roomName);

                Logger.debug(`Socket: socket.on joinRoom: The socket ${socket.id} has joined the room ${roomName}.`);

                // send roomUsersUpdate to all sockets in current room
                await socketHelper.sendUsersInRoomUpdate(io, roomName);

                // helper method that sends greeting messages and returns callback to listener
                await socketHelper.sendInitialMessages(io, socket, currentUser, roomName, callback);

            } catch (e) {
                abstractExceptionHandler(e, callback);
            }
        });

        // HANDLE INCOMING LEAVE_ROOM SOCKET_IO REQUEST
        socket.on('leaveRoom', async ({roomName}, callback) => {
            try {
                // verify user token
                const tokenPayload: UserTokenPayload = await authService.verifyJWT(socket.data.token);

                // fetch user by id
                const {user: currentUser} = await usersService.fetchUserById(tokenPayload._id);

                // fetch roomData for provided roomName
                const {room} = await roomsService.fetchRoomPopulateUsers(roomName);

                // update roomsState by removing the user
                await roomUsersManagerService.leaveRoom(currentUser._id, room);

                // send roomUsersUpdate to all sockets in current room
                await socketHelper.sendUsersInRoomUpdate(io, roomName);

                // if no error user leaves socketIO group
                socket.leave(roomName);

                Logger.debug(`Socket: socket.on leaveRoom: The socket ${socket.id} has left the room ${roomName}.`);

                // generate Server message that user has left the room
                const userLeftMsg: Message = messageGeneratorService.generateMessage(undefined, `${currentUser?.name} has left the chat.`);
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

                // verify user token
                const tokenPayload: UserTokenPayload = await authService.verifyJWT(socket.data.token);

                // fetch user by id
                const {user: currentUser} = await usersService.fetchUserById(tokenPayload._id);

                // fetch room by room name
                const {room} = await roomsService.fetchRoomPopulateUsers(roomName);

                await roomUsersManagerService.kickUserFromRoom(room, userId, currentUser);

                // get kicked user data
                const {user} = await usersService.fetchUserById(userId);

                // remove user's socket instance from SocketIO room state
                socketHelper.removeSocketFromRoom(io, user, roomName, 'kick');

                // send roomUsersUpdate to all sockets in current room
                await socketHelper.sendUsersInRoomUpdate(io, roomName);

                Logger.debug(`Socket: socket.on kickUserFromRoom(): The user ${user.name} was kicked from the room ${roomName} successfully.`);

                // send socketIO emit to all users within the room that the user was kicked
                const userWasKickedMsg: Message = messageGeneratorService.generateMessage(undefined, `${user.name} was kicked from the room.`);
                io.to(roomName).emit('message', userWasKickedMsg);

            } catch (e) {
                abstractExceptionHandler(e, callback);
            }
        });

        // HANDLE INCOMING BAN USER FROM ROOM SOCKET_IO REQUEST
        socket.on('banUserFromRoom', async ({roomName, userId}, callback) => {
            try {
                Logger.debug(`socket.ts: banUserFromRoom triggered for room ${roomName} and userId ${userId}`);

                // verify user token
                const tokenPayload: UserTokenPayload = await authService.verifyJWT(socket.data.token);

                // fetch user by id
                const {user: currentUser} = await usersService.fetchUserById(tokenPayload._id);

                // fetch room by room name
                const {room} = await roomsService.fetchRoomPopulateUsers(roomName);

                await roomUsersManagerService.banUserFromRoom(room, userId, currentUser);

                // get banned user data, needed for socketId of banned user
                const {user} = await usersService.fetchUserById(userId);

                // remove user's socket instance from SocketIO room state
                socketHelper.removeSocketFromRoom(io, user, roomName, 'ban');

                // send roomUsersUpdate to all sockets in current room
                await socketHelper.sendUsersInRoomUpdate(io, roomName);

                Logger.debug(`Socket: socket.on banUserFromRoom(): The user ${user.name} was banned from the room ${roomName} successfully.`);

                // send socketIO emit message as Server to all users within the room that the user was banned
                const userWasBannedMsg: Message = messageGeneratorService.generateMessage(undefined, `${user.name} was banned from the room.`);
                io.to(roomName).emit('message', userWasBannedMsg);

            } catch (e) {
                abstractExceptionHandler(e, callback);
            }
        });

        // HANDLE INCOMING FETCH_ROOM SOCKET_IO REQUEST
        socket.on('fetchRoom', async ({roomName}, callback) => {
            try {
                // verify user token
                await authService.verifyJWT(socket.data.token);

                // fetch room by room name
                const {room} = await roomsService.fetchRoomPopulateUsers(roomName);

                // if room was found emit fetchRoom event with roomData
                socket.emit('fetchRoom', room);

            } catch (e) {
                abstractExceptionHandler(e, callback);
            }
        });

        // HANDLE INCOMING FETCH_ALL_ROOMS SOCKET_IO REQUEST
        socket.on('fetchAllRooms', async (callback) => {
            try {
                // verify user token
                await authService.verifyJWT(socket.data.token);

                // fetch all created rooms
                const {allRooms} = await roomsService.fetchAllRooms();

                // emit fetchAllRooms SocketIO request by sending all created rooms
                socket.emit('fetchAllRooms', allRooms);

            } catch (e) {
                abstractExceptionHandler(e, callback);
            }
        });

        // HANDLE INCOMING FETCH_USER_ROOMS SOCKET_IO REQUEST
        socket.on('fetchUserRooms', async (callback) => {
            try {
                // verify user token
                const tokenPayload: UserTokenPayload = await authService.verifyJWT(socket.data.token);

                // fetch user by id
                const {user: currentUser} = await usersService.fetchUserById(tokenPayload._id);

                // fetch all rooms created by specific user
                const {allUserRooms} = await roomsService.fetchAllUserRooms(currentUser);

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

                // check if message contains profane words
                profaneWordsFilter.filterString(message, roomName);

                const {room, currentUser} = await socketHelper.initialUserRoomChecksAndDataRetrieval(socket.data.token, roomName);

                // generate proper Message obj
                const chatMessage: Message = messageGeneratorService.generateMessage(currentUser, message);
                // update room chat history
                const {savedChatMessage} = await roomsService.saveChatHistory(room, chatMessage);

                // emit socketIO only to sockets that are in the room
                io.to(room.name).emit('message', savedChatMessage);

                Logger.debug(`Socket.ts: sendMessage() triggered for message ${savedChatMessage?.text}`);

                callback('Info: Message sent successfully!');
            } catch (e) {
                abstractExceptionHandler(e, callback);
            }
        });

        // HANDLE EDIT MESSAGE SOCKET_IO EVENT
        socket.on('editMessage', async ({roomName, editedMessage}: { roomName: string; editedMessage: Message }, callback) => {
            try {
                // check if proper message format was sent
                if (!editedMessage || editedMessage.text.trim() === '' || !editedMessage._id) {
                    throw new InvalidMessageQueryDataException();
                }

                // check if message contains profane words
                profaneWordsFilter.filterString(editedMessage.text, roomName);

                // use helper method for initial room/user related checks and to retrieve currentUser data as well as room data
                const {room} = await socketHelper.initialUserRoomChecksAndDataRetrieval(socket.data.token, roomName);

                // check if user is author of the message that he is editing
                usersService.checkIfMessageBelongsToUser(editedMessage, socket.data.userId);

                // edit user message
                const {updatedRoom} = await usersService.editUserMessage(editedMessage, room);

                // emit socketIO event roomChatHistoryEdited only to sockets that are in the room while passing the updatedRoom data
                io.to(room.name).emit('roomDataUpdate', updatedRoom);

                Logger.debug(`socket.ts: editMessage: emitted roomDataUpdate with updatedRoomData`);

            } catch (e) {
                abstractExceptionHandler(e, callback);
            }
        });

        // CATCH SOCKET_IO DISCONNECT EVENT
        socket.on('disconnect', async (reason: string) => {
            // remove user's socketId from DB before disconnect
            await usersService.removeUsersSocketID(socket.data.userId, socket.id);

            Logger.warn(`Socket: socket.on disconnect: SocketIO connection closed for socket ${socket.id}. Reason: ${reason}.`);
        });
    });
}
import {Server} from 'socket.io';
import * as http from "http";

import {RoomsService} from './rooms-service';
import {MessageGeneratorService} from "./message-generator-service";
import {UsersService} from "./users-service";
import {Message} from "../interfaces/message";
import {User} from "../interfaces/user";
import {ExceptionFactory} from "./exceptions/exception-factory";
import {customExceptionType} from "./exceptions/custom-exception-type";
import {CustomException} from "./exceptions/custom-exception";

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

    // listen to new connection and get socket instance of the connected party
    io.on('connection', socket => {
        console.log('\nNew Websocket connection.');

        // HANDLE INCOMING CREATE ROOM SOCKET_IO REQUEST
        socket.on('createRoom', async ({token, newRoom}, callback) => {
            // verify user token helper
            const {currentUser, err} = await usersServiceSingleton.verifyUserToken(token);

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

            console.log(`Create Room: The socket ${socket.id} has joined the room ${roomName}`);

            // if no err current user joins chat group, response is the room name
            socket.join(roomName!);

            // helper method that sends greeting messages and returns callback to listener
            await sendInitialMessages(io, socket, currentUser!, roomName!, callback);
        });

        // HANDLE INCOMING JOIN_ROOM SOCKET_IO REQUEST
        socket.on('joinRoom', async ({token, roomName}, callback) => {
            // verify user token helper
            const {currentUser, err} = await usersServiceSingleton.verifyUserToken(token);

            // check if verifyUserToken returned an error
            if (err !== '') {
                return callback(err);
            }

            // update rooms state
            const joinRoomErr = await roomsServiceSingleton.joinRoom(currentUser!, roomName);

            // if err return callback with err message
            if (joinRoomErr) {
                callback(joinRoomErr);
            }
            // if no err socket joins the room
            socket.join(roomName);

            // send roomUsersUpdate to all sockets in current room
            await sendUsersInRoomUpdate(io, roomName, callback);

            // helper method that sends greeting messages and returns callback to listener
            await sendInitialMessages(io, socket, currentUser!, roomName, callback);
        });

        // HANDLE INCOMING LEAVE_ROOM SOCKET_IO REQUEST
        socket.on('leaveRoom', async ({token, roomName}, callback) => {
            // verify user token helper
            const {currentUser, err} = await usersServiceSingleton.verifyUserToken(token);

            // check if verifyUserToken returned an error
            if (err !== '') {
                return callback(err);
            }

            // update roomsState by removing the user
            const leaveRoomErr = await roomsServiceSingleton.leaveRoom(currentUser!, roomName);

            // if err return callback with err message
            if (leaveRoomErr) {
                return callback(leaveRoomErr);
            }

            console.log('LeaveRoom: roomName = ');
            console.log(roomName);

            // send roomUsersUpdate to all sockets in current room
            await sendUsersInRoomUpdate(io, roomName, callback);

            // if no error user leaves socketIO group
            socket.leave(roomName);

            // send socketIO emit to all users within the room
            const userLeftMsg: Message = msgGeneratorSingleton.generateMessage(undefined, `${currentUser!.name} has left the chat.`);
            console.log('Leave Room: Send user left room msg to all users in room.');
            io.to(roomName).emit('message', userLeftMsg);
        });

        // HANDLE INCOMING FETCH_ROOM SOCKET_IO REQUEST
        socket.on('fetchRoom', async ({token, roomName}, callback) => {
            // verify user token helper
            const {err} = await usersServiceSingleton.verifyUserToken(token);

            // check if verifyUserToken returned an error
            if (err !== '') {
                return callback(err);
            }
            // fetch room by room name
            const {room, fetchRoomErr} = await roomsServiceSingleton.fetchRoom(roomName);

            // if an error occurred return error string
            if (fetchRoomErr !== '') {
                return callback(fetchRoomErr);
            }
            // if room was found emit fetchRoom event with roomData
            socket.emit('fetchRoom', room);
        });

        // HANDLE INCOMING FETCH_ALL_ROOMS SOCKET_IO REQUEST
        socket.on('fetchAllRooms', async ({token}, callback) => {
            // verify user token helper
            const {err: verifyTokenErr} = await usersServiceSingleton.verifyUserToken(token);

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
            console.log('FetchAllRooms');
            console.log(allRooms);

            socket.emit('fetchAllRooms', allRooms);
        });

        // HANDLE SEND_MESSAGE SOCKET_IO REQUEST
        socket.on('sendMessage', async ({token, roomName, message}, callback) => {
            // check if proper message was sent
            if (!message || message === '') {
                const customException: CustomException = ExceptionFactory.createException(customExceptionType.noSuchRoomExists);
                return callback(customException.printError());
            }

            // verify user token helper
            const {currentUser, err} = await usersServiceSingleton.verifyUserToken(token);

            // check if verifyUserToken returned an error
            if (err !== '') {
                return callback(err);
            }
            // check if room exists
            const {room, fetchRoomErr} = await roomsServiceSingleton.fetchRoom(roomName);

            // return fetchRoom err
            if (fetchRoomErr !== '') {
                return callback(fetchRoomErr);
            }

            // check if user in actual room where he is sending a message
            const {isUserInRoomErr} = usersServiceSingleton.checkIfUserInRoom(currentUser!, room!);
            // check if isUserInRoomErr exists
            if (isUserInRoomErr !== '') {
                return callback(isUserInRoomErr);
            }

            // generate proper Message obj
            const chatMessage: Message = msgGeneratorSingleton.generateMessage(currentUser!, message);
            // update room chat history
            const {saveChatError} = await roomsServiceSingleton.saveChatHistory(room!, chatMessage);
            // check if err
            if (saveChatError !== '') {
                return callback(saveChatError);
            }

            // emit socketIO only to sockets that are in the room
            io.to(room!.name).emit('message', chatMessage);
            callback('Info: Message sent successfully!');
        });
    });
}

const sendInitialMessages = async (io: Server, socket: any, currentUser: User, roomName: string, callback: any) => {
    // get msgGeneratorSingleton instance
    const msgGeneratorSingleton = MessageGeneratorService.getInstance();

    console.log('Create Room: Send greetings from app msg to current socket.');
    const welcomeMsg: Message = msgGeneratorSingleton.generateMessage(undefined, 'Welcome to the Chat app! Please follow our guidelines.');

    // socket.emit('message', welcomeMsg);
    console.log('SendInitialMessage: socket.id = ');
    console.log(socket.id);
    io.to(socket.id).emit('message', welcomeMsg);

    // send socketIO emit to all users within the room
    const newUserInRoomMsg: Message = msgGeneratorSingleton.generateMessage(undefined, `${currentUser.name} has joined the chat.`);
    console.log('Create Room: Send new user in room msg to all users in room.');
    socket.broadcast.to(roomName).emit('message', newUserInRoomMsg);

    // return callback with roomName
    callback(roomName);
}

const sendUsersInRoomUpdate = async (io: Server, roomName: string, callback: any) => {
    // get latest room data
    const {room, fetchRoomErr} = await RoomsService.getInstance().fetchRoom(roomName);
    // check for errors
    if (fetchRoomErr !== '') {
        return callback(fetchRoomErr);
    }
    // send socketIO roomUsersUpdate emit to all users within the room
    io.to(roomName).emit('roomUsersUpdate', room);
}

const sendRoomsListUpdate = async (io: Server, callback: any) => {
    // fetch all rooms
    const {allRooms, err} = await RoomsService.getInstance().fetchAllRooms();

    // check for errors
    if (err !== '') {
        return callback(err);
    }
    // send socketIO roomsListUpdate emit to all users
    io.emit('roomsListUpdate', allRooms);
}

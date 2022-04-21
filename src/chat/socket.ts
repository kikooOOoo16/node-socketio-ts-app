import {Server} from 'socket.io';
import * as http from "http";

import {RoomsService} from './rooms-service';
import {MessageGeneratorService} from "./message-generator-service";
import {UsersService} from "./users-service";
import {Room} from "../interfaces/room";
import {Message} from "../interfaces/message";
import {UnauthorizedAction} from "./exceptions/users-service-unauthorized-action";
import {User} from "../interfaces/user";
import * as jwt from "jsonwebtoken";
import {UserTokenPayload} from "../interfaces/userTokenPayload";
import {User as UserModel} from "../db/models/user";

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
            // check user auth with token in request
            const decodedToken = (jwt.verify(token, process.env.JWT_SECRET)) as UserTokenPayload;
            // find user by using the _id from the token
            const currentUser = await UserModel.findOne({_id: decodedToken._id, 'tokens.token': token});
            // check if currentUser was found
            if (!currentUser) {
                return callback(new UnauthorizedAction().printError());
            }

            // response is error if there was a problem and roomName if not
            const response = roomsServiceSingleton.createRoom(currentUser, newRoom);

            // check if response is an error, if not current socket joins the newly created room
            if (response.split(' ')[0] === 'Error:') {
                return callback(response);
            }

            console.log(`Create Room: The socket ${socket.id} has joined the room ${response}`);

            // if no err current user joins chat group, response is the room name
            socket.join(response);

            // helper method that sends greeting messages and returns callback to listener
            sendInitialMessages(currentUser, socket, response, callback);
        });

        // HANDLE INCOMING JOIN_ROOM SOCKET_IO REQUEST
        socket.on('joinRoom', async({token, roomName}, callback) => {
            // check user auth with token in request
            const decodedToken = (jwt.verify(token, process.env.JWT_SECRET)) as UserTokenPayload;
            // find user by using the _id from the token
            const currentUser = await UserModel.findOne({_id: decodedToken._id, 'tokens.token': token});

            // check if currentUser was found
            if (!currentUser) {
                return callback(new UnauthorizedAction().printError());
            }

            const err = roomsServiceSingleton.joinRoom(currentUser, roomName);

            // if err return callback with err message
            if (err) {
                callback(err);
            }
            // if no err socket joins the room
            socket.join(roomName);

            // helper method that sends greeting messages and returns callback to listener
            sendInitialMessages(currentUser, socket, roomName, callback);
        });

        // HANDLE INCOMING LEAVE_ROOM SOCKET_IO REQUEST
        socket.on('leaveRoom', async ({token, roomName}, callback) => {
            // check user auth with token in request
            const decodedToken = (jwt.verify(token, process.env.JWT_SECRET)) as UserTokenPayload;
            // find user by using the _id from the token
            const currentUser = await UserModel.findOne({_id: decodedToken._id, 'tokens.token': token});
            // check if currentUser was found
            if (!currentUser) {
                return callback(new UnauthorizedAction().printError());
            }

            const err = roomsServiceSingleton.leaveRoom(currentUser, roomName);

            // if err return callback with err message
            if (err) {
                return callback(err);
            }

            // if no error user leaves socketIO group
            socket.leave(roomName);
        });

        // HANDLE INCOMING FETCH_ROOM SOCKET_IO REQUEST
        socket.on('fetchRoom', async ({token, roomName}, callback) => {
            // check user auth with token in request
            const decodedToken = (jwt.verify(token, process.env.JWT_SECRET)) as UserTokenPayload;
            // find user by using the _id from the token
            const currentUser = await UserModel.findOne({_id: decodedToken._id, 'tokens.token': token});
            // check if currentUser was found
            if (!currentUser) {
                return callback(new UnauthorizedAction().printError());
            }

            const roomData: string | Room = roomsServiceSingleton.fetchRoom(roomName);

            // if an error occurred return error string
            if (typeof roomData === 'string') {
                return callback(roomData);
            }

            // if room was found emit fetchRoom event with roomData
            socket.emit('fetchRoom', roomData);
        });

        // HANDLE INCOMING FETCH_ALL_ROOMS SOCKET_IO REQUEST
        socket.on('fetchAllRooms', async ({token}, callback) => {
            // check user auth with token in request
            const decodedToken = (jwt.verify(token, process.env.JWT_SECRET)) as UserTokenPayload;
            // find user by using the _id from the token
            const currentUser = await UserModel.findOne({_id: decodedToken._id, 'tokens.token': token});

            // check if currentUser was found
            if (!currentUser) {
                return callback(new UnauthorizedAction().printError());
            }

            const allRooms: Room[] = roomsServiceSingleton.fetchAllRooms();
            socket.emit('fetchAllRooms', allRooms);
        });

        // HANDLE SEND_MESSAGE SOCKET_IO REQUEST
        socket.on('sendMessage', ({name, email, roomName, message}, callback) => {
            // check if room exists
            const fetchedRoom: string | Room = roomsServiceSingleton.fetchRoom(roomName);

            if (typeof fetchedRoom === 'string') {
                // return error
                return callback(fetchedRoom);
            }

            // emit socketIO only to sockets that are in the room
            io.to(fetchedRoom.name).emit('message', msgGeneratorSingleton.generateMessage(name, message));
            callback('Info: Message sent successfully!');
        });
    });
}

const sendInitialMessages = (currentUser: User, socket: any, ioCallResponseRoomName: string, callback: any) => {
    // get msgGeneratorSingleton instance
    const msgGeneratorSingleton = MessageGeneratorService.getInstance();

    console.log('Create Room: Send greetings from app msg to current socket.');
    const welcomeMsg: Message = msgGeneratorSingleton.generateMessage('Admin', 'Welcome to the Chat app! Please follow our guidelines.');
    socket.emit('message', welcomeMsg);

    // send socketIO emit to all users within the room
    const newUserInRoomMsg: Message = msgGeneratorSingleton.generateMessage('Admin', `${currentUser.name} has joined the chat!`);
    console.log('Create Room: Send new user in room msg to all users in room.');
    socket.broadcast.to(ioCallResponseRoomName).emit('message', newUserInRoomMsg);

    callback(ioCallResponseRoomName);
}

import {Server} from 'socket.io';
import * as http from "http";

import {UsersService} from './users-service';
import {MessageGeneratorService} from "./message-generator-service";
import {Room} from "../interfaces/room";
import {User} from "../interfaces/user";
import {Message} from "../interfaces/message";


export const socket = (server: http.Server) => {
    const io = new Server(server, {
        cors: {
            origin: ['http://localhost:4200']
        }
    });

    // get UsersService singleton instance
    const usersServiceSingleton = UsersService.getInstance();
    // get MessageGeneratorService singleton instance
    const msgGeneratorSingleton = MessageGeneratorService.getInstance();

    // listen to new connection and get socket instance of the connected party
    io.on('connection', socket => {
        console.log('\nNew Websocket connection.');

        // HANDLE INCOMING CREATE ROOM SOCKET_IO REQUEST
        socket.on('createRoom', ({name, email, newRoom}, callback) => {
            // temporary user obj
            const currentUser: User = {
                id: socket.id,
                name,
                email
            }

            // response is error if there was a problem and roomName if not
            const response = usersServiceSingleton.createRoom(currentUser, newRoom);

            // check if response is an error, if not current socket joins the newly created room
            if (response.split(' ')[0] === 'Error:') {
                return callback(response);
            }

            console.log(`Create Room: The socket ${socket.id} has joined the room ${response}`);

            // if no err current user joins chat group
            socket.join(response);

            // send greetings message only to socket

            // helper method that sends greeting messages and returns callback to listener
            sendInitialMessages(currentUser, socket, response, callback);
        });

        // HANDLE INCOMING JOIN_ROOM SOCKET_IO REQUEST
        socket.on('joinRoom', ({name, email, roomName}, callback) => {
            // temporary user helper obj
            const currentUser: User = {
                id: socket.id,
                name,
                email
            }

            const err = usersServiceSingleton.joinRoom(currentUser, roomName);

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
        socket.on('leaveRoom', ({name, email, roomName}, callback) => {
            const currentUser: User = {
                id: socket.id,
                name,
                email
            }

            const err = usersServiceSingleton.leaveRoom(currentUser, roomName);

            // if err return callback with err message
            if (err) {
                return callback(err);
            }

            // if no error user leaves socketIO group
            socket.leave(roomName);
        });

        // HANDLE INCOMING FETCH_ROOM SOCKET_IO REQUEST
        socket.on('fetchRoom', (roomName: string, callback) => {
            const roomData: string | Room = usersServiceSingleton.fetchRoom(roomName);

            // if an error occurred return error string
            if (typeof roomData === 'string') {
                return callback(roomData);
            }

            // if room was found emit fetchRoom event with roomData
            socket.emit('fetchRoom', roomData);
        });

        // HANDLE INCOMING FETCH_ALL_ROOMS SOCKET_IO REQUEST
        socket.on('fetchAllRooms', () => {
            const allRooms: Room[] = usersServiceSingleton.fetchAllRooms();
            socket.emit('fetchAllRooms', allRooms);
        });

        // HANDLE SEND_MESSAGE SOCKET_IO REQUEST
        socket.on('sendMessage', ({name, email, roomName, message},  callback) => {
            // check if room exists
            const fetchedRoom: string | Room = usersServiceSingleton.fetchRoom(roomName);

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
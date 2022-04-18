import {Server} from 'socket.io';
import * as http from "http";

import {UsersService} from './users-service';
import {MessageGeneratorService} from "./message-generator-service";
import {Room} from "../interfaces/room";


export const socket = (server: http.Server) => {
    const io = new Server(server, {
        cors: {
            origin: ['http://localhost:4200']
        }
    });

    // get UsersService singleton instance
    const usersServiceSingleton = UsersService.getInstance();
    // get MessageGeneratorService singleton instance
    const messageGeneratorSingleton = MessageGeneratorService.getInstance();

    // listen to new connection and get socket instance of the connected party
    io.on('connection', socket => {
        console.log('\nNew Websocket connection.');

        // handle incoming createRoom socketIO request
        socket.on('createRoom', (newRoom: Room, callback) => {
            console.log(newRoom);
            const response = usersServiceSingleton.createRoom(newRoom, socket.id);

            // check if response is an error, if not current socket joins the newly created room
            if (response.split(' ')[0] !== 'Error:') {
                console.log(`The socket ${socket.id} has joined the room ${response}`);

                socket.join(callback);

                // send greetings message only to socket
                console.log('Message sent');
                socket.emit('message', messageGeneratorSingleton.generateMessage('Admin', 'Welcome to the Chat app! Please follow our guidelines.'));
            }

            // return req acknowledgement response
            callback(response);
        });

        // handle incoming joinRoom socketIO request
        socket.on('join', ({username, roomName}, callback) => {
            const err = usersServiceSingleton.joinRoom(socket.id, username, roomName);

            if (err) {
                callback(err);
            }
        })

        // handle incoming fetchRoom socketIO request
        socket.on('fetchRoom', (roomName: string, callback) => {
            const roomData: string | Room = usersServiceSingleton.fetchRoom(roomName);

            // if an error occurred return error string
            if (typeof roomData === 'string') {
                return callback(roomData);
            }

            // if room was found emit fetchRoom event with roomData
            socket.emit('fetchRoom', roomData);
        });

        socket.on('fetchAllRooms', () => {
            const allRooms: Room[] = usersServiceSingleton.fetchAllRooms();
            socket.emit('fetchAllRooms', allRooms);
        })

    });
}
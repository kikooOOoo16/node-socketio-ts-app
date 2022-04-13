import {Server} from 'socket.io';
import * as http from "http";

import {UsersService} from './users-service';
import {MessageGeneratorService} from "./message-generator-service";
import {CustomUserServiceError} from "./exceptions/CustomUserServiceError";
import {User} from "../models/user";


export const socket = (server: http.Server) => {
    const io = new Server(server);

    // get UsersService singleton instance
    const UsersServiceSingleton = UsersService.getInstance();
    // get MessageGeneratorService singleton instance
    const MessageGeneratorSingleton = MessageGeneratorService.getInstance();

    io.on('connection', socket => {
        console.log('\nNew Websocket connection.');

        // User triggered join event
        socket.on('join', ({username, room}, acknowledgementCb) => {
            const newUser = new User(socket.id, username, room);
            const res = UsersServiceSingleton.addUser(newUser);

            if (res instanceof CustomUserServiceError) {
                return acknowledgementCb(res.printError());
            }

            // join the selected room successfully
            socket.join(res.room);

            // Give welcome message
            socket.emit('message', MessageGeneratorSingleton.generateMessage('Admin', `${res.name} welcome to the Chat app.`));

            // Send to all except this socket with broadcast.
            socket.broadcast.to(newUser.room).emit('message', MessageGeneratorSingleton.generateMessage('Admin', `${newUser.name} has joined the chat.`));

            // Inform room to update its users list
            io.to(newUser.room).emit('roomUsersUpdate', {
                room: newUser.room,
                users: UsersServiceSingleton.getUsersInRoom(newUser.room)
            });
            // acknowledgement that the user joined the room
            acknowledgementCb();
        });

        // user triggered send message event
        socket.on('sendMessage', (message, acknowledgementCb) => {
            const getUserRes = UsersServiceSingleton.getUser(socket.id);

            if (getUserRes instanceof CustomUserServiceError) {
                return acknowledgementCb(getUserRes.printError());
            }

            // emit message to users room
            io.to(getUserRes.room).emit('message', MessageGeneratorSingleton.generateMessage(getUserRes.name, message));
            // acknowledgement of the completion of the sendMessage event
            acknowledgementCb('Info: Message sent successfully!');
        })
    });
}
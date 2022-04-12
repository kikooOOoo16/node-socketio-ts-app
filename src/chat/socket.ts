import {Server} from 'socket.io';
import * as http from "http";

export const socket = (server: http.Server) => {
    const io = new Server(server);

    io.on('connection', socket => {
        console.log('\nNew Websocket connection.');
    })
}
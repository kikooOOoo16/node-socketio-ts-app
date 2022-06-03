import {Socket} from 'socket.io';
export interface CustomSocket extends Socket {
    userId? : string;
    token? : string;
}
// leave this just to know how to add custom arguments on a socket instance
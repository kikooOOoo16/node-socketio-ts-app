import {Schema} from "mongoose";

export interface User {

    _id: Schema.Types.ObjectId;
    name: string;
    email: string;
    password?: string;
    currentRoom?: string;
    tokens? : string[];
    socketId?: string;
}
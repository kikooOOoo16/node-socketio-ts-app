import {Schema} from "mongoose";
import {Message} from "./message";

export interface Room {
    _id: Schema.Types.ObjectId;
    author: Schema.Types.ObjectId;
    name: string;
    description: string;
    usersInRoom: Schema.Types.ObjectId[];
    bannedUsersFromRoom: Schema.Types.ObjectId[];
    chatHistory?: Message[];
}
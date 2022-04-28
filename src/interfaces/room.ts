import {Schema} from "mongoose";
import {Message} from "./message";

export interface Room {
    author: Schema.Types.ObjectId;
    name: string;
    description: string;
    usersInRoom?: Schema.Types.ObjectId[];
    chatHistory?: Message[];
}
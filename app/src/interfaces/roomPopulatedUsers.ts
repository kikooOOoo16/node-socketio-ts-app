import {Schema} from "mongoose";
import {Message} from "./message";
import {User} from "./user";

export interface RoomPopulatedUsers {
    author: Schema.Types.ObjectId;
    name: string;
    description: string;
    usersInRoom?: User[];
    chatHistory?: Message[];
}
import {Schema} from "mongoose";
import {Message} from "./message";
import {User} from "./user";

export interface RoomPopulatedUsers {

    _id: Schema.Types.ObjectId;
    author: Schema.Types.ObjectId;
    name: string;
    description: string;
    usersInRoom: User[];
    bannedUsersFromRoom: Schema.Types.ObjectId[];
    chatHistory?: Message[];
}
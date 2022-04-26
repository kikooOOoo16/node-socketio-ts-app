import {Schema} from "mongoose";

export interface Room {
    author: Schema.Types.ObjectId;
    name: string;
    description: string;
    usersInRoom?: Schema.Types.ObjectId[];
}
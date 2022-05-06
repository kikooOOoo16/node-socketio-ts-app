import {Schema} from "mongoose";

export interface Message {
    author: {
        id: Schema.Types.ObjectId | string,
        name: string
    };
    text: string;
    createdAtUnixTime: number;
    edited?: boolean;
}
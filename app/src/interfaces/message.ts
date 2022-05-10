import {Schema} from "mongoose";

export interface Message {
    _id: Schema.Types.ObjectId;
    author: {
        id: Schema.Types.ObjectId | string,
        name: string
    };
    text: string;
    createdAtUnixTime: number;
    edited?: boolean;
}

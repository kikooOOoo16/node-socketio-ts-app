import {Document, Schema} from 'mongoose';

export interface UserDocument extends Document {

    _id: Schema.Types.ObjectId;
    name: string;
    email: string;
    password?: string;
    currentRoom?: string;
    tokens? : string[];
    socketId?: string;
}

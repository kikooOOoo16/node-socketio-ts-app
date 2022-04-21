import { Document } from 'mongoose';

export interface UserDocument extends Document {
    _id: string;
    name: string;
    email: string;
    password?: string;
    currentRoom?: string;
    tokens? : String[];
}
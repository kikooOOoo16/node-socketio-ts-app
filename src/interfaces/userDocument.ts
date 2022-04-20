import { Document } from 'mongoose';

export interface UserDocument extends Document {
    id: string;
    name: string;
    email: string;
    password?: string;
    currentRoom?: string;
    tokens? : String[];
}
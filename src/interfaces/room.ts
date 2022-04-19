import {User} from "./user";

export interface Room {
    author: string; // string for now later replace with user id
    name: string;
    description: string;
    usersInRoom?: User[];
}
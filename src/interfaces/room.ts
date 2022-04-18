import {User} from "./user";

export interface Room {
    author: User;
    name: string;
    description: string;
    usersInRoom?: User[];
}
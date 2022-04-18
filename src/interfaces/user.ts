import {Room} from "./room";

export interface User {
    id: string;
    name: string;
    email: string;
    rooms?: Room[];
}
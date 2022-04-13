import {User} from "../models/user";
import {UserDataMissingError} from "./exceptions/users-service-missing-data";
import {UserAlreadyInRoomError} from "./exceptions/users-service-user-already-in-room";
import {UserDoesNotExistError} from "./exceptions/users-service-user-doesnot-exist";
import {CustomUserServiceError} from "./exceptions/CustomUserServiceError";

export class UsersService {
    private static instance: UsersService;
    private users: Array<User> = [];

    private constructor() {
    }

    public static getInstance(): UsersService {
        if (!UsersService.instance) {
            UsersService.instance = new UsersService();
        }
        return UsersService.instance;
    }

    public addUser = (newUser: User): CustomUserServiceError | User => {

        // check if all data is passed
        if (!newUser.name || !newUser.room)
            return new UserDataMissingError();

        // check if newUser exists within the same room
        const existingUserInRoom = this.users.find(user => {
            return user.room === newUser.room && user.name === newUser.name;
        });

        if (existingUserInRoom) {
            return new UserAlreadyInRoomError(newUser.name, newUser.room);
        }

        // Store new user if everything is ok
        this.users.push(newUser);

        return newUser;
    }

    public removeUser = (id: string) => {
        const index:number = this.users.findIndex(user => user.id === id);

        if (index !== -1) {
            return this.users.splice(index, 1)[0];
        }
    }

    public getUser = (id: string): CustomUserServiceError | User => {
        const user: User | undefined = this.users.find(user => user.id === id);
        if (!user) {
            return new UserDoesNotExistError();
        }
        return user;
    }

    public getUsersInRoom = (room: string) => {
        room = room.trim().toLowerCase();
        const usersInRoom: User[] = this.users.filter(user => user.room === room);

        // check if there are any users in the room
        if (usersInRoom.length === 0) {
            return {
                info: `The room ${room} currently has no active users!`
            }
        }
        // return found users
        return usersInRoom;
    }
}
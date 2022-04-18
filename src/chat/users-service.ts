import {User} from "../interfaces/user";
import {Room} from "../interfaces/room";
import {RoomNameTaken} from "./exceptions/users-service-room-name-taken";
import {RoomDataMissing} from "./exceptions/users-service-room-data-missing";
import {InvalidRoomQuery} from "./exceptions/users-service-invalid-room-query";
import {NoSuchRoomExists} from "./exceptions/users-service-no-such-room-exists";
import {MissingQueryData} from "./exceptions/users-service-missing-data";
import {UserAlreadyInRoom} from "./exceptions/users-service-user-already-in-room";

const validRoomObjKeyValues = ['author', 'name', 'description'];

export class UsersService {
    private static instance: UsersService;
    private users: User[] = [];
    private rooms: Room[] = [];

    private constructor() {
    }

    public static getInstance(): UsersService {
        if (!UsersService.instance) {
            UsersService.instance = new UsersService();
        }
        return UsersService.instance;
    }

    createRoom = (newRoom: Room, userId: string) : string => {
        // format new room name to avoid duplicate names
        newRoom.name = newRoom.name.trim().toLowerCase();

        // check if all data provided for newRoom
        if (newRoom.name === '' || !newRoom.author  || newRoom.description === '') {
            return new RoomDataMissing().printError();
        }

        // check if room name is already in use
        const filterRes = this.rooms.filter(room => room.name === newRoom.name);
        if (filterRes.length > 0) {
            console.log(filterRes);
            return new RoomNameTaken().printError();
        }

        // define usersInRoom property
        newRoom.usersInRoom = [];

        // add current user to room
        newRoom.usersInRoom.push({
            id: userId,
            name: 'RoomCreator',
            email: 'roomCreator@mail.com'
        });

        // If All checks pass add new room to rooms array
        this.rooms.push(newRoom);
        console.log('New room added to array.');
        return newRoom.name;
    }

    fetchRoom = (roomName: string): string | Room => {
        // check if valid roomName
        if (roomName === '') {
            return new InvalidRoomQuery().printError();
        }

        // format roomName for search
        roomName = roomName.trim().toLowerCase();
        const foundRoom: Room[] = this.rooms.filter(room => room.name === roomName);

        // check if room exists
        if (foundRoom.length !== 1) {
            return new NoSuchRoomExists().printError();
        }

        console.log(`Found room ${foundRoom[0].name}`)

        return foundRoom[0];
    }

    fetchAllRooms = (): Room[] => {
        return this.rooms;
    }

    joinRoom = (id: string, roomName: string, username: string ) => {
        username = username.trim().toLowerCase();
        roomName = roomName.trim().toLowerCase();

        // validate the data
        if (!username || !roomName) {
            return new MissingQueryData().printError();
        }

        // find room by name
        const room: Room | undefined = this.rooms.find(room => room.name === roomName);

        // handle if room doesn't exist
        if (!room) {
            return new NoSuchRoomExists().printError();
        }

        let user: User | undefined;

        // check if user already in the room
        if (room.usersInRoom && room.usersInRoom.length > 0) {
            user = room.usersInRoom.find(user => user.id === id);
            // if user found in room return error
            if (user) {
                return new UserAlreadyInRoom().printError();
            }
        }

        // if all check passed add user to room's users array
        room.usersInRoom?.push(user!);

        // get all previous rooms except for the one we are editing
        let newRoomsArr: Room[] = this.rooms.filter(iterableRoom => iterableRoom.name !== room.name);

        // add room with added user to the newRooms Arr
        newRoomsArr = [...newRoomsArr, room];

        // store newRoomsArr to this.rooms
        this.rooms = newRoomsArr;
    }
}
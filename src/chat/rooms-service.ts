import {Room} from "../interfaces/room";
import {RoomNameTaken} from "./exceptions/users-service-room-name-taken";
import {RoomDataMissing} from "./exceptions/users-service-room-data-missing";
import {InvalidRoomQuery} from "./exceptions/users-service-invalid-room-query";
import {NoSuchRoomExists} from "./exceptions/users-service-no-such-room-exists";
import {MissingQueryData} from "./exceptions/users-service-missing-data";
import {UserAlreadyInRoom} from "./exceptions/users-service-user-already-in-room";
import {UserNotInRoom} from "./exceptions/users-service-user-not-in-room";
import {User} from "../interfaces/user";

export class RoomsService {
    private static instance: RoomsService;
    private rooms: Room[] = [];

    private constructor() {
    }

    public static getInstance(): RoomsService {
        if (!RoomsService.instance) {
            RoomsService.instance = new RoomsService();
        }
        return RoomsService.instance;
    }

    // Create new room
    createRoom = (currentUser: User, newRoom: Room) : string => {

        // format new room name to avoid duplicate names
        newRoom.name = newRoom.name.trim().toLowerCase();

        // check if all data provided for newRoom
        if (newRoom.name === '' || newRoom.description === '') {
            return new RoomDataMissing().printError();
        }

        // check if room name is already in use
        const filterRes = this.rooms.filter(room => room.name === newRoom.name);
        if (filterRes.length > 0) {
            console.log(filterRes);
            return new RoomNameTaken().printError();
        }

        // add current user as room author (use name for now)
        newRoom.author = currentUser._id;

        // define usersInRoom property
        newRoom.usersInRoom = [];

        // add current user to room
        newRoom.usersInRoom.push(currentUser._id);

        // If All checks pass add new room to rooms array
        this.rooms.push(newRoom);
        console.log('Create Room: New room added to array.');
        return newRoom.name;
    }

    // return a specific room
    fetchRoom = (roomName: string): string | Room => {
        // check if valid roomName
        if (roomName === '') {
            return new InvalidRoomQuery().printError();
        }

        // format roomName for search
        roomName = roomName.trim().toLowerCase();
        console.log('fetchRoom: searching room by name');
        console.log(roomName)

        console.log('current rooms stored');
        console.log(this.rooms);

        const foundRoom: Room[] = this.rooms.filter(room => room.name === roomName);

        console.log('fetchRoom: found room');
        console.log(foundRoom);

        // check if room exists
        if (foundRoom.length !== 1) {
            return new NoSuchRoomExists().printError();
        }

        console.log(`Fetch Room: Found room ${foundRoom[0].name}`)

        return foundRoom[0];
    }

    // return all current rooms
    fetchAllRooms = (): Room[] => {
        return this.rooms;
    }

    // join a room
    joinRoom = (currentUser: User, roomName: string) => {
        // helper method that formats input and checks initial values for wrong input
        const room = this.checkInputAndFormat(roomName);

        // check if proper room obj or error msg
        if (typeof room === 'string') {
            return room;
        }

        console.log(`JoinRoom: Found room ${room}`);

        // check if user already in the room
        if (room.usersInRoom && room.usersInRoom.length > 0) {
            // compare by name for now
            const foundUser = room.usersInRoom.find(userId => userId === currentUser._id);
            // if user found in room return error
            if (foundUser) {
                return new UserAlreadyInRoom().printError();
            }
        }

        // if all check passed add user to room's users array
        room.usersInRoom!.push(currentUser._id);
        console.log(`JoinRoom: Added user ${currentUser.name} to room`);

        // get all previous rooms except for the one we are editing
        let newRoomsArr: Room[] = this.rooms.filter(iterableRoom => iterableRoom.name !== room.name);

        // add room with added user to the newRooms Arr
        newRoomsArr = [...newRoomsArr, room];

        // store newRoomsArr to this.rooms
        this.rooms = newRoomsArr;

        console.log('JoinRoom: Updated this.rooms to contain the added user to the room');

        console.log(this.rooms);
    }

    // leave a room
    leaveRoom = (currentUser: User, roomName: string) => {
        // helper method that formats input and checks initial values for wrong input
        const room = this.checkInputAndFormat(roomName);

        // check if proper room obj or error msg
        if (typeof room === 'string') {
            return room;
        }

        console.log('Leave Room: Found room ');
        console.log(room);

        // check if user is not in the current room
        if (room.usersInRoom && room.usersInRoom.length > 0) {
            const foundUser = room.usersInRoom.find(userId => userId === currentUser._id);
            // if user found in room return error
            if (!foundUser) {
                return new UserNotInRoom().printError();
            }
        }

        // remove user from current room
        room.usersInRoom = room.usersInRoom!.filter(userId => userId !== currentUser.id);

        console.log('Leave Room: removed user from room');
        console.log(room);

        // get all rooms except the one we are editing
        let newRoomsArr: Room[] = this.rooms.filter(iterableRoom => iterableRoom.name !== room.name);

        // add the room we are editing to the new rooms arr
        newRoomsArr = [...newRoomsArr, room];

        // set local variable to be equal to the new usersArr
        this.rooms = newRoomsArr;

        console.log('Leave Room: edited the rooms array to contain our edited array without the user');
        console.log(this.rooms);
    }

    // helper method that formats input and checks initial values for wrong input
    checkInputAndFormat = (roomName: string): string | Room => {
        // format data to match stored data

        roomName = roomName.trim().toLowerCase();

        // validate the data
        if (!roomName) {
            return new MissingQueryData().printError();
        }

        // find room by name
        const room: Room | undefined = this.rooms.find(room => room.name === roomName);

        // handle if room doesn't exist
        if (!room) {
            return new NoSuchRoomExists().printError();
        }
        // return found room
        return room;
    }
}
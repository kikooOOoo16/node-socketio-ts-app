import {Room} from "../interfaces/room";
import {User} from "../interfaces/user";
import {ExceptionFactory} from "./exceptions/exception-factory";
import {customExceptionType} from "./exceptions/custom-exception-type";
import {CustomException} from "./exceptions/custom-exception";

export class RoomsService {
    private static instance: RoomsService;
    private rooms: Room[] = [];
    private customException!: CustomException;

    private constructor() {
    }

    public static getInstance(): RoomsService {
        if (!RoomsService.instance) {
            RoomsService.instance = new RoomsService();
        }
        return RoomsService.instance;
    }

    // Create new room
    createRoom = (currentUser: User, newRoom: Room): string => {

        // format new room name to avoid duplicate names
        newRoom.name = newRoom.name.trim().toLowerCase();

        // check if all data provided for newRoom
        if (newRoom.name === '' || newRoom.description === '') {
            // get customException type from exceptionFactory
            this.customException = ExceptionFactory.createException(customExceptionType.roomDataMissing);
            return this.customException.printError();
        }

        // check if room name is already in use
        const filterRes = this.rooms.filter(room => room.name === newRoom.name);
        if (filterRes.length > 0) {
            console.log(filterRes);
            // get customException type from exceptionFactory
            this.customException = ExceptionFactory.createException(customExceptionType.roomNameTaken);
            return this.customException.printError();
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
    fetchRoom = (roomName: string): {room: Room | undefined, err: string} => {
        let err = '';
        // check if valid roomName
        if (!roomName || roomName === '') {
            // get customException type from exceptionFactory
            this.customException = ExceptionFactory.createException(customExceptionType.invalidRoomQuery);
            err = this.customException.printError();
            return {room: undefined, err};
        }

        // format roomName for search
        roomName = roomName.trim().toLowerCase();
        console.log('Fetch Room: searching room by name');
        console.log(roomName);

        console.log('Fetch Room: current rooms stored');
        console.log(this.rooms);

        const foundRoom: Room[] = this.rooms.filter(room => room.name === roomName);

        console.log('Fetch Room: found room');
        console.log(foundRoom);

        // check if room exists
        if (foundRoom.length !== 1) {
            // get customException type from exceptionFactory
            this.customException = ExceptionFactory.createException(customExceptionType.noSuchRoomExists);
            err = this.customException.printError();
            return {room: undefined, err};
        }

        console.log(`Fetch Room: Found room ${foundRoom[0].name}`);

        return {room: foundRoom[0], err};
    }

    // return all current rooms
    fetchAllRooms = (): Room[] => {
        return this.rooms;
    }

    // join a room
    joinRoom = (currentUser: User, roomName: string) => {
        // helper method that formats input and checks initial values for wrong input
        const {room, error} = this.checkInputAndFormat(roomName);

        // check if proper room obj or error msg
        if (error !== '') {
            return error;
        }

        console.log(`JoinRoom: Found room ${room}`);

        // check if user already in the room
        if (room!.usersInRoom && room!.usersInRoom.length > 0) {
            // compare by name for now
            const foundUser = room!.usersInRoom.find(userId => userId === currentUser._id);
            // if user found in room return error
            if (foundUser) {
                // get customException type from exceptionFactory
                this.customException = ExceptionFactory.createException(customExceptionType.userAlreadyInRoom);
                return this.customException.printError();
            }
        }

        // if all check passed add user to room's users array
        room!.usersInRoom!.push(currentUser._id);
        console.log(`JoinRoom: Added user ${currentUser.name} to room`);

        // get all previous rooms except for the one we are editing
        let newRoomsArr: Room[] = this.rooms.filter(iterableRoom => iterableRoom.name !== room!.name);

        // add room with added user to the newRooms Arr
        newRoomsArr = [...newRoomsArr, room!];

        // store newRoomsArr to this.rooms
        this.rooms = newRoomsArr;

        console.log('JoinRoom: Updated this.rooms to contain the added user to the room');

        console.log(this.rooms);
    }

    // leave a room
    leaveRoom = (currentUser: User, roomName: string) => {
        // helper method that formats input and checks initial values for wrong input
        const {room, error} = this.checkInputAndFormat(roomName);

        // check if proper room obj or error msg
        if (error !== '') {
            return error;
        }

        console.log('Leave Room: Found room ');
        console.log(room);

        // check if user is not in the current room
        if (room!.usersInRoom && room!.usersInRoom.length > 0) {
            const foundUser = room!.usersInRoom.find(userId => userId == currentUser._id);
            console.log('LeaveRoom: Found user:');
            console.log(foundUser);
            // if user found in room return error
            if (!foundUser) {
                // get customException type from exceptionFactory
                this.customException = ExceptionFactory.createException(customExceptionType.userNotInRoom);
                return this.customException.printError();
            }
        }

        // remove user from current room
        room!.usersInRoom = room!.usersInRoom!.filter(userId => userId !== currentUser.id);

        console.log('Leave Room: removed user from room');
        console.log(room);

        // get all rooms except the one we are editing
        let newRoomsArr: Room[] = this.rooms.filter(iterableRoom => iterableRoom.name !== room!.name);

        // add the room we are editing to the new rooms arr
        newRoomsArr = [...newRoomsArr, room!];

        // set local variable to be equal to the new usersArr
        this.rooms = newRoomsArr;

        console.log('Leave Room: edited the rooms array to contain our edited array without the user');
        console.log(this.rooms);
    }

    // helper method that formats input and checks initial values for wrong input
    checkInputAndFormat = (roomName: string): { room: Room | undefined; error: string } => {
        let error = '';
        // format data to match stored data

        roomName = roomName.trim().toLowerCase();

        // validate the data
        if (!roomName) {
            // get customException type from exceptionFactory
            this.customException = ExceptionFactory.createException(customExceptionType.missingQueryData);
            error = this.customException.printError();
        }

        // find room by name
        const room: Room | undefined = this.rooms.find(room => room.name === roomName);

        // handle if room doesn't exist
        if (!room) {
            // get customException type from exceptionFactory
            this.customException = ExceptionFactory.createException(customExceptionType.noSuchRoomExists);
            error = this.customException.printError();
        }
        // return found room
        return {room, error};
    }
}
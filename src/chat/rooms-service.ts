import {Room} from "../interfaces/room";
import {User} from "../interfaces/user";
import {Schema} from "mongoose";
import {Room as RoomModel} from "../db/models/room";
import {ExceptionFactory} from "./exceptions/exception-factory";
import {customExceptionType} from "./exceptions/custom-exception-type";
import {CustomException} from "./exceptions/custom-exception";

export class RoomsService {
    private static instance: RoomsService;
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
    createRoom = async (currentUser: User, newRoom: Room): Promise<{ roomName: string | undefined, createRoomErr: string }> => {
        let createRoomErr = '';
        // check if all data provided for newRoom
        if (newRoom.name === '' || newRoom.description === '') {
            // get customException type from exceptionFactory
            this.customException = ExceptionFactory.createException(customExceptionType.roomDataMissing);
            createRoomErr = this.customException.printError();
            return {roomName: undefined, createRoomErr};
        }

        // add current user as room author (use name for now)
        newRoom.author = currentUser._id;

        // define usersInRoom property
        newRoom.usersInRoom = [];

        // add current user to room
        newRoom.usersInRoom.push(currentUser._id);

        try {
            // create new Room Mongoose model and save it to DB
            await new RoomModel({...newRoom}).save();
            console.log('Create Room: New room saved to DB.');
        } catch ({message}) {
            if (message.split(' ')[0] === 'E11000') {
                this.customException = ExceptionFactory.createException(customExceptionType.roomNameTaken);
                createRoomErr = this.customException.printError();
                return {roomName: undefined, createRoomErr};
            }
        }

        return {roomName: newRoom.name, createRoomErr};
    }

    // return a specific room
    fetchRoom = async (roomName: string): Promise<{ room: Room | undefined, fetchRoomErr: string }> => {
        let foundRoom;
        let err = '';
        // check if valid roomName
        if (!roomName || roomName === '') {
            // get customException type from exceptionFactory
            this.customException = ExceptionFactory.createException(customExceptionType.invalidRoomQuery);
            err = this.customException.printError();
            return {room: undefined, fetchRoomErr: err};
        }

        console.log('Fetch Room: searching room by name');
        console.log(roomName);

        try {
            // Find room by roomName and only retrieve users id name and email
            foundRoom = await RoomModel.findOne({name: roomName}).populate<{ usersInRoom: User[] }>({
                path: 'usersInRoom',
                select: '_id name email'
            });
        } catch ({message}) {
            console.log(message);
            this.customException = ExceptionFactory.createException(customExceptionType.problemRetrievingData);
            err = this.customException.printError();
            return {room: undefined, fetchRoomErr: err};
        }

        console.log('Fetch Room: found room');
        console.log(foundRoom);

        // check if room exists
        if (!foundRoom) {
            // get customException type from exceptionFactory
            this.customException = ExceptionFactory.createException(customExceptionType.noSuchRoomExists);
            err = this.customException.printError();
            return {room: undefined, fetchRoomErr: err};
        }

        console.log(`Fetch Room: Found room ${foundRoom.name}`);

        return {room: foundRoom, fetchRoomErr: err};
    }

    // return all current rooms
    fetchAllRooms = async () => {
        let err = '';
        let allRooms;
        // try to fetch all the rooms from the DB
        try {
            allRooms = await RoomModel.find();
        } catch ({message}) {
            console.log(message);
            this.customException = ExceptionFactory.createException(customExceptionType.problemRetrievingData);
            err = this.customException.printError();
            return {allRooms: undefined, err};
        }
        return {allRooms, err};
    }

    // join a room
    joinRoom = async (currentUser: User, roomName: string) => {
        let queryRes;
        let usersInRoom: Schema.Types.ObjectId[] | undefined;  // THIS IS THE WRONG TYPE DON'T FORGET TO FIX IT !!!!!!!!!!!!!
        // helper method that formats input and checks initial values for wrong input
        const {room, err} = await this.checkInputAndFormat(roomName);

        // check if proper room obj or error msg
        if (err !== '') {
            return err;
        }
        console.log(`JoinRoom: Found room ${room}`);

        // get currentUsersArray
        usersInRoom = room?.usersInRoom;

        console.log('JoinRoom: currentUsers in room array');
        console.log(usersInRoom);

        // check if user already in the room
        if (usersInRoom && usersInRoom.length > 0) {
            // compare by userId, id values must be of type string because ObjectID === fails (different references)
            const foundUser = usersInRoom.find((user: any) => String(user._id) === String(currentUser._id));
            // if user found in room return error
            if (foundUser) {
                // get customException type from exceptionFactory
                this.customException = ExceptionFactory.createException(customExceptionType.userAlreadyInRoom);
                return this.customException.printError();
            }
        }

        // if all check passed add user to room's users array
        usersInRoom!.push(currentUser._id);
        console.log(`JoinRoom: Added user ${currentUser.name} to room array`);

        // if all goes well update room in DB with new usersInRoom array
        try {
            queryRes = await RoomModel.findOneAndUpdate({name: room!.name}, {'usersInRoom': usersInRoom});
        } catch ({message}) {
            console.log(message);
            this.customException = ExceptionFactory.createException(customExceptionType.problemAddingUserToRoom);
            return this.customException.printError();
        }
        console.log('JoinRoom: QueryResults');
        console.log(queryRes);
    }

    // leave a room
    leaveRoom = async (currentUser: User, roomName: string): Promise<string | undefined> => {
        let usersInRoom: Schema.Types.ObjectId[] | undefined;  // THIS IS THE WRONG TYPE DON'T FORGET TO FIX IT !!!!!!!!!!!!!

        // helper method that formats input and checks initial values for wrong input
        const {room, err} = await this.checkInputAndFormat(roomName);

        // check if proper room obj or error msg
        if (err !== '') {
            return err;
        }

        console.log('Leave Room: Found room ');
        console.log(room);

        // get currentUsersArray
        usersInRoom = room?.usersInRoom;

        // check if user is not in the current room
        if (usersInRoom && usersInRoom.length > 0) {
            // compare by userId, id values must be of type string because ObjectID === fails (different references)
            const foundUser = usersInRoom.find((userId: any) => String(userId._id) === String(currentUser._id));
            console.log('LeaveRoom: Found user:');
            console.log(foundUser);
            // if user found in room return error
            if (!foundUser) {
                // get customException type from exceptionFactory
                this.customException = ExceptionFactory.createException(customExceptionType.userNotInRoom);
                return this.customException.printError();
            }
        }

        // remove user from current room, must convert ObjectID into string because === fails (different references);
        usersInRoom = usersInRoom!.filter((userId: any) => String(userId._id) !== String(currentUser._id));

        console.log('LeaveRoom: updated usersInRoom array');
        console.log(usersInRoom);

        // if all goes well update room in DB with new usersInRoom array
        try {
            await RoomModel.findOneAndUpdate({name: room!.name}, {'usersInRoom': usersInRoom});
        } catch ({message}) {
            console.log(message);
            this.customException = ExceptionFactory.createException(customExceptionType.problemAddingUserToRoom);
            return this.customException.printError();
        }
    }

    // helper method that formats input and checks initial values for wrong input
    checkInputAndFormat = async (roomName: string): Promise<{ room: Room | undefined; err: string }> => {
        let err = '';

        // validate the data
        if (!roomName) {
            // get customException type from exceptionFactory
            this.customException = ExceptionFactory.createException(customExceptionType.missingQueryData);
            err = this.customException.printError();
        }

        // find room by name
        const {room, fetchRoomErr: errFetchRoom} = await this.fetchRoom(roomName);

        // check if fetchRoom returned an error
        if (errFetchRoom !== '') {
            err = errFetchRoom;
        }

        // handle if room doesn't exist
        if (!room) {
            // get customException type from exceptionFactory
            this.customException = ExceptionFactory.createException(customExceptionType.noSuchRoomExists);
            err = this.customException.printError();
        }
        // return found room
        return {room, err};
    }
}
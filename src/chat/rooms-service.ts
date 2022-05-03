import {Room} from "../interfaces/room";
import {User} from "../interfaces/user";
import {Room as RoomModel} from "../db/models/room";
import {ExceptionFactory} from "./exceptions/exception-factory";
import {customExceptionType} from "./exceptions/custom-exception-type";
import {CustomException} from "./exceptions/custom-exception";
import {Message} from "../interfaces/message";
import {RoomPopulatedUsers} from "../interfaces/roomPopulatedUsers";
import {Schema} from "mongoose";
import Logger from "../logger/logger";

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
        if (newRoom.name === '' || newRoom.description === '' || newRoom.description.length < 10) {
            Logger.warn(`RoomsService: Create Room: Room query data missing for ${newRoom.name}.`);
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
            Logger.debug('RoomsService: Create Room: New room saved to DB.');
        } catch ({message}) {
            if (message.split(' ')[0] === 'E11000') {
                Logger.warn(`RoomsService: Create Room: Room name already taken exception triggered for name ${newRoom.name}.`);
                this.customException = ExceptionFactory.createException(customExceptionType.roomNameTaken);
                createRoomErr = this.customException.printError();
                return {roomName: undefined, createRoomErr};
            }
        }
        return {roomName: newRoom.name, createRoomErr};
    }

    // edit existing room
    editRoom = async (editedRoom: Room, foundRoom: Room): Promise<{ err: string }> => {
        let err = '';
        // try to update the room in the DB
        try {
            await RoomModel.findByIdAndUpdate(foundRoom._id, {
                name: editedRoom.name,
                description: editedRoom.description
            });
        } catch (e) {
            Logger.warn(`RoomsService: Edit Room: There was a problem updating the room ${foundRoom.name}.`);
            this.customException = ExceptionFactory.createException(customExceptionType.problemUpdatingRoom);
            err = this.customException.printError();
            return {err};
        }
        return {err};
    }

    // delete existing room
    deleteRoom = async (roomId: Schema.Types.ObjectId): Promise<{ err: string }> => {
        let err = '';
        try {
            await RoomModel.findByIdAndDelete(roomId);
        } catch (e) {
            Logger.warn(`RoomsService: Delete Room: There was a problem deleting the room ${roomId}.`);
            this.customException = ExceptionFactory.createException(customExceptionType.problemDeletingRoom);
            err = this.customException.printError();
            return {err};
        }
        return {err};
    }

    // return a specific room
    fetchRoom = async (roomName: string): Promise<{ room: RoomPopulatedUsers | undefined, fetchRoomErr: string }> => {
        let foundRoom;
        let err = '';
        // check if valid roomName
        if (!roomName || roomName === '') {
            // get customException type from exceptionFactory
            Logger.warn(`RoomsService: Fetch Room: Invalid room query for room name ${roomName}.`);
            this.customException = ExceptionFactory.createException(customExceptionType.invalidRoomQuery);
            err = this.customException.printError();
            return {room: undefined, fetchRoomErr: err};
        }

        Logger.debug(`RoomsService: Fetch Room: Searching room by name ${roomName}.`);

        try {
            // Find room by roomName and only retrieve users id name and email
            foundRoom = await RoomModel.findOne({name: roomName}).populate<{ usersInRoom: User[] }>({
                path: 'usersInRoom',
                select: '_id name email'
            });
        } catch ({message}) {
            Logger.warn(`RoomsService: Fetch Room: Problem retrieving room data with error message: ${message}.`);
            this.customException = ExceptionFactory.createException(customExceptionType.problemRetrievingData);
            err = this.customException.printError();
            return {room: undefined, fetchRoomErr: err};
        }

        Logger.debug(`RoomsService: Fetch Room: found room ${foundRoom}.`);

        // check if room exists
        if (!foundRoom) {
            Logger.warn(`RoomsService: Fetch Room: no room found for room name ${roomName}.`);
            // get customException type from exceptionFactory
            this.customException = ExceptionFactory.createException(customExceptionType.noSuchRoomExists);
            err = this.customException.printError();
            return {room: undefined, fetchRoomErr: err};
        }
        Logger.debug(`RoomsService: Fetch Room: Found room ${foundRoom.name}.`);

        return {room: foundRoom, fetchRoomErr: err};
    }

    // return all current rooms
    fetchAllRooms = async (): Promise<{ allRooms: Room[] | undefined, err: string }> => {
        let err = '';
        let allRooms;
        // try to fetch all the rooms from the DB
        try {
            allRooms = await RoomModel.find();
        } catch ({message}) {
            Logger.warn(`RoomsService: Fetch All Room: Problem retrieving all rooms with error: ${message}.`);
            this.customException = ExceptionFactory.createException(customExceptionType.problemRetrievingData);
            err = this.customException.printError();
            return {allRooms: undefined, err};
        }
        return {allRooms, err};
    }

    // return all rooms created by a specific user
    fetchAllUserRooms = async (currentUser: User): Promise<{ allUserRooms: Room[] | undefined, err: string }> => {
        let err = '';
        let allUserRooms;

        // try to fetch all the rooms from the DB
        try {
            // retrieve only specific fields
            allUserRooms = await RoomModel.find({author: currentUser._id},).select('_id name description author createdAt');
        } catch ({message}) {
            Logger.warn(`RoomsService: Fetch All Room: Problem retrieving all user specific rooms with error: ${message}.`);
            this.customException = ExceptionFactory.createException(customExceptionType.problemRetrievingData);
            err = this.customException.printError();
            return {allUserRooms: undefined, err};
        }
        return {allUserRooms, err}
    }

    // join a room
    joinRoom = async (currentUser: User, roomName: string): Promise<{ err: string }> => {
        let err = '';
        let usersInRoom: User[] | undefined;  // THIS IS THE WRONG TYPE DON'T FORGET TO FIX IT !!!!!
        // helper method that formats input and checks initial values for wrong input
        const {room, err: checkInputAndFormatErr} = await this.checkInputAndFormat(roomName);

        // check if proper room obj or error msg
        if (checkInputAndFormatErr !== '') {
            err = checkInputAndFormatErr;
            return {err};
        }

        Logger.debug(`RoomsService: JoinRoom: Found room ${room}.`);

        // get currentUsersArray
        usersInRoom = room?.usersInRoom;

        Logger.debug(`RoomsService: JoinRoom: CurrentUsers in room array ${usersInRoom}.`);

        // check if user already in the room
        if (usersInRoom && usersInRoom.length > 0) {
            // compare by userId, id values must be of type string because ObjectID === fails (different references)
            const foundUser = usersInRoom.find((user: any) => String(user._id) === String(currentUser._id));
            // if user found in room return error
            if (foundUser) {
                Logger.warn(`RoomsService: JoinRoom: Join room failed for User ${currentUser.name} and room ${roomName}, user is already in room.`);
                // get customException type from exceptionFactory
                this.customException = ExceptionFactory.createException(customExceptionType.userAlreadyInRoom);
                err = this.customException.printError();
                return {err};
            }
        }

        // if all check passed add user to room's users array
        // @ts-ignore actually want to add only id
        usersInRoom!.push(currentUser._id);
        Logger.debug(`RoomsService: JoinRoom: Added user ${currentUser.name} to room array.`);

        // if all goes well update room in DB with new usersInRoom array
        const {err: updateUsersInRoomErr} = await this.updateUsersInRoom(room!.name, usersInRoom!);
        // check if usersInRoom were updated
        if (updateUsersInRoomErr !== '') {
            err = updateUsersInRoomErr;
            return {err};
        }
        return {err};
    }

    // leave a room
    leaveRoom = async (currentUser: User, roomName: string): Promise<{ err: string }> => {
        let err = '';
        let usersInRoom: User[] | undefined;

        // helper method that formats input and checks initial values for wrong input
        const {room, err: checkInputAndFormatErr} = await this.checkInputAndFormat(roomName);

        // check if proper room obj or error msg
        if (checkInputAndFormatErr !== '') {
            err = checkInputAndFormatErr;
            return {err};
        }

        Logger.debug(`RoomsService: Leave Room: Found room  ${room}.`);

        // get currentUsersArray
        usersInRoom = room?.usersInRoom;

        // check if user is not in the current room
        if (usersInRoom && usersInRoom.length > 0) {
            // compare by userId, id values must be of type string because ObjectID === fails (different references)
            const foundUser = usersInRoom.find((user: any) => String(user._id) === String(currentUser._id));
            Logger.debug(`RoomsService: Leave Room: Found user  ${foundUser}.`);
            // if user found in room return error
            if (!foundUser) {
                // get customException type from exceptionFactory
                this.customException = ExceptionFactory.createException(customExceptionType.userNotInRoom);
                err = this.customException.printError();
                return {err}
            }
        }

        // remove user from current room, must convert ObjectID into string because === fails (different references);
        usersInRoom = usersInRoom!.filter((userId: any) => String(userId._id) !== String(currentUser._id));

        Logger.debug(`RoomsService: Leave Room: Updated usersInRoom array  ${usersInRoom}.`);

        // if all goes well update room in DB with new usersInRoom array
        const {err: updateUsersInRoomErr} = await this.updateUsersInRoom(room!.name, usersInRoom);
        // check if usersInRoom were updated
        if (updateUsersInRoomErr !== '') {
            Logger.warn(`RoomsService: Leave Room: Failed to update users in room ${roomName} with error message: ${updateUsersInRoomErr}`);
            err = updateUsersInRoomErr;
            return {err};
        }

        return {err};
    }

    //helper method that checks if a provided name is already in use
    checkIfRoomNameExists = async (name: string, roomToEditID: Schema.Types.ObjectId): Promise<{ err: string }> => {
        let err = '';
        let foundRoom: Room | null = null;

        //search for room with given room name
        try {
            foundRoom = await RoomModel.findOne({name: name, _id: {$ne: roomToEditID}});
        } catch (e) {
            Logger.warn(`RoomsService: checkIfRoomNameExists: Failed to retrieve room data for room name ${name} with error message: ${e.message}`);
            this.customException = ExceptionFactory.createException(customExceptionType.problemRetrievingData);
            err = this.customException.printError();
            return {err};
        }

        Logger.debug(`RoomsService: checkIfRoomNameExists: foundRoom =  ${foundRoom}`);

        // check if room was found
        if (foundRoom) {
            this.customException = ExceptionFactory.createException(customExceptionType.roomNameTaken);
            err = this.customException.printError();
            return {err};
        }
        return {err};
    }

    saveChatHistory = async (room: RoomPopulatedUsers, chatMessage: Message): Promise<{ err: string }> => {
        let saveChatError = '';
        let newChatHistory: Message[];

        // check if previous chat history exists
        if (room.chatHistory && room.chatHistory.length > 0) {
            // add new message to already existing chat history
            newChatHistory = [...room.chatHistory, chatMessage];
        } else {
            newChatHistory = [chatMessage];
        }

        // try to update room's chat history
        try {
            await RoomModel.findOneAndUpdate({name: room.name}, {'chatHistory': newChatHistory});
        } catch (err) {
            Logger.debug(`RoomsService: SaveChatHistory: Failed to find and update chat history for room name ${room.name}`);
            this.customException = ExceptionFactory.createException(customExceptionType.problemSavingChatHistory);
            saveChatError = this.customException.printError();
            return {err: saveChatError};
        }
        // return err
        return {err: saveChatError};
    }

    // helper method that formats input and checks initial values for wrong input
    private checkInputAndFormat = async (roomName: string): Promise<{ room: RoomPopulatedUsers | undefined; err: string }> => {
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

    // helper method that updates users in specified room
    private updateUsersInRoom = async (roomName: string, usersInRoom: User[]): Promise<{ err: string }> => {
        let err = '';
        try {
            await RoomModel.findOneAndUpdate({name: roomName}, {'usersInRoom': usersInRoom});
        } catch ({message}) {
            Logger.warn(`RoomsService: updateUsersInRoom: Failed to find and update users list for room with name ${roomName}. Fail message ${message}`);
            this.customException = ExceptionFactory.createException(customExceptionType.problemAddingUserToRoom);
            err = this.customException.printError();
            return {err};
        }
        return {err};
    }
}

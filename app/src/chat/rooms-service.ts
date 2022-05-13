import {Room} from "../interfaces/room";
import {User} from "../interfaces/user";
import {Room as RoomModel} from "../db/models/room";
import {ExceptionFactory} from "./exceptions/exception-factory";
import {CustomExceptionType} from "./exceptions/custom-exception-type";
import {CustomException} from "./exceptions/custom-exception";
import {Message} from "../interfaces/message";
import {RoomPopulatedUsers} from "../interfaces/roomPopulatedUsers";
import {Schema} from "mongoose";
import Logger from "../logger/logger";
import Filter from "bad-words";
import {UsersService} from "./users-service";

export class RoomsService {
    private static instance: RoomsService;
    private customException!: CustomException;
    readonly ALREADY_CREATED = 'E11000';

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
        // check if all data provided and is valid for newRoom
        if (newRoom.name === '' || newRoom.description === '' || newRoom.description.length < 10) {
            Logger.warn(`RoomsService: Create Room: Room query data missing for room with name: ${newRoom.name}.`);
            // get customException type from exceptionFactory
            this.customException = ExceptionFactory.createException(CustomExceptionType.ROOM_DATA_MISSING);
            createRoomErr = this.customException.printError();
            return {roomName: undefined, createRoomErr};
        }

        // catch profane language in new room query
        const badWordsFilter = new Filter();

        if (badWordsFilter.isProfane(newRoom.name) || badWordsFilter.isProfane(newRoom.description)) {
            this.customException = ExceptionFactory.createException(CustomExceptionType.PROFANE_LANGUAGE_NOT_ALLOWED);
            const badWordsErr = this.customException.printError();
            return {roomName: undefined, createRoomErr: badWordsErr};
        }

        // add current user as room author (use name for now)
        newRoom.author = currentUser._id;

        // define usersInRoom property
        newRoom.usersInRoom = [];

        // define bannedUsersArray property
        newRoom.bannedUsersFromRoom = [];

        // add current user to room
        newRoom.usersInRoom.push(currentUser._id);

        try {
            // create new Room Mongoose model and save it to DB
            await new RoomModel({...newRoom}).save();
            Logger.debug(`RoomsService: Create Room: New room saved to DB. RoomName = ${newRoom.name}`);

        } catch (err) {
            if (err instanceof Error && err.message.split(' ')[0] === this.ALREADY_CREATED) {

                Logger.warn(`RoomsService: Create Room: Room name already taken exception triggered for name ${newRoom.name}.`);

                this.customException = ExceptionFactory.createException(CustomExceptionType.ROOM_NAME_TAKEN);
                createRoomErr = this.customException.printError();

                return {roomName: undefined, createRoomErr};

            }
        }
        return {roomName: newRoom.name, createRoomErr};
    }

    // edit existing room
    editRoom = async (editedRoom: Room, foundRoom: Room): Promise<{ err: string }> => {
        let err = '';

        // catch profane language in edit room query
        const badWordsFilter = new Filter();

        if (badWordsFilter.isProfane(editedRoom.name) || badWordsFilter.isProfane(editedRoom.description)) {
            this.customException = ExceptionFactory.createException(CustomExceptionType.PROFANE_LANGUAGE_NOT_ALLOWED);
            err = this.customException.printError();
            return {err};
        }

        // try to update the room in the DB
        try {
            await RoomModel.findByIdAndUpdate(foundRoom._id, {
                name: editedRoom.name,
                description: editedRoom.description
            });
        } catch (e) {
            Logger.warn(`RoomsService: Edit Room: There was a problem updating the room ${foundRoom.name}.`);
            this.customException = ExceptionFactory.createException(CustomExceptionType.PROBLEM_UPDATING_ROOM);
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
            this.customException = ExceptionFactory.createException(CustomExceptionType.PROBLEM_DELETING_ROOM);
            err = this.customException.printError();
            return {err};
        }
        Logger.debug(`RoomsService: Delete Room: Successfully deleted the room with id= ${roomId}.`);
        return {err};
    }

    // return a specific room
    fetchRoom = async (roomName: string): Promise<{ room: RoomPopulatedUsers | undefined, err: string }> => {
        let foundRoom;
        let err = '';
        // check if valid roomName
        if (!roomName || roomName === '') {
            // get customException type from exceptionFactory
            Logger.warn(`RoomsService: Fetch Room: Invalid room query for room name ${roomName}.`);
            this.customException = ExceptionFactory.createException(CustomExceptionType.INVALID_ROOM_QUERY);
            err = this.customException.printError();
            return {room: undefined, err};
        }

        Logger.debug(`RoomsService: Fetch Room: Searching room by name ${roomName}.`);

        try {
            // Find room by roomName and only retrieve users id name and email
            foundRoom = await RoomModel.findOne({name: roomName}).populate<{ usersInRoom: User[] }>({
                path: 'usersInRoom',
                select: '_id name email'
            });
        } catch (e) {
            Logger.warn(`RoomsService: Fetch Room: Problem retrieving room data with error message: ${e.message}.`);
            this.customException = ExceptionFactory.createException(CustomExceptionType.PROBLEM_RETRIEVING_DATA);
            err = this.customException.printError();
            return {room: undefined, err};
        }

        // check if room exists
        if (!foundRoom) {
            Logger.warn(`RoomsService: Fetch Room: no room found for room name ${roomName}.`);
            // get customException type from exceptionFactory
            this.customException = ExceptionFactory.createException(CustomExceptionType.NO_SUCH_ROOM_EXISTS);
            err = this.customException.printError();
            return {room: undefined, err};
        }

        Logger.debug(`RoomsService: Fetch Room: found room ${foundRoom?.name}.`);

        return {room: foundRoom, err};
    }

    // return all current rooms
    fetchAllRooms = async (): Promise<{ allRooms: Room[] | undefined, err: string }> => {
        let err = '';
        let allRooms;
        // try to fetch all the rooms from the DB
        try {
            allRooms = await RoomModel.find();
        } catch ({message}) {
            Logger.warn(`RoomsService: fetchAllRooms(): Problem retrieving all rooms with error: ${message}.`);
            this.customException = ExceptionFactory.createException(CustomExceptionType.PROBLEM_RETRIEVING_DATA);
            err = this.customException.printError();
            return {allRooms: undefined, err};
        }
        Logger.debug(`RoomsService: fetchAllRooms(): Successfully fetched all rooms from DB, returning rooms array.`);
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
            this.customException = ExceptionFactory.createException(CustomExceptionType.PROBLEM_RETRIEVING_DATA);
            err = this.customException.printError();
            return {allUserRooms: undefined, err};
        }
        Logger.debug(`RoomsService: Fetch All Room: Retrieved all user rooms successfully, returning allUserRooms array.`);
        return {allUserRooms, err}
    }

    // join a room
    joinRoom = async (currentUser: User, roomName: string): Promise<{ err: string }> => {
        let err = '';

        Logger.debug(`RoomsService: Join Room: Called fetchRoom().`);
        const {room, err: fetchRoomErr} = await this.fetchRoom(roomName);

        // check if proper room obj or error msg
        if (fetchRoomErr !== '') {
            err = fetchRoomErr;
            return {err};
        }

        // fetch banned users list
        const bannedUsers: Schema.Types.ObjectId[] = room!.bannedUsersFromRoom;
        // check if bannedUsers array exists for room
        if (bannedUsers && bannedUsers.length > 0) {
            // check if user is banned from room
            const foundBannedUser = bannedUsers.find((userId: Schema.Types.ObjectId) => String(currentUser._id) === String(userId));
            // if found user inside bannedUsers array return err
            if (foundBannedUser) {
                Logger.warn(`rooms-service: joinRoom(): User name = ${currentUser.name} is banned from the room = ${room?.name}`);
                this.customException = ExceptionFactory.createException(CustomExceptionType.USER_BANNED_FROM_ROOM);
                err = this.customException.printError();
                return {err};
            }
        }


        // get currentUsersArray
        const usersInRoom: User[] | undefined = room?.usersInRoom;

        Logger.debug(`RoomsService: JoinRoom: CurrentUsers in room array: ${usersInRoom ? usersInRoom : '0'}.`);

        // check if the user is in the current room
        const {err: checkIfUserInRoomErr, userIsInRoom} = this.checkIfUserIsInRoom(usersInRoom, currentUser.id, roomName);
        Logger.warn(`rooms-service: joinRoom(): checkIfUserIsInRoom() returned err = ${checkIfUserInRoomErr} and usersIsInRoom = ${userIsInRoom}`);

        if (userIsInRoom) {
            err = checkIfUserInRoomErr;
            return {err};
        }

        // @ts-ignore actually want to add only id
        usersInRoom?.push(currentUser._id);
        Logger.debug(`RoomsService: JoinRoom: Added user ${currentUser.name} to room array.`);

        const {err: updateUsersInRoomErr} = await this.updateUsersInRoom(room!.name, usersInRoom!);

        if (updateUsersInRoomErr !== '') {
            err = updateUsersInRoomErr;
            return {err};
        }
        return {err};
    }

    // leave a room
    leaveRoom = async (userId: Schema.Types.ObjectId | string, room: RoomPopulatedUsers): Promise<{ err: string }> => {
        let err = '';
        let usersInRoom: User[] | undefined;

        // get currentUsersArray
        usersInRoom = room?.usersInRoom;

        // check if the user is in the current room
        const {err: checkIfUserInRoomErr, userIsInRoom} = this.checkIfUserIsInRoom(usersInRoom, userId, room.name);
        // if there was a problem with the check return an err message
        if (!userIsInRoom) {
            err = checkIfUserInRoomErr;
            return {err};
        }

        // remove user from current room, must convert ObjectID into string because === fails (different references);
        usersInRoom = usersInRoom!.filter((userIdInRoom: any) => String(userIdInRoom._id) !== String(userId));

        Logger.debug(`RoomsService: leaveRoom(): Updated usersInRoom array  ${usersInRoom}.`);

        // if all goes well update room in DB with new usersInRoom array
        const {err: updateUsersInRoomErr} = await this.updateUsersInRoom(room.name, usersInRoom);
        // check if usersInRoom were updated
        if (updateUsersInRoomErr !== '') {
            Logger.warn(`RoomsService: leaveRoom(): Failed to update users in room ${room.name} with error message: ${updateUsersInRoomErr}`);
            err = updateUsersInRoomErr;
            return {err};
        }

        return {err};
    }

    // kick a certain user from a room
    kickUserFromRoom = async (room: RoomPopulatedUsers, userId: string, currentUser: User): Promise<{ err: string }> => {
        let err = '';

        // check if user is the author/admin of the room
        const {err: checkUserRoomOwnershipErr} = await UsersService.getInstance().checkUserRoomOwnershipById(room.author, currentUser.id);
        // check if user is the author of the room err
        if (checkUserRoomOwnershipErr !== '') {
            err = checkUserRoomOwnershipErr;
            return {err};
        }

        // attempt to remove specific user by userId from room
        const {err: leaveRoomErr} = await this.leaveRoom(userId, room);
        // if err return callback with err message
        if (leaveRoomErr) {
            err = leaveRoomErr;
            return {err};
        }

        return {err};
    }

    // ban certain user from a room
    banUserFromRoom = async (room: RoomPopulatedUsers, userId: any, currentUser: User): Promise<{ err: string }> => {
        let err = '';

        // first kick the user from the room
        const {err: kickUserFromRoomErr} = await this.kickUserFromRoom(room, userId, currentUser);
        // check if user was kicked from the room successfully
        if (kickUserFromRoomErr !== '') {
            err = kickUserFromRoomErr;
            return {err};
        }

        // update banned users list of room
        const bannedUsersFromRoom = [...room.bannedUsersFromRoom, userId];

        // update room's state in the DB
        const {err: updateBannedUsersErr} = await this.updateBannedUsersForRoom(room, bannedUsersFromRoom);
        // check if updating the banned users array was successful
        if (updateBannedUsersErr !== '') {
            err = updateBannedUsersErr;
            return {err};
        }

        return {err};
    }

    // edit chat history of certainRoom with new message and returned newly saved message in room
    saveChatHistory = async (room: RoomPopulatedUsers, chatMessage: Message): Promise<{ err: string, savedChatMessage: Message | undefined }> => {
        let saveChatError = '';
        let newChatHistory: Message[];
        let newlySavedMessage: Message | undefined = undefined;

        // check if previous chat history exists
        if (room.chatHistory && room.chatHistory.length > 0) {
            // add new message to already existing chat history
            newChatHistory = [...room.chatHistory, chatMessage];
        } else {
            newChatHistory = [chatMessage];
        }

        // try to update room's chat history
        try {
            const updatedRoom: Room | null = await RoomModel.findOneAndUpdate({name: room.name}, {'chatHistory': newChatHistory}, {new: true});
            if (updatedRoom && updatedRoom.chatHistory) {
                newlySavedMessage = updatedRoom.chatHistory[updatedRoom.chatHistory.length - 1];
            } else {
                Logger.warn(`Failed to update room ${room.name} with a result of ${newlySavedMessage}`);
                this.customException = ExceptionFactory.createException(CustomExceptionType.PROBLEM_SAVING_CHAT_HISTORY);
                saveChatError = this.customException.printError();
                return {err: saveChatError, savedChatMessage: undefined};
            }
        } catch (err) {
            Logger.debug(`RoomsService: SaveChatHistory: Failed to find and update chat history for room name ${room.name}`);
            this.customException = ExceptionFactory.createException(CustomExceptionType.PROBLEM_SAVING_CHAT_HISTORY);
            saveChatError = this.customException.printError();
            return {err: saveChatError, savedChatMessage: undefined};
        }
        // return err
        return {err: saveChatError, savedChatMessage: newlySavedMessage};
    }

    // helper method that checks if a user is in a room and if the room has any users in it
    checkIfUserIsInRoom = (usersInRoom: User[] | undefined, userId: Schema.Types.ObjectId | string, roomName: string): { err: string, userIsInRoom: boolean } => {
        let userIsInRoom = false;
        let err = '';
        // check if user is not in the current room
        if (usersInRoom && usersInRoom.length > 0) {
            // compare by userId, id values must be of type string because ObjectID === fails (different references)
            const foundUser = usersInRoom.find((user: User) => String(user._id) === String(userId));
            // if no user found in room return false
            if (!foundUser) {
                Logger.debug(`RoomsService: checkIfUserIsInRoom(): No user was found in the room= ${roomName} with the userId=  ${userId}.`);
                // get customException type from exceptionFactory
                this.customException = ExceptionFactory.createException(CustomExceptionType.USER_NOT_IN_ROOM);
                err = this.customException.printError();
                userIsInRoom = false;
                return {err, userIsInRoom}
            } else {
                Logger.debug(`RoomsService: checkIfUserIsInRoom(): User name=  ${foundUser?.name} is definitely in the room= ${roomName}.`);
                // ser user already in room err message
                this.customException = ExceptionFactory.createException(CustomExceptionType.USER_ALREADY_IN_ROOM);
                err = this.customException.printError();
                // user was found return true
                userIsInRoom = true;
                return {err, userIsInRoom}
            }
        } else {
            Logger.debug(`RoomsService: checkIfUserIsInRoom(): The room= ${roomName} has no users in it.`);
            // there are no users in the room so the user can't be in it
            this.customException = ExceptionFactory.createException(CustomExceptionType.USER_NOT_IN_ROOM);
            err = this.customException.printError();
            return {err, userIsInRoom};
        }
    }

    //helper method that checks if a provided name is already in use
    checkIfRoomNameExists = async (name: string, roomToEditID: Schema.Types.ObjectId): Promise<{ err: string }> => {
        let err = '';
        let foundRoom: Room | null = null;

        //search for room with given room name
        try {
            foundRoom = await RoomModel.findOne({name: name, _id: {$ne: roomToEditID}});
        } catch (e) {
            // ts compiler error if no type assertion here
            if (e instanceof Error) {
                Logger.warn(`RoomsService: checkIfRoomNameExists: Failed to retrieve room data for room name ${name} with error message: ${e.message}`);
                this.customException = ExceptionFactory.createException(CustomExceptionType.PROBLEM_RETRIEVING_DATA);
                err = this.customException.printError();
                return {err};
            }
        }

        Logger.debug(`RoomsService: checkIfRoomNameExists: foundRoom =  ${foundRoom}`);

        // check if room was found
        if (foundRoom) {
            this.customException = ExceptionFactory.createException(CustomExceptionType.ROOM_NAME_TAKEN);
            err = this.customException.printError();
            return {err};
        }
        return {err};
    }

    // helper method that updates users in specified room
    private updateUsersInRoom = async (roomName: string, usersInRoom: User[]): Promise<{ err: string }> => {
        let err = '';
        try {
            await RoomModel.findOneAndUpdate({name: roomName}, {'usersInRoom': usersInRoom});
            Logger.debug(`rooms-service: updateUsersInRoom(): Saved the updated users list for room with name ${roomName} to the DB.`);
        } catch ({message}) {
            Logger.warn(`rooms-service: updateUsersInRoom(): Failed to find and update users list for room with name ${roomName}. Fail message ${message}`);
            this.customException = ExceptionFactory.createException(CustomExceptionType.PROBLEM_ADDING_USER_TO_ROOM);
            err = this.customException.printError();
            return {err};
        }
        return {err};
    }

    private updateBannedUsersForRoom = async (room: RoomPopulatedUsers, bannedUsersFromRoom: Schema.Types.ObjectId[]): Promise<{ err: string }> => {
        let err = '';
        Logger.debug(`rooms-service: updateBannedUsersForRoom(): called for room= ${room.name} and new banned users array = ${bannedUsersFromRoom}`);

        try {
            await RoomModel.findOneAndUpdate({name: room.name}, {'bannedUsersFromRoom': bannedUsersFromRoom});
        } catch (e) {
            Logger.warn(`rooms-service: updateBannedUsersForRoom(): Failed updating the room's banned users list with error = ${e.message}`);
            this.customException = ExceptionFactory.createException(CustomExceptionType.PROBLEM_UPDATING_ROOMS_BANNED_USERS);
            err = this.customException.printError();
            return {err};
        }
        return {err};
    }
}

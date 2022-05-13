import {Room} from "../interfaces/room";
import {User} from "../interfaces/user";
import {Room as RoomModel} from "../db/models/room";
import {Message} from "../interfaces/message";
import {RoomPopulatedUsers} from "../interfaces/roomPopulatedUsers";
import {Schema} from "mongoose";
import Logger from "../logger/logger";
import Filter from "bad-words";
import {UsersService} from "./users-service";
import {RoomQueryDataMissingException} from "./exceptions/room-related-exceptions/room-query-data-missing-exception";
import {ProfaneLanguageNotAllowedException} from "./exceptions/general-exceptions/profane-language-not-allowed-exception";
import {RoomNameTakenException} from "./exceptions/room-related-exceptions/room-name-taken-exception";
import {ProblemRetrievingDataException} from "./exceptions/general-exceptions/problem-retrieving-data-exception";
import {ProblemUpdatingRoomException} from "./exceptions/room-related-exceptions/problem-updating-room-exception";
import {RoomQueryDataInvalidException} from "./exceptions/room-related-exceptions/room-query-data-invalid";
import {RoomCouldNotBeFoundException} from "./exceptions/room-related-exceptions/room-could-not-be-found-exception";
import {UserBannedFromRoomException} from "./exceptions/user-related-exceptions/user-banned-from-room-exception";
import {UserAlreadyInRoomException} from "./exceptions/user-related-exceptions/user-already-in-room-exception";
import {ProblemAddingUserToRoomException} from "./exceptions/room-related-exceptions/problem-adding-user-to-room-exception";
import {UserNotInRoomException} from "./exceptions/user-related-exceptions/user-not-in-room-exception";
import {ProblemUpdatingRoomBannedUsersException} from "./exceptions/room-related-exceptions/problem-updating-room-banned-users-exception";
import {ProblemSavingRoomChatHistoryException} from "./exceptions/room-related-exceptions/problem-saving-room-chat-history-exception";

export class RoomsService {
    private static instance: RoomsService;
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
    createRoom = async (currentUser: User, newRoom: Room): Promise<{ roomName: string }> => {

        // check if all data provided and is valid for newRoom
        if (newRoom.name === '' || newRoom.description === '' || newRoom.description.length < 10) {
            Logger.warn(`RoomsService: Create Room: Room query data missing for room with name: ${newRoom.name}.`);

            throw new RoomQueryDataMissingException();
        }

        // catch profane language in new room query
        const badWordsFilter = new Filter();

        if (badWordsFilter.isProfane(newRoom.name) || badWordsFilter.isProfane(newRoom.description)) {
            throw new ProfaneLanguageNotAllowedException();
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

                throw new RoomNameTakenException();
            }
        }
        return {roomName: newRoom.name};
    }

    // edit existing room
    editRoom = async (editedRoom: Room, foundRoom: Room) => {
        // catch profane language in edit room query
        const badWordsFilter = new Filter();

        if (badWordsFilter.isProfane(editedRoom.name) || badWordsFilter.isProfane(editedRoom.description)) {
            throw new ProfaneLanguageNotAllowedException();
        }

        // try to update the room in the DB
        try {
            await RoomModel.findByIdAndUpdate(foundRoom._id, {
                name: editedRoom.name,
                description: editedRoom.description
            });
        } catch (e) {
            Logger.warn(`RoomsService: Edit Room: There was a problem updating the room ${foundRoom.name}.`);
            throw new ProblemUpdatingRoomException();
        }
    }

    // delete existing room
    deleteRoom = async (roomId: Schema.Types.ObjectId) => {
        try {
            await RoomModel.findByIdAndDelete(roomId);
        } catch (e) {
            Logger.warn(`RoomsService: Delete Room: There was a problem deleting the room ${roomId}.`);
            throw new ProblemRetrievingDataException()
        }
        Logger.debug(`RoomsService: Delete Room: Successfully deleted the room with id= ${roomId}.`);
    }

    // return a specific room
    fetchRoom = async (roomName: string): Promise<{ room: RoomPopulatedUsers }> => {
        let foundRoom;
        // check if valid roomName
        if (!roomName || roomName === '') {
            // get customException type from exceptionFactory
            Logger.warn(`RoomsService: Fetch Room: Invalid room query for room name ${roomName}.`);
            new RoomQueryDataInvalidException();
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
            throw new ProblemRetrievingDataException();
        }

        // check if room exists
        if (!foundRoom) {
            Logger.warn(`RoomsService: Fetch Room: no room found for room name ${roomName}.`);
            // get customException type from exceptionFactory
            throw new RoomCouldNotBeFoundException();
        }

        Logger.debug(`RoomsService: Fetch Room: found room ${foundRoom?.name}.`);

        return {room: foundRoom};
    }

    // return all current rooms
    fetchAllRooms = async (): Promise<{ allRooms: Room[] }> => {
        let allRooms;
        // try to fetch all the rooms from the DB
        try {
            allRooms = await RoomModel.find();
        } catch (e) {
            Logger.warn(`RoomsService: fetchAllRooms(): Problem retrieving all rooms with error: ${e.message}.`);
            throw new ProblemRetrievingDataException();
        }
        Logger.debug(`RoomsService: fetchAllRooms(): Successfully fetched all rooms from DB, returning rooms array.`);
        return {allRooms};
    }

    // return all rooms created by a specific user
    fetchAllUserRooms = async (currentUser: User): Promise<{ allUserRooms: Room[] }> => {
        let allUserRooms: Room[];

        try {
            // retrieve only specific fields
            allUserRooms = await RoomModel.find({author: currentUser._id},).select('_id name description author createdAt');
        } catch (e) {
            Logger.warn(`RoomsService: Fetch All Room: Problem retrieving all user specific rooms with error: ${e.message}.`);
            throw new ProblemRetrievingDataException();
        }
        Logger.debug(`RoomsService: Fetch All Room: Retrieved all user rooms successfully, returning allUserRooms array.`);
        return {allUserRooms}
    }

    // join a room
    joinRoom = async (currentUser: User, roomName: string) => {

        Logger.debug(`RoomsService: Join Room: Called fetchRoom().`);
        const {room} = await this.fetchRoom(roomName);

        // fetch banned users list
        const bannedUsers: Schema.Types.ObjectId[] = room.bannedUsersFromRoom;
        // check if bannedUsers array exists for room
        if (bannedUsers && bannedUsers.length > 0) {
            // check if user is banned from room
            const foundBannedUser = bannedUsers.find((userId: Schema.Types.ObjectId) => String(currentUser._id) === String(userId));
            // if found user inside bannedUsers array return err
            if (foundBannedUser) {
                Logger.warn(`rooms-service: joinRoom(): User name = ${currentUser.name} is banned from the room = ${room.name}`);
                throw new UserBannedFromRoomException();
            }
        }

        // get currentUsersArray
        const usersInRoom: User[] = room.usersInRoom;

        Logger.debug(`rooms-service: joinRoom(): CurrentUsers in room array: ${usersInRoom ? usersInRoom : '0'}.`);

        // check if the user is in the current room
        const {userIsInRoom} = this.checkIfUserIsInRoom(usersInRoom, currentUser.id, roomName);
        Logger.warn(`rooms-service: joinRoom(): checkIfUserIsInRoom() returned usersIsInRoom = ${userIsInRoom}`);

        if (userIsInRoom) {
            throw new UserAlreadyInRoomException();
        }

        // @ts-ignore actually want to add only id
        usersInRoom.push(currentUser._id);
        Logger.debug(`RoomsService: JoinRoom: Added user ${currentUser.name} to room array.`);

        await this.updateUsersInRoom(room.name, usersInRoom);
    }

    // leave a room
    leaveRoom = async (userId: Schema.Types.ObjectId | string, room: RoomPopulatedUsers) => {
        let usersInRoom: User[] | undefined;

        // get currentUsersArray
        usersInRoom = room.usersInRoom;

        // userIsInRoom: boolean
        const { userIsInRoom } = this.checkIfUserIsInRoom(usersInRoom, userId, room.name);

        if (!userIsInRoom) {
            throw new UserNotInRoomException();
        }

        // remove user from current room, must convert ObjectID into string because === fails (different references);
        usersInRoom = usersInRoom!.filter((userIdInRoom: any) => String(userIdInRoom._id) !== String(userId));

        Logger.debug(`RoomsService: leaveRoom(): Updated usersInRoom array  ${usersInRoom}.`);

        // if all goes well update room in DB with new usersInRoom array
        await this.updateUsersInRoom(room.name, usersInRoom);
    }

    // kick a certain user from a room
    kickUserFromRoom = async (room: RoomPopulatedUsers, userId: string, currentUser: User) => {

        // check if user is the author/admin of the room
        await UsersService.getInstance().checkUserRoomOwnershipById(room.author, currentUser.id);

        // attempt to remove specific user by userId from room
        await this.leaveRoom(userId, room);
    }

    // ban certain user from a room
    banUserFromRoom = async (room: RoomPopulatedUsers, userId: any, currentUser: User) => {
        // first kick the user from the room
        await this.kickUserFromRoom(room, userId, currentUser);

        // update banned users list of room
        const bannedUsersFromRoom = [...room.bannedUsersFromRoom, userId];

        // update room's state in the DB
        await this.updateBannedUsersForRoom(room, bannedUsersFromRoom);
    }

    removeUserFromAllRooms = async (userId: string) => {
        // fetch All Rooms
        const allRooms: Room[] = await RoomModel.find();

        // check if user was in any room
        allRoomsLoop:
            for (const room of allRooms) {
                // if usersInRoom array exists, check if user is in the room
                if (room.usersInRoom && room.usersInRoom?.length > 0) {
                    // iterate through user ids in room
                    for (const id of room.usersInRoom) {
                        Logger.debug(`users-service: removeUserFromAllRooms(): Comparing user id ${userId} with userID inside room ${String(id)}`);
                        if (String(id) === userId) {
                            // if found in room remove user
                            Logger.debug(`users-service: removeUserFromAllRooms(): User with ${userId} found in room ${room.name}, removing user from room...`);
                            room.usersInRoom = room.usersInRoom?.filter((id) => String(id) !== userId);
                            Logger.debug(`users-service: removeUserFromAllRooms(): The updated usersInRoom array is ${[...room.usersInRoom]}`);
                            // update list in db
                            await RoomModel.findOneAndUpdate({name: room.name}, {'usersInRoom': room.usersInRoom});
                            // break parent loop
                            break allRoomsLoop;
                        }
                    }
                }
            }
    }

    // edit chat history of certainRoom with new message and returned newly saved message in room
    saveChatHistory = async (room: RoomPopulatedUsers, chatMessage: Message): Promise<{ savedChatMessage: Message | undefined }> => {
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
                throw new ProblemRetrievingDataException();
            }
        } catch (err) {
            Logger.debug(`RoomsService: SaveChatHistory: Failed to find and update chat history for room name ${room.name}`);
            throw new ProblemSavingRoomChatHistoryException();
        }

        return {savedChatMessage: newlySavedMessage};
    }

    // helper method that checks if a user is in a room and if the room has any users in it
    checkIfUserIsInRoom = (usersInRoom: User[], userId: Schema.Types.ObjectId | string, roomName: string): { userIsInRoom: boolean } => {
        let userIsInRoom = false;

        if (usersInRoom && usersInRoom.length > 0) {
            // compare by userId, id values must be of type string because ObjectID === fails (different references)
            const foundUser = usersInRoom.find((user: User) => String(user._id) === String(userId));
            // if no user found in room return false
            if (!foundUser) {
                Logger.debug(`RoomsService: checkIfUserIsInRoom(): No user was found in the room= ${roomName} with the userId=  ${userId}.`);

                userIsInRoom = false;
                return {userIsInRoom}
            } else {
                Logger.debug(`RoomsService: checkIfUserIsInRoom(): User name=  ${foundUser?.name} is definitely in the room= ${roomName}.`);
                // user was found return true
                userIsInRoom = true;
                return {userIsInRoom}
            }
        } else {
            Logger.debug(`RoomsService: checkIfUserIsInRoom(): The room= ${roomName} has no users in it.`);
            // there are no users in the room so the user can't be in it
            return {userIsInRoom};
        }
    }

    //helper method that checks if a provided name is already in use
    checkIfRoomNameExists = async (name: string, roomToEditID: Schema.Types.ObjectId) => {

        let foundRoom: Room | null = null;

        //search for room with given room name
        try {
            foundRoom = await RoomModel.findOne({name: name, _id: {$ne: roomToEditID}});
        } catch (e) {
            // ts compiler error if no type assertion here
            if (e instanceof Error) {
                Logger.warn(`RoomsService: checkIfRoomNameExists: Failed to retrieve room data for room name ${name} with error message: ${e.message}`);

                throw new ProblemRetrievingDataException();
            }
        }

        Logger.debug(`RoomsService: checkIfRoomNameExists: foundRoom =  ${foundRoom}`);

        // check if room was found
        if (foundRoom) {
            throw new RoomNameTakenException();
        }
    }

    // helper method that updates users in specified room
    private updateUsersInRoom = async (roomName: string, usersInRoom: User[]) => {
        try {
            await RoomModel.findOneAndUpdate({name: roomName}, {'usersInRoom': usersInRoom});
            Logger.debug(`rooms-service: updateUsersInRoom(): Saved the updated users list for room with name ${roomName} to the DB.`);
        } catch (e) {
            Logger.warn(`rooms-service: updateUsersInRoom(): Failed to find and update users list for room with name ${roomName}. Fail message ${e.message}`);
            throw new ProblemAddingUserToRoomException();
        }
    }

    private updateBannedUsersForRoom = async (room: RoomPopulatedUsers, bannedUsersFromRoom: Schema.Types.ObjectId[]) => {
        Logger.debug(`rooms-service: updateBannedUsersForRoom(): called for room= ${room.name} and new banned users array = ${bannedUsersFromRoom}`);

        try {
            await RoomModel.findOneAndUpdate({name: room.name}, {'bannedUsersFromRoom': bannedUsersFromRoom});
        } catch (e) {
            Logger.warn(`rooms-service: updateBannedUsersForRoom(): Failed updating the room's banned users list with error = ${e.message}`);
            throw new ProblemUpdatingRoomBannedUsersException();
        }
    }
}

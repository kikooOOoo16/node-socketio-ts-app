import {Schema} from "mongoose";
import Logger from "../../logger/logger";
import {Room as RoomModel} from "../../db/models/room";

import {Room} from "../../interfaces/room";
import {User} from "../../interfaces/user";
import {Message} from "../../interfaces/message";
import {RoomPopulatedUsers} from "../../interfaces/roomPopulatedUsers";
import {RoomQueryDataMissingException} from "../../chat/exceptions/room-related-exceptions/room-query-data-missing-exception";
import {RoomNameTakenException} from "../../chat/exceptions/room-related-exceptions/room-name-taken-exception";
import {ProblemRetrievingDataException} from "../../chat/exceptions/general-exceptions/problem-retrieving-data-exception";
import {ProblemUpdatingRoomException} from "../../chat/exceptions/room-related-exceptions/problem-updating-room-exception";
import {RoomQueryDataInvalidException} from "../../chat/exceptions/room-related-exceptions/room-query-data-invalid";
import {RoomCouldNotBeFoundException} from "../../chat/exceptions/room-related-exceptions/room-could-not-be-found-exception";
import {ProblemSavingRoomChatHistoryException} from "../../chat/exceptions/room-related-exceptions/problem-saving-room-chat-history-exception";
import {ProblemDeletingRoomException} from "../../chat/exceptions/room-related-exceptions/problem-deleting-room-exception";
import {ProfaneWordsFilter} from "../../chat/profane-words-filter";

export class RoomsService {
    private static instance: RoomsService;
    private profaneWordsFilter: ProfaneWordsFilter;
    readonly ALREADY_CREATED = 'E11000';

    private constructor() {
        this.profaneWordsFilter = new ProfaneWordsFilter();
    }

    public static getInstance(): RoomsService {
        if (!RoomsService.instance) {
            RoomsService.instance = new RoomsService();
        }
        return RoomsService.instance;
    }

    // Create new room
    async createRoom(currentUser: User, newRoom: Room): Promise<{ roomName: string }> {

        // check if all data provided and is valid for newRoom
        if (newRoom.name === '' || newRoom.description === '' || newRoom.description.length < 10) {
            Logger.warn(`RoomsService: Create Room: Room query data missing for room with name: ${newRoom.name}.`);

            throw new RoomQueryDataMissingException();
        }

        // catch profane language in new room query
        this.profaneWordsFilter.filterArrayOfStrings([newRoom.name, newRoom.description]);

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
    async editRoom(editedRoom: Room, foundRoom: Room) {

        // catch profane language in edit room query
        this.profaneWordsFilter.filterArrayOfStrings([editedRoom.name, editedRoom.description]);

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
    async deleteRoom(roomId: Schema.Types.ObjectId) {
        try {
            await RoomModel.findByIdAndDelete(roomId);
        } catch (e) {
            Logger.warn(`RoomsService: Delete Room: There was a problem deleting the room ${roomId}.`);
            throw new ProblemDeletingRoomException();
        }
        Logger.debug(`RoomsService: Delete Room: Successfully deleted the room with id= ${roomId}.`);
    }

    // return a specific room
    async fetchRoom(roomName: string): Promise<{ room: RoomPopulatedUsers }> {
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

        Logger.debug(`RoomsService: Fetch Room: found room ${foundRoom.name}.`);
        return {room: foundRoom};
    }

    // return all current rooms
    async fetchAllRooms(): Promise<{ allRooms: Room[] }> {
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
    async fetchAllUserRooms(currentUser: User): Promise<{ allUserRooms: Room[] }> {
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

    // edit chat history of certainRoom with new message and returned newly saved message in room
    async saveChatHistory(room: RoomPopulatedUsers, chatMessage: Message): Promise<{ savedChatMessage: Message | undefined }> {
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

    //helper method that checks if a provided name is already in use
    async checkIfRoomNameExists(name: string, roomToEditID: Schema.Types.ObjectId) {

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
}

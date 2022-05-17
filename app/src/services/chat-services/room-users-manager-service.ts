import {Schema} from "mongoose";
import Logger from "../../logger/logger";
import {User} from "../../interfaces/user";
import {RoomPopulatedUsers} from "../../interfaces/roomPopulatedUsers";
import {Room} from "../../interfaces/room";
import {Room as RoomModel} from "../../db/models/room";

import {UsersService} from "./users-service";
import {RoomsService} from "./rooms-service";
import {UserBannedFromRoomException} from "../../chat/exceptions/user-related-exceptions/user-banned-from-room-exception";
import {UserAlreadyInRoomException} from "../../chat/exceptions/user-related-exceptions/user-already-in-room-exception";
import {UserNotInRoomException} from "../../chat/exceptions/user-related-exceptions/user-not-in-room-exception";
import {ProblemUpdatingRoomBannedUsersException} from "../../chat/exceptions/room-related-exceptions/problem-updating-room-banned-users-exception";
import {ProblemAddingUserToRoomException} from "../../chat/exceptions/room-related-exceptions/problem-adding-user-to-room-exception";
import {ServiceFactory} from "../service-factory";
import {ServiceTypes} from "../service-types";

export class RoomUsersManagerService {
    private static instance: RoomUsersManagerService;

    private constructor() {
    }

    public static getInstance(): RoomUsersManagerService {
        if (!RoomUsersManagerService.instance) {
            RoomUsersManagerService.instance = new RoomUsersManagerService();
        }
        return RoomUsersManagerService.instance;
    }

    async joinRoom(currentUser: User, roomName: string) {
        const roomsService: RoomsService = ServiceFactory.createService(ServiceTypes.ROOMS_SERVICE)

        const {room} = await roomsService.fetchRoomPopulateUsers(roomName);

        const bannedUsers: Schema.Types.ObjectId[] = room.bannedUsersFromRoom;

        if (bannedUsers && bannedUsers.length > 0) {
            // check if user is banned from room
            const foundBannedUser = bannedUsers.find((userId: Schema.Types.ObjectId) => String(currentUser._id) === String(userId));

            if (foundBannedUser) {
                Logger.warn(`rooms-service: joinRoom(): User name = ${currentUser.name} is banned from the room = ${room.name}`);
                throw new UserBannedFromRoomException();
            }
        }
        // get currentUsersArray
        const usersInRoom: User[] = room.usersInRoom;

        Logger.debug(`rooms-service: joinRoom(): CurrentUsers in room array: ${usersInRoom ? usersInRoom : '0'}.`);

        // check if the user is in the current room
        const {userIsInRoom} = this.checkIfUserIsInRoom(usersInRoom, currentUser._id, roomName);
        Logger.warn(`rooms-service: joinRoom(): checkIfUserIsInRoom() returned usersIsInRoom = ${userIsInRoom}`);

        if (userIsInRoom) {
            throw new UserAlreadyInRoomException();
        }

        // @ts-ignore actually want to add only id
        usersInRoom.push(currentUser._id);
        Logger.debug(`RoomsService: JoinRoom: Added user ${currentUser.name} to room array.`);

        await this.updateUsersInRoom(room.name, usersInRoom);
    }

    async leaveRoom(userId: Schema.Types.ObjectId | string, room: RoomPopulatedUsers) {
        let usersInRoom: User[] | undefined;

        // get currentUsersArray
        usersInRoom = room.usersInRoom;

        // userIsInRoom: boolean
        const { userIsInRoom } = this.checkIfUserIsInRoom(usersInRoom, userId, room.name);

        if (!userIsInRoom) {
            throw new UserNotInRoomException();
        }

        // remove user from current room, must convert ObjectID into string because === fails (different references);
        usersInRoom = usersInRoom.filter((userIdInRoom: { _id: Schema.Types.ObjectId }) => String(userIdInRoom._id) !== String(userId));

        Logger.debug(`RoomsService: leaveRoom(): Updated usersInRoom array  ${usersInRoom}.`);

        await this.updateUsersInRoom(room.name, usersInRoom);
    }

    async kickUserFromRoom(room: RoomPopulatedUsers, userId: string, currentUser: User) {
        const usersService: UsersService = ServiceFactory.createService(ServiceTypes.USERS_SERVICE);
        // check if user that initiated kick is the author/admin of the room
        await usersService.checkUserRoomOwnershipById(room.author, currentUser._id);

        await this.leaveRoom(userId, room);
    }

    async banUserFromRoom(room: RoomPopulatedUsers, userId: any, currentUser: User) {
        // first kick the user from the room
        await this.kickUserFromRoom(room, userId, currentUser);

        // update banned users list of room
        const bannedUsersFromRoom = [...room.bannedUsersFromRoom, userId];

        await this.updateBannedUsersForRoom(room, bannedUsersFromRoom);
    }

    async removeUserFromAllRooms(userId: string) {
        const allRooms: Room[] = await RoomModel.find();

        // check if user was in any room
        allRoomsLoop:
            for (const room of allRooms) {

                if (room.usersInRoom && room.usersInRoom.length > 0) {
                    for (const id of room.usersInRoom) {

                        if (String(id) === userId) {
                            Logger.debug(`users-service: removeUserFromAllRooms(): User with ${userId} found in room ${room.name}, removing user from room...`);
                            room.usersInRoom = room.usersInRoom.filter((id) => String(id) !== userId);
                            // update list in db
                            await RoomModel.findOneAndUpdate({name: room.name}, {'usersInRoom': room.usersInRoom});
                            // break parent loop
                            break allRoomsLoop;
                        }
                    }
                }
            }
    }

    // helper method that checks if a user is in a room and if the room has any users in it
    checkIfUserIsInRoom(usersInRoom: User[], userId: Schema.Types.ObjectId | string, roomName: string): { userIsInRoom: boolean } {
        let userIsInRoom = false;

        if (usersInRoom && usersInRoom.length > 0) {
            // compare by userId, id values must be of type string because ObjectID === fails (different references)
            const foundUser = usersInRoom.find((user: User) => String(user._id) === String(userId));

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

    private updateBannedUsersForRoom = async (room: RoomPopulatedUsers, bannedUsersFromRoom: Schema.Types.ObjectId[]) => {
        Logger.debug(`rooms-service: updateBannedUsersForRoom(): called for room= ${room.name} and new banned users array = ${bannedUsersFromRoom}`);

        try {
            await RoomModel.findOneAndUpdate({name: room.name}, {'bannedUsersFromRoom': bannedUsersFromRoom});
        } catch (e) {
            Logger.warn(`rooms-service: updateBannedUsersForRoom(): Failed updating the room's banned users list with error = ${e.message}`);
            throw new ProblemUpdatingRoomBannedUsersException();
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
}
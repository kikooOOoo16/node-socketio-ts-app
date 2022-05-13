import * as jwt from "jsonwebtoken";
import {UserTokenPayload} from "../interfaces/userTokenPayload";
import {RoomPopulatedUsers} from "../interfaces/roomPopulatedUsers";
import {User} from "../interfaces/user";
import {Room} from "../interfaces/room";
import {Message} from "../interfaces/message";
import {User as UserModel} from "../db/models/user";
import {Room as RoomModel} from "../db/models/room";
import {Schema} from "mongoose";
import Logger from "../logger/logger";
import {ExpiredUserTokenException} from "./exceptions/user-related-exceptions/expired-user-token-exception";
import {UnauthorizedActionException} from "./exceptions/user-related-exceptions/unauthorized-action-exception";
import {RoomCouldNotBeFoundException} from "./exceptions/room-related-exceptions/room-could-not-be-found-exception";
import {UnauthorizedActionNotRoomAuthorException} from "./exceptions/user-related-exceptions/unauthorized-action-not-room-author-exception";
import {ProblemUpdatingRoomException} from "./exceptions/room-related-exceptions/problem-updating-room-exception";
import {ProblemSavingUserSocketIdException} from "./exceptions/user-related-exceptions/problem-saving-user-socket-id-exception";

export class UsersService {
    private static instance: UsersService;

    private constructor() {
    }

    public static getInstance(): UsersService {
        if (!UsersService.instance) {
            UsersService.instance = new UsersService();
        }
        return UsersService.instance;
    }

    saveUsersSocketID = async (userId: string, socketId: string) => {
        Logger.debug(`users-service: saveUsersSocketID: triggered for userId = ${userId} and socketID = ${socketId}`);

        try {
            // update user in DB with new socketId
            await UserModel.findByIdAndUpdate(userId, {socketId: socketId});
        } catch (e) {
            // handle error
            Logger.error(`users-service: saveUsersSocketID: failed saving user's socket id with err ${e.message}`);
            throw new ProblemSavingUserSocketIdException();
        }
    }

    removeUsersSocketID = async (userId: string, socketId: string) => {
        Logger.debug(`users-service: removeUsersSocketID: triggered for userId = ${userId} and socketID = ${socketId}`);

        try {
            // update user in DB with new socketId
            await UserModel.findByIdAndUpdate(userId, {socketId: null});
        } catch (e) {
            // handle error
            Logger.error(`users-service: saveUsersSocketID: failed saving user's socket id with err ${e.message}`);
            throw new ProblemSavingUserSocketIdException();
        }
    }

    fetchUserById = async (userId: Schema.Types.ObjectId | string): Promise<{ user: User }> => {
        // find user by using the _id from the token
        const user: User | null = await UserModel.findById(userId);
        // check if currentUser was found
        if (!user) {
            Logger.warn(`Couldn't find user in db with provided userId= ${userId}`);
            throw new UnauthorizedActionException();
        }
        Logger.debug(`users-service: fetchUserById: Successfully fetcher user data for user name= ${user.name}`);
        return {user};
    }

    verifyUserTokenFetchUser = async (token: string): Promise<{ currentUser: User }> => {
        let decodedToken;

        try {
            // check user auth with token in request
            decodedToken = (jwt.verify(token, process.env.JWT_SECRET)) as UserTokenPayload;
        } catch (e) {
            if (e instanceof Error) {

                Logger.warn(`UsersService: verifyUserToken: Token verify failed with err: ${e.message}.`);

                if (e.name === 'TokenExpiredError') {
                    // remove user if he is inside a chat room
                    const payload = jwt.verify(token, process.env.JWT_SECRET, {ignoreExpiration: true}) as UserTokenPayload;

                    Logger.debug('UsersService: verifyUserToken: Token expired, removeUserFromAllRooms() triggered.');
                    await this.removeUserFromAllRooms(payload._id);

                    throw new ExpiredUserTokenException();
                }
            }

            // if token hasn't expired then no token provided, send general unauthorized action error
            throw new UnauthorizedActionException();
        }

        const {user: currentUser} = await this.fetchUserById(decodedToken._id);

        Logger.debug(`users-service: verifyUserTokenFetchUser: Successfully verified token, and returning user name = ${currentUser!.name}`);

        return {currentUser};
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

    checkUserRoomOwnershipById = async (roomAuthorId: Schema.Types.ObjectId, userId: Schema.Types.ObjectId | string) => {
        // check if current user is the author/admin of the room
        if (String(roomAuthorId) !== String(userId)) {
            Logger.warn(`users-service: checkUserRoomOwnershipById(): Unauthorized action err: The currentUser ${String(userId)} is not the room's author = ${String(roomAuthorId)}`)
            throw new UnauthorizedActionNotRoomAuthorException();
        }
        Logger.debug(`users-service: checkUserRoomOwnershipById(): Passed, the currentUser ${String(userId)} is the rooms author = ${String(roomAuthorId)}`);
    }

    checkUserRoomOwnershipFetchRoom = async (_id: Schema.Types.ObjectId | undefined, roomId: string): Promise<{ foundRoom: Room }> => {

        let foundRoom: Room | null = null;

        try {
            foundRoom = await RoomModel.findById(roomId);
        } catch (e) {
            if (e instanceof Error) {
                Logger.error(`users-service: checkUserRoomOwnershipFetchRoom(): failed getting room from DB with message ${e.message} for id = ${roomId}`);
                throw new RoomCouldNotBeFoundException();
            }
        }

        if (!foundRoom) {
            throw new RoomCouldNotBeFoundException();
        }

        // check if request user is the same as room author
        if (String(foundRoom?.author) !== String(_id)) {
            // if is not authenticated return unauthorizedAction err
            throw new UnauthorizedActionException();
        }

        Logger.debug(`users-service: checkUserRoomOwnershipFetchRoom(): Check room ownership passed for room ${foundRoom.name}, returning room obj.`);

        // if all is well return found room and initial err value of ''
        return {foundRoom}
    }

    checkIfMessageBelongsToUser = (editedMessage: Message, userId: string) => {

        if (String(editedMessage.author.id) !== userId) {
            Logger.warn(`users-service: checkIfMessageBelongsToUser(): Edit message failed for userId ${userId} and message author id ${String(editedMessage.author.id)}`);
            throw new UnauthorizedActionException();
        }
        Logger.debug(`users-service: checkIfMessageBelongsToUser(): The user ${userId} is definitely the author of the message ${String(editedMessage.text)}`);
    }

    editUserMessage = async (editedMessage: Message, room: RoomPopulatedUsers): Promise<{ updatedRoom: RoomPopulatedUsers }> => {
        //edit specific message in room's chat history
        for (let i = 0; i < room.chatHistory!.length; i++) {
            if (String(room.chatHistory![i]._id) === String(editedMessage._id)) {
                Logger.warn(`users-service: editUserMessage(): editedMessage condition fulfilled`);
                room.chatHistory![i].text = editedMessage.text;
                room.chatHistory![i].edited = true;
                break;
            }
        }

        Logger.debug(`users-service: editUserMessage(): Room with edited chat history = ${room}`);

        try {
            // update room chatHistory for selected room, new flag required to return room after update was applied
            const updatedRoom: RoomPopulatedUsers | null = await RoomModel.findOneAndUpdate({name: room.name}, {'chatHistory': room.chatHistory}, {new: true})
                .populate<{ usersInRoom: User[] }>({
                    path: 'usersInRoom',
                    select: '_id name email'
                });
            // if updateRoom was successful return updatedRoom
            if (updatedRoom !== null) {
                Logger.debug(`users-service: editUserMessage(): Saved updatedRoom to DB.`);
                return {updatedRoom};
                // else updatedRoom is null so update failed return error
            } else {
                Logger.warn(`users-service: editUserMessage(): Problem updating room's chat history. Update result updateRoom = ${updatedRoom}, possible that the required room name= ${room.name} was not found.`);
                throw new ProblemUpdatingRoomException();
            }
        } catch (e) {
            Logger.warn(`users-service: editUserMessage(): Problem updating room's chat history. Err message = ${e.message}`);
            throw new ProblemUpdatingRoomException();
        }
    }
}

import * as jwt from "jsonwebtoken";
import {UserTokenPayload} from "../interfaces/userTokenPayload";
import {RoomPopulatedUsers} from "../interfaces/roomPopulatedUsers";
import {User} from "../interfaces/user";
import {Room} from "../interfaces/room";
import {Message} from "../interfaces/message";
import {User as UserModel} from "../db/models/user";
import {Room as RoomModel} from "../db/models/room";
import {CustomExceptionType} from "./exceptions/custom-exception-type";
import {CustomException} from "./exceptions/custom-exception";
import {ExceptionFactory} from "./exceptions/exception-factory";
import {Schema} from "mongoose";
import Logger from "../logger/logger";

export class UsersService {
    private static instance: UsersService;
    private customException!: CustomException;

    private constructor() {
    }

    public static getInstance(): UsersService {
        if (!UsersService.instance) {
            UsersService.instance = new UsersService();
        }
        return UsersService.instance;
    }

    saveUsersSocketID = async (userId: string, socketId: string): Promise<{ err: string }> => {
        let err = '';
        Logger.debug(`users-service: saveUsersSocketID: triggered for userId = ${userId} and socketID = ${socketId}`);

        try {
            // update user in DB with new socketId
            await UserModel.findByIdAndUpdate(userId, {socketId: socketId});
        } catch (e) {
            // handle error
            Logger.error(`users-service: saveUsersSocketID: failed saving user's socket id with err ${e.message}`);
            this.customException = ExceptionFactory.createException(CustomExceptionType.PROBLEM_SAVING_USER_SOCKET_ID);
            err = this.customException.printError();
            return {err};
        }
        return {err};
    }

    removeUsersSocketID = async (userId: string, socketId: string): Promise<{ err: string }> => {
        let err = '';
        Logger.debug(`users-service: removeUsersSocketID: triggered for userId = ${userId} and socketID = ${socketId}`);

        try {
            // update user in DB with new socketId
            await UserModel.findByIdAndUpdate(userId, {socketId: null});
        } catch (e) {
            // handle error
            Logger.error(`users-service: saveUsersSocketID: failed saving user's socket id with err ${e.message}`);
            this.customException = ExceptionFactory.createException(CustomExceptionType.PROBLEM_SAVING_USER_SOCKET_ID);
            err = this.customException.printError();
            return {err};
        }

        return {err};
    }

    fetchUserById = async (userId: Schema.Types.ObjectId | string): Promise<{ err: string, user: User | undefined }> => {
        let err = '';

        // find user by using the _id from the token
        const user: User | null = await UserModel.findById(userId);
        // check if currentUser was found
        if (!user) {
            Logger.warn(`Couldn't find user in db with provided userId= ${userId}`);
            // get customException type from exceptionFactory and return unauthorizedAction error
            this.customException = ExceptionFactory.createException(CustomExceptionType.UNAUTHORIZED_ACTION);
            err = this.customException.printError();
            return {err, user: undefined};
        }

        Logger.debug(`users-service: fetchUserById: Successfully fetcher user data for user name= ${user.name}`);
        return {err, user};
    }

    verifyUserTokenFetchUser = async (token: string): Promise<{ currentUser: User | undefined, err: string }> => {
        let err = '';
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

                    // return token expired error
                    this.customException = ExceptionFactory.createException(CustomExceptionType.EXPIRED_USER_TOKEN);
                    err = this.customException.printError();

                    return {currentUser: undefined, err};
                }
            }

            // if token hasn't expired then no token provided, send general unauthorized action error
            this.customException = ExceptionFactory.createException(CustomExceptionType.UNAUTHORIZED_ACTION);
            err = this.customException.printError();
            return {currentUser: undefined, err};
        }

        const {err: fetchUserErr, user: currentUser} = await this.fetchUserById(decodedToken._id);

        if (fetchUserErr !== '') {
            err = fetchUserErr;
            return {currentUser: undefined, err};
        }

        Logger.debug(`users-service: verifyUserTokenFetchUser: Successfully verified token, and returning user name = ${currentUser!.name}`);

        return {currentUser, err: err};
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

    checkIfUserInRoom = (currentUser: User, room: RoomPopulatedUsers) => {
        let userInRoom = false;
        let isUserInRoomErr = '';
        // check if there are any users in room
        if (!room.usersInRoom || room.usersInRoom.length === 0) {
            this.customException = ExceptionFactory.createException(CustomExceptionType.USER_NOT_IN_ROOM);
            isUserInRoomErr = this.customException.printError();
            return {isUserInRoomErr};
        }
        for (const user of room.usersInRoom) {
            if (String(currentUser._id) === String(user._id)) {
                // if user in room set userInRoom to true and break loop
                userInRoom = true;
                break;
            }
        }

        // check if user was found or not
        if (!userInRoom) {
            this.customException = ExceptionFactory.createException(CustomExceptionType.USER_NOT_IN_ROOM);
            isUserInRoomErr = this.customException.printError();
        }

        // return err string
        return {isUserInRoomErr}
    }

    checkUserRoomOwnershipById = async (roomAuthorId: Schema.Types.ObjectId, userId: Schema.Types.ObjectId | string): Promise<{ err: string }> => {
        let err = '';
        // check if current user is the author/admin of the room
        if (String(roomAuthorId) !== String(userId)) {
            Logger.warn(`users-service: checkUserRoomOwnershipById(): Unauthorized action err: The currentUser ${String(userId)} is not the rooms author = ${String(roomAuthorId)}`)
            this.customException = ExceptionFactory.createException(CustomExceptionType.UNAUTHORIZED_ACTION_NOT_ROOM_AUTHOR);
            err = this.customException.printError();
            return {err};
        }
        Logger.debug(`users-service: checkUserRoomOwnershipById(): Passed, the currentUser ${String(userId)} is the rooms author = ${String(roomAuthorId)}`);
        return {err}
    }

    checkUserRoomOwnershipFetchRoom = async (_id: Schema.Types.ObjectId | undefined, roomId: string): Promise<{ err: string, foundRoom: Room | undefined }> => {
        let err = '';
        let foundRoom: Room | null = null;

        try {
            foundRoom = await RoomModel.findById(roomId);
        } catch (e) {
            if (e instanceof Error) {
                err = e.message;
                return {err, foundRoom: undefined};
            }
        }

        if (!foundRoom) {
            this.customException = ExceptionFactory.createException(CustomExceptionType.INVALID_ROOM_QUERY);
            err = this.customException.printError();
            return {err, foundRoom: undefined}
        }

        // check if request user is the same as room author
        if (String(foundRoom?.author) !== String(_id)) {
            // if is not authenticated return unauthorizedAction err
            this.customException = ExceptionFactory.createException(CustomExceptionType.UNAUTHORIZED_ACTION);
            err = this.customException.printError();
            return {err, foundRoom: undefined}
        }

        Logger.debug(`users-service: checkUserRoomOwnershipFetchRoom(): Check room ownership passed for room ${foundRoom.name}, returning room obj.`);

        // if all is well return found room and initial err value of ''
        return {err, foundRoom}
    }

    checkIfMessageBelongsToUser = (editedMessage: Message, userId: string) => {
        let err = '';

        if (String(editedMessage.author.id) !== userId) {
            Logger.warn(`users-service: checkIfMessageBelongsToUser(): Edit message failed for userId ${userId} and message author id ${String(editedMessage.author.id)}`);
            this.customException = ExceptionFactory.createException(CustomExceptionType.UNAUTHORIZED_ACTION);
            err = this.customException.printError();
            return {checkIfMessageBelongsToUserErr: err}
        }
        Logger.debug(`users-service: checkIfMessageBelongsToUser(): The user ${userId} is definitely the author of the message ${String(editedMessage.text)}`);

        return {checkIfMessageBelongsToUserErr: err}
    }

    editUserMessage = async (editedMessage: Message, room: RoomPopulatedUsers): Promise<{ err: string, updatedRoom: RoomPopulatedUsers | undefined }> => {
        let err = '';
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
                return {err, updatedRoom};
                // else updatedRoom is null so update failed return error
            } else {
                Logger.warn(`users-service: editUserMessage(): Problem updating room's chat history. Update result updateRoom = ${updatedRoom}, possible that the required room name= ${room.name} was not found.`);
                this.customException = ExceptionFactory.createException(CustomExceptionType.PROBLEM_UPDATING_ROOM);
                return {err, updatedRoom: undefined}
            }
        } catch (e) {
            Logger.warn(`users-service: editUserMessage(): Problem updating room's chat history. Err message = ${e.message}`);
            this.customException = ExceptionFactory.createException(CustomExceptionType.PROBLEM_UPDATING_ROOM);
            err = this.customException.printError();
            return {err, updatedRoom: undefined}
        }
    }
}

import * as jwt from "jsonwebtoken";
import {UserTokenPayload} from "../interfaces/userTokenPayload";
import {RoomPopulatedUsers} from "../interfaces/roomPopulatedUsers";
import {User} from "../interfaces/user";
import {Room} from "../interfaces/room";
import {Message} from "../interfaces/message";
import {User as UserModel} from "../db/models/user";
import {Room as RoomModel} from "../db/models/room";
import {customExceptionType} from "./exceptions/custom-exception-type";
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

    verifyUserTokenFetchUser = async (token: string): Promise<{ currentUser: User | undefined, err: string }> => {
        let verifyUserErr: string = '';
        let decodedToken;
        try {
            // check user auth with token in request
            decodedToken = (jwt.verify(token, process.env.JWT_SECRET)) as UserTokenPayload;
        } catch (err) {
            if (err instanceof Error) {
                // catch token error and return err message
                Logger.warn(`UsersService: verifyUserToken: Token verify failed with err: ${err.message}.`);
                // check if token expired
                if (err.name === 'TokenExpiredError') {
                    // remove user if he is inside a chat room
                    const payload = jwt.verify(token, process.env.JWT_SECRET, {ignoreExpiration: true}) as UserTokenPayload;
                    Logger.debug('UsersService: verifyUserToken: Token expired, removeUserFromAllRooms() triggered.');
                    await this.removeUserFromAllRooms(payload._id);

                    Logger.debug('UsersService: verifyUserToken: Token expired, removeUserExpiredToken() triggered.');
                    // remove token from user obj in DB
                    await this.removeUserExpiredToken(payload._id, token);

                    // return token expired error
                    this.customException = ExceptionFactory.createException(customExceptionType.expiredUserToken);
                    verifyUserErr = this.customException.printError();
                    return {currentUser: undefined, err: verifyUserErr};
                }
            }

            // if token hasn't expired then no token provided, send general unauthorized action error
            this.customException = ExceptionFactory.createException(customExceptionType.unauthorizedAction);
            verifyUserErr = this.customException.printError();
            return {currentUser: undefined, err: verifyUserErr};
        }
        // find user by using the _id from the token
        const currentUser: User | null = await UserModel.findOne({_id: decodedToken._id, 'tokens.token': token});
        // check if currentUser was found
        if (!currentUser) {
            Logger.warn(`Couldn't find user in db with provided token and userId= ${decodedToken._id}`);
            // get customException type from exceptionFactory and return unauthorizedAction error
            this.customException = ExceptionFactory.createException(customExceptionType.unauthorizedAction);
            verifyUserErr = this.customException.printError();
            return {currentUser: undefined, err: verifyUserErr};
        }
        // if all is good return currentUser
        return {currentUser, err: verifyUserErr};
    }

    removeUserFromAllRooms = async (userId: string) => {
        // fetch All Rooms
        const allRooms: Room[] = await RoomModel.find();

        // check if user was in any room
        allRoomsLoop:
            for (const room of allRooms) {
                // if usersInRoom array exists, check if user is in the room
                if (room.usersInRoom && room.usersInRoom!.length > 0) {
                    // iterate through user ids in room
                    for (const id of room.usersInRoom) {
                        Logger.debug(`Comparing user id ${userId} with userID inside room ${String(id)}`);
                        if (String(id) === userId) {
                            // if found in room remove user
                            Logger.debug(`User with ${userId} found in room ${room.name}, removing user from room...`);
                            room.usersInRoom = room.usersInRoom!.filter((id) => String(id) !== userId);
                            Logger.debug(`The updated usersInRoom array is ${[...room.usersInRoom]}`);
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
            this.customException = ExceptionFactory.createException(customExceptionType.userNotInRoom);
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
            this.customException = ExceptionFactory.createException(customExceptionType.userNotInRoom);
            isUserInRoomErr = this.customException.printError();
        }

        // return err string
        return {isUserInRoomErr}
    }

    // this should never fail therefor no returned error needed
    private removeUserExpiredToken = async (_id: string, token: string) => {

        const currentUser: User | null = await UserModel.findById(_id);

        if (!currentUser) {
            Logger.debug(`UsersService: removeUserExpiredToken: no user was found for the id ${_id}`);
            return;
        }

        // filter user tokens that aren't equal to expired token
        currentUser.tokens = currentUser.tokens?.filter((tokenObj: any) => tokenObj.token !== token);

        // save user data without current req token
        await currentUser!.save();
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
            this.customException = ExceptionFactory.createException(customExceptionType.invalidRoomQuery);
            err = this.customException.printError();
            return {err, foundRoom: undefined}
        }

        // check if request user is the same as room author
        if (String(foundRoom?.author) !== String(_id)) {
            // if is not authenticated return unauthorizedAction err
            this.customException = ExceptionFactory.createException(customExceptionType.unauthorizedAction);
            err = this.customException.printError();
            return {err, foundRoom: undefined}
        }

        Logger.debug(`users-service: checkUserRoomOwnershipFetchRoom: Check room ownership passed for room ${foundRoom.name}, returning room obj.`);

        // if all is well return found room and initial err value of ''
        return {err, foundRoom}
    }

    checkIfMessageBelongsToUser = (editedMessage: Message, userId: any) => {
        let err = '';

        if (String(editedMessage.author.id) !== userId) {
            Logger.warn(`users-service: checkIfMessageBelongsToUser: Edit message failed for userId ${userId} and message author id ${String(editedMessage.author.id)}`);
            this.customException = ExceptionFactory.createException(customExceptionType.unauthorizedAction);
            err = this.customException.printError();
            return {checkIfMessageBelongsToUserErr: err}
        }
        Logger.debug(`users-service: checkIfMessageBelongsToUser: The user ${userId} is definitely the author of the message ${String(editedMessage.author)}`);

        return {checkIfMessageBelongsToUserErr: err}
    }

    editUserMessage = async (editedMessage: Message, room: RoomPopulatedUsers): Promise<{ err: string, updatedRoom: RoomPopulatedUsers | undefined }> => {
        let err = '';
        //edit specific message in room's chat history
        for (let i = 0; i < room.chatHistory!.length; i++) {
            if (String(room.chatHistory![i]._id) === String(editedMessage._id)) {
                Logger.warn(`users-service: editUserMessage: editedMessage condition fulfilled`);
                room.chatHistory![i].text = editedMessage.text;
                room.chatHistory![i].edited = true;
                break;
            }
        }

        Logger.debug(`users-service: editUserMessage: Room with edited chat history = ${room}`);

        try {
            // update room chatHistory for selected room, new flag required to return room after update was applied
            const updatedRoom: RoomPopulatedUsers | null = await RoomModel.findOneAndUpdate({name: room.name}, {'chatHistory': room.chatHistory}, {new: true})
                .populate<{ usersInRoom: User[] }>({
                    path: 'usersInRoom',
                    select: '_id name email'
                });
            // if updateRoom was successful return updatedRoom
            if (updatedRoom !== null) {
                Logger.debug(`users-service: editUserMessage: Saved updatedRoom to DB.`);
                return {err, updatedRoom};
                // else updatedRoom is null so update failed return error
            } else {
                Logger.warn(`users-service: editUserMessage: Problem updating room's chat history. Update result updateRoom = ${updatedRoom}, possible that the required room name= ${room.name} was not found.`);
                this.customException = ExceptionFactory.createException(customExceptionType.problemUpdatingRoom);
                return {err, updatedRoom: undefined}
            }
        } catch (e) {
            Logger.warn(`users-service: editUserMessage: Problem updating room's chat history. Err message = ${e.message}`);
            this.customException = ExceptionFactory.createException(customExceptionType.problemUpdatingRoom);
            err = this.customException.printError();
            return {err, updatedRoom: undefined}
        }
    }
}

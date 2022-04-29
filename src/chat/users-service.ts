import * as jwt from "jsonwebtoken";
import {UserTokenPayload} from "../interfaces/userTokenPayload";
import {RoomPopulatedUsers} from "../interfaces/roomPopulatedUsers";
import {User} from "../interfaces/user";
import {Room} from "../interfaces/room";
import {User as UserModel} from "../db/models/user";
import {Room as RoomModel} from "../db/models/room";
import {customExceptionType} from "./exceptions/custom-exception-type";
import {CustomException} from "./exceptions/custom-exception";
import {ExceptionFactory} from "./exceptions/exception-factory";
import {Schema} from "mongoose";

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

    verifyUserToken = async (token: string): Promise<{ currentUser: User | undefined, err: String }> => {
        let err = '';
        let decodedToken;
        try {
            // check user auth with token in request
            decodedToken = (jwt.verify(token, process.env.JWT_SECRET)) as UserTokenPayload;
        } catch (err) {
            // catch token error and return err message
            console.log('VerifyToken: ');
            console.log(err.name);
            // check if token expired
            if (err.name === 'TokenExpiredError') {
                // remove user if he is inside a chat room
                const payload = jwt.verify(token, process.env.JWT_SECRET, {ignoreExpiration: true}) as UserTokenPayload;
                await this.removeUserFromAllRooms(payload._id);

                // remove token from user obj in DB
                await this.removeUserExpiredToken(payload._id, token);

                // return token expired error
                this.customException = ExceptionFactory.createException(customExceptionType.expiredUserToken);
                err = this.customException.printError();
                return {currentUser: undefined, err};
            }
            // if token hasn't expired, send general unauthorized action error
            this.customException = ExceptionFactory.createException(customExceptionType.unauthorizedAction);
            err = this.customException.printError();
            return {currentUser: undefined, err};
        }
        // find user by using the _id from the token
        const currentUser: User | null = await UserModel.findOne({_id: decodedToken._id, 'tokens.token': token});
        // check if currentUser was found
        if (!currentUser) {
            // get customException type from exceptionFactory and return unauthorizedAction error
            this.customException = ExceptionFactory.createException(customExceptionType.unauthorizedAction);
            err = this.customException.printError();
            return {currentUser: undefined, err};
        }
        // if all is good return currentUser
        return {currentUser, err};
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

                        if (String(id) === userId) {
                            // if found in room remove user
                            room.usersInRoom = room.usersInRoom!.filter((id) => String(id) !== userId);
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
            console.log(`removeUserExpiredToken: no user was found for the id ${_id}`);
            return;
        }

        // filter user tokens that aren't equal to expired token
        currentUser.tokens = currentUser.tokens?.filter((tokenObj: any) => tokenObj.token !== token);

        // save user data without current req token
        await currentUser!.save();
    }

    checkUserRoomOwnership = async (_id: Schema.Types.ObjectId | undefined, roomId: string): Promise<{ err: string, foundRoom: Room | undefined }> => {
        let err = '';
        let foundRoom: Room | null;
        // const {room: foundRoom, fetchRoomErr} = await RoomsService.getInstance().fetchRoom(roomName);

        try {
            foundRoom = await RoomModel.findById(roomId);
        } catch (e) {
            err = e.message;
            return {err, foundRoom: undefined};
        }

        if (!foundRoom) {
            this.customException = ExceptionFactory.createException(customExceptionType.invalidRoomQuery);
            err = this.customException.printError();
            return {err, foundRoom: undefined}
        }

        // check if request user is the same as room author
        if (String(foundRoom?.author) !== String(_id)) {
            console.log('checkUserOwnership: ');
            console.log(String(foundRoom?.author) !== String(_id));
            console.log(`checkUserOwnership: String(foundRoom?.author)= ${String(foundRoom?.author)}`);
            console.log(`checkUserOwnership: String(_id)= ${String(_id)}`);

            // if is not authenticated return unauthorizedAction err
            this.customException = ExceptionFactory.createException(customExceptionType.unauthorizedAction);
            err = this.customException.printError();
            return {err, foundRoom: undefined}
        }

        // if all is well return found room and initial err value of ''
        return {err, foundRoom}
    }
}

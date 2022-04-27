import * as jwt from "jsonwebtoken";
import {UserTokenPayload} from "../interfaces/userTokenPayload";
import {User} from "../interfaces/user";
import {Room} from "../interfaces/room";
import {User as UserModel} from "../db/models/user";
import {Room as RoomModel} from "../db/models/room";
import {customExceptionType} from "./exceptions/custom-exception-type";
import {CustomException} from "./exceptions/custom-exception";
import {ExceptionFactory} from "./exceptions/exception-factory";

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
                console.log('UsersService: TypeOff payload.id')
                console.log(typeof payload._id);
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
}

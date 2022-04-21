import * as jwt from "jsonwebtoken";
import {UserTokenPayload} from "../interfaces/userTokenPayload";
import {User} from '../interfaces/user';
import {User as UserModel} from "../db/models/user";

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

    // checkUserAuth = (token: string): User | undefined => {
    //
    //     if (!token) {
    //         return undefined;
    //     }
    //     try {
    //         // cast decodedToken to UserTokenPayload
    //         const decodedToken = (jwt.verify(token, process.env.JWT_SECRET)) as UserTokenPayload;
    //         console.log('CheckUserAuth: ');
    //         console.log(token);
    //         console.log(`Decoded token`);
    //         console.log(decodedToken);
    //         console.log(decodedToken._id);
    //
    //         // find user by using the _id from the token
    //         UserModel.findOne({_id: decodedToken._id, 'tokens.token': token}, (foundUser: User) => {
    //             console.log('Inside find one');
    //             if (foundUser) {
    //                 console.log('CheckUserAuth inside findOne:');
    //                 console.log(foundUser);
    //                 return foundUser;
    //             }
    //             console.log('checkUserAuth: Return Undefined triggered.');
    //             return undefined;
    //         });
    //     } catch (e) {
    //         console.log(`checkUserAuth: error ${e}`);
    //         return undefined;
    //     }
    // }
}
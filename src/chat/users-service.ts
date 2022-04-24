import * as jwt from "jsonwebtoken";
import {UserTokenPayload} from "../interfaces/userTokenPayload";
import {User} from "../interfaces/user";
import {User as UserModel} from "../db/models/user";
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

    verifyUserToken = async (token: string, callback: any): Promise<{ currentUser: User, decodedToken: UserTokenPayload}> => {
        let decodedToken;
        try {
            // check user auth with token in request
            decodedToken = (jwt.verify(token, process.env.JWT_SECRET)) as UserTokenPayload;
        } catch (e) {
            // catch token error
            // get customException type from exceptionFactory
            this.customException = ExceptionFactory.createException(customExceptionType.expiredUserToken);
            return callback(this.customException.printError());
        }
        // find user by using the _id from the token
        const currentUser: User | null = await UserModel.findOne({_id: decodedToken._id, 'tokens.token': token});
        // check if currentUser was found
        if (!currentUser) {
            // get customException type from exceptionFactory and return unauthorizedAction error
            this.customException = ExceptionFactory.createException(customExceptionType.unauthorizedAction);
            return callback(this.customException.printError());
        }
        return ({currentUser, decodedToken});
    }
}
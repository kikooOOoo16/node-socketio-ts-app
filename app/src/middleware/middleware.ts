import Logger from "../logger/logger";
import {NextFunction, Request, Response} from 'express';
import {RoomUsersManagerService} from "../services/chat-services/room-users-manager-service";
import {ServiceFactory} from "../services/service-factory";
import {ServiceTypes} from "../services/service-types";
import {AuthService} from "../services/auth-services/auth-service";
import {UsersService} from "../services/chat-services/users-service";
import {UnauthorizedActionException} from "../chat/exceptions/user-related-exceptions/unauthorized-action-exception";
import {ProblemRetrievingDataException} from "../chat/exceptions/general-exceptions/problem-retrieving-data-exception";
import {AbstractException} from "../chat/exceptions/abstract-exception";
import {ExpiredUserTokenException} from "../chat/exceptions/user-related-exceptions/expired-user-token-exception";

// check authentication middleware
const auth = async (req: Request, res: Response, next: NextFunction) => {
    const roomUsersManagerService: RoomUsersManagerService = ServiceFactory.createService(ServiceTypes.ROOM_USERS_MANAGER_SERVICE);
    const authService: AuthService = ServiceFactory.createService(ServiceTypes.AUTH_SERVICE);
    const usersService: UsersService = ServiceFactory.createService(ServiceTypes.USERS_SERVICE);

    let exceptionMsg = '';
    let token: string;
    if (req.cookies && req.cookies.access_token) {

        token = req.cookies.access_token;

        try {
            const decodedToken =  await authService.verifyJWT(token);
            // find user by using the _id from the token
            const {user} = await usersService.fetchUserById(decodedToken._id);

            if (!user) {
                throw new ProblemRetrievingDataException();
            }

            req.user = user;
            next();

        } catch (err) {
            if (err instanceof AbstractException) {
                Logger.warn(`ExpressMiddleware: Unauthorized action caught. Err= ${err.message}`);

                if (err.name === 'TokenExpiredError') {

                    Logger.warn('ExpressMiddleware: TokenExpiredErr caught, cleanup user state using token from cookie.');

                    exceptionMsg = new ExpiredUserTokenException().message;

                    const payload = authService.getExpiredJWTPayload(token);

                    await roomUsersManagerService.removeUserFromAllRooms(payload._id);
                }
                exceptionMsg = new UnauthorizedActionException().message;
            }
            // return unauthorized response code
            res.status(401).json({
                message: exceptionMsg
            });
        }
    } else {
        // no cookie found, return unauthorized action response code
        res.status(401).json({
            message: 'Unauthorized action.'
        });
    }
}

export {auth}
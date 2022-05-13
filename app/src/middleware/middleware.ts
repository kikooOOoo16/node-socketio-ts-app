import * as jwt from 'jsonwebtoken';
import {NextFunction, Request, Response} from 'express';
import {User} from "../db/models/user";
import {UserTokenPayload} from "../interfaces/userTokenPayload";
import Logger from "../logger/logger";
import {RoomsService} from "../chat/rooms-service";

// check authentication middleware
const auth = async (req: Request, res: Response, next: NextFunction) => {
    let exceptionMsg = '';
    let token: string;
    if (req.cookies && req.cookies.access_token) {
        // retrieve cookie access_token
        token = req.cookies.access_token;
        try {
            // cast decodedToken to UserTokenPayload
            const decodedToken = (jwt.verify(token, process.env.JWT_SECRET)) as UserTokenPayload;
            // find user by using the _id from the token
            const user = await User.findOne({_id: decodedToken._id});
            // check if user was found
            if (!user) {
                throw new Error();
            }
            // save user obj to req
            req.user = user;
            // continue chain
            next();
        } catch (err) {
            if (err instanceof Error) {

                Logger.warn('ExpressMiddleware: Unauthorized action caught.');

                exceptionMsg = 'Unauthorized action.'

                // check if tokenExpiredError thrown and handle cleanup
                if (err.name === 'TokenExpiredError') {

                    Logger.warn('ExpressMiddleware: TokenExpiredErr caught, cleanup user state using token from cookie.');

                    exceptionMsg = 'Token has expired.';

                    const payload = jwt.verify(token, process.env.JWT_SECRET, {ignoreExpiration: true}) as UserTokenPayload;
                    // handle remove user from room
                    await RoomsService.getInstance().removeUserFromAllRooms(payload._id);
                }
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
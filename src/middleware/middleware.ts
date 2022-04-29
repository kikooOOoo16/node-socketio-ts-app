import * as jwt from 'jsonwebtoken';
import {NextFunction, Request, Response} from 'express';
import {User} from "../db/models/user";
import {UserTokenPayload} from "../interfaces/userTokenPayload";
import {UsersService} from "../chat/users-service";

// check authentication middleware
const auth = async (req: Request, res: Response, next: NextFunction) => {
    let token: string;
    try {
        token = req.headers!.authorization!.split(' ')[1];
        // cast decodedToken to UserTokenPayload
        const decodedToken = (jwt.verify(token, process.env.JWT_SECRET)) as UserTokenPayload;
        // find user by using the _id from the token
        const user = await User.findOne({_id: decodedToken._id, 'tokens.token': token});

        if (!user) {
            throw new Error();
        }

        // save token and user obj to req
        req.token = token;
        req.user = user;

        // continue chain
        next();
    } catch (err) {
        let message = 'Error: Unauthorized action!';
        // check if tokenExpiredError thrown and handle cleanup
        if (err.name === 'TokenExpiredError') {
            message = 'Error: User token has expired.';
            // handle remove user from room and remove user's expired token
            await UsersService.getInstance().verifyUserToken(token!);
        }
        res.status(401).json({
            message
        });
    }
}

export {auth}
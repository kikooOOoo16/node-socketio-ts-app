import * as jwt from 'jsonwebtoken';
import {Request, Response, NextFunction} from 'express';
import {User} from "../db/models/user";
import {UserTokenPayload} from "../interfaces/userTokenPayload";

// check authentication middleware
const auth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token: string = req.header('Authorization')?.replace('Bearer', '')!;
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
    } catch (e) {
        res.status(401).json({
            message: 'Unauthorized action!'
        })
    }
}

export {auth}
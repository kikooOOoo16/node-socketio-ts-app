import {Request, Response} from "express";
import {User as UserModel} from "../db/models/user";
import Logger from "../logger/logger";

const signUp = async (req: Request, res: Response) => {
    const ALREADY_CREATED = 'E11000';
    const user = new UserModel(req.body);
    try {
        await user.save();
        // create user token
        const token = await user.generateAuthToken();

        Logger.debug(`Controllers: signUp: New user created: ${user.name}.`);

        // res found user and http only cookie
        res
            .cookie('access_token', token, {
                httpOnly: true,
                maxAge: 10900000,
                secure: process.env.NODE_ENV === 'production'
            })
            .status(201).json({
            message: 'New user created.',
            user,
            expiresIn: 10800
        });
    } catch (err) {
        if (err instanceof Error && err.message.split(' ')[0] === ALREADY_CREATED) {

            Logger.warn(`Controllers: signUp: Problem creating new user for: ${user.name}.`);

            res.status(400).json({
                message: err.message
            });
        }
    }
}

const signIn = async (req: Request, res: Response) => {
    try {
        // find user by credentials
        //@ts-ignore
        const user = await UserModel.findByCredentials(req.body.email, req.body.password);
        // generate auth token for found user
        const token = await user.generateAuthToken();

        Logger.debug(`Controllers: signIn: User signed in: ${user.name}.`);

        // res found user and http only cookie
        res
            .cookie('access_token', token, {
                httpOnly: true,
                maxAge: 10900000,
                secure: process.env.NODE_ENV === 'production'
            })
            .status(200).json({
            user,
            expiresIn: 10800
        });
    } catch ({message}) {

        Logger.warn(`Controllers: signIn: Problem signing in user with err message: ${message}.`);
        res.status(400).json({
            message
        });
    }
}

const logout = async (req: Request, res: Response) => {
    try {
        // clear user cookies
        res.clearCookie('access_token')

        Logger.debug(`Controllers: logout: User logged out: ${req.user?.name}.`);

        res.status(200).json({
            message: 'User logged out.'
        });
    } catch (e) {
        if (e instanceof Error) {
            Logger.warn(`Controllers: logout: Problem logging out user : ${req.user?.name} with err message ${e.message}.`);
        }

        res.status(500).json({
            message: 'Error: User logout failed!'
        });
    }
}

const userProfile = async (req: Request, res: Response) => {
    try {
        Logger.debug(`Controllers: userProfile: User profile retrieved for user: ${req.user?.name}.`);

        res.status(200).json({
            user: req.user
        });
    } catch ({message}) {
        Logger.debug(`Controllers: userProfile: Problem reading user profile for user: ${req.user?.name} with err message ${message}.`);
        res.status(401).json({
            message
        });
    }
}

export {signIn, signUp, logout, userProfile}
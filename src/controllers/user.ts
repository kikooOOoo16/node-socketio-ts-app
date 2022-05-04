import {NextFunction, Request, Response} from "express";
import {User} from "../db/models/user";
import {UserNameTaken} from "../chat/exceptions/user-name-taken";
import Logger from "../logger/logger";

const signUp = async (req: Request, res: Response, next: NextFunction) => {
    const user = new User(req.body);
    try {
        await user.save();
        // create user token
        const token = await user.generateAuthToken();

        Logger.debug(`Controllers: signUp: New user created: ${user.name}.`);

        res.status(201).json({
            message: 'New user created.',
            user,
            token,
            expiresIn: 3600
        });
    } catch ({message}) {
        if (message.split(' ')[0] === 'E11000') {
            message = new UserNameTaken().printError();
        }

        Logger.warn(`Controllers: signUp: Problem creating new user for: ${user.name}.`);

        res.status(400).json({
            message
        });
    }
}

const signIn = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // find user by credentials
        const user = await User.findByCredentials(req.body.email, req.body.password);
        // generate auth token for found user
        const token = await user.generateAuthToken();

        Logger.debug(`Controllers: signIn: User signed in: ${user.name}.`);

        // res found user and token
        res.status(200).json({
            user,
            token,
            expiresIn: 10800
        });
    } catch ({message}) {

        Logger.warn(`Controllers: signIn: Problem signing in user with err message: ${message}.`);

        res.status(400).json({
            message
        });
    }
}

const logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // filter user tokens that aren't equal to req token
        req.user!.tokens = req.user!.tokens!.filter((token: any) => token.token !== req.token);

        // save user data without current req token
        await req.user!.save();

        Logger.debug(`Controllers: logout: User logged out: ${req.user!.name}.`);

        res.status(200).json({
            message: 'User logged out.'
        });
    } catch (e) {

        Logger.warn(`Controllers: logout: Problem logging out user : ${req.user!.name} with err message ${e.message}.`);

        res.status(500).json({
            message: 'Error: User logout failed!'
        });
    }
}

const logoutAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // empty user's tokens array
        req.user!.tokens = [];
        await req.user!.save();

        Logger.debug(`Controllers: logoutAll: User logged out of all sessions: ${req.user!.name}.`);

        res.status(200).json({
            message: 'User logged out from all sessions.'
        });
    } catch (e) {

        Logger.warn(`Controllers: logoutAll: Problem logging out user from all sessions with err message: ${e.message}.`);

        res.status(500).json({
            message: 'Error: User logout failed.'
        });
    }
}

const userProfile = async(req: Request, res: Response, next: NextFunction) => {
    try {
        Logger.debug(`Controllers: userProfile: User profile retrieved for user: ${req.user!.name}.`);

        res.status(200).json({
            user: req.user
        });
    } catch ({message}) {
        Logger.debug(`Controllers: userProfile: Problem reading user profile for user: ${req.user!.name} with err message ${message}.`);
        res.status(401).json({
            message
        });
    }
}

export {signIn, signUp, logout, logoutAll, userProfile}
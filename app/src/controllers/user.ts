import {Request, Response} from "express";
import Logger from "../logger/logger";
import {User as UserModel} from "../db/models/user";
import {ServiceFactory} from "../services/service-factory";
import {ServiceTypes} from "../services/service-types";
import {AbstractException} from "../chat/exceptions/abstract-exception";
import {AuthService} from "../services/auth-services/auth-service";
import {UsersService} from "../services/chat-services/users-service";

export class UserControllers {
    private static instance: UserControllers;

    private constructor() {
    }

    public static getInstance(): UserControllers {
        if (!UserControllers.instance) {
            UserControllers.instance = new UserControllers();
        }
        return UserControllers.instance;
    }

    // handle signUp logic
    async signUp(req: Request, res: Response) {
        const authService: AuthService = ServiceFactory.createService(ServiceTypes.AUTH_SERVICE);
        const ALREADY_CREATED = 'E11000';

        const user = new UserModel(req.body);

        try {
            await user.save();
            // create user token
            const token = await authService.generateAuthToken(String(user._id));
            Logger.debug(`UserControllers: signUp(): New user created: ${user.name}.`);

            // res found user and http only cookie
            res.cookie('access_token', token, {
                httpOnly: true,
                maxAge: 10900000,
                secure: process.env.NODE_ENV === 'production'
            }).status(201).json({
                message: 'New user created.',
                user,
                expiresIn: 10800
            });

        } catch (err) {
            let errMessage = 'Error: An unknown error occurred.';

            if (err instanceof Error && err.message.split(' ')[0] === ALREADY_CREATED) {
                errMessage = UserControllers.parseErrorMessage(err.message);
                Logger.warn(`UserControllers: signUp(): Problem creating new user for: ${user.name} with err ${err.message}.`);
            }

            res.status(400).json({
                message: errMessage
            });
        }
    }

    // handle sign in logic
    async signIn(req: Request, res: Response) {
        const authService: AuthService = ServiceFactory.createService(ServiceTypes.AUTH_SERVICE);
        const usersService: UsersService = ServiceFactory.createService(ServiceTypes.USERS_SERVICE);

        try {
            const {user} = await usersService.fetchUserByEmail(req.body.email);

            await authService.validateUserCredentials(user, req.body.password);

            const token = await authService.generateAuthToken(String(user._id));

            Logger.debug(`UserControllers: signIn(): User signed in: ${user.name}.`);

            res.cookie('access_token', token, {
                httpOnly: true,
                maxAge: 10900000,
                secure: process.env.NODE_ENV === 'production'
            }).status(200).json({
                user,
                expiresIn: 10800
            });

        } catch (e) {
            let message = 'Error: There was a problem authenticating the user.';

            if (e instanceof AbstractException) {
                message = e.serializeErrors()[0].message;
            }

            Logger.warn(`UserControllers: signIn(): Problem signing in user with err message: ${e.message}.`);
            res.status(400).json({
                message
            });
        }
    }

    // handle logout logic
    async logout(req: Request, res: Response) {
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

    // retrieve user profile data
    async userProfile(req: Request, res: Response) {
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

    // parse returned error message depending on whether the name or the email triggered the unique key constraint in the DB
    private static parseErrorMessage(message: string) {
        if ((message.split('{ ')[1]).split(' ')[0] === 'name:') {
            message = 'Error: The username is already taken.';
        } else {
            message = 'Error: The email address is already associated with an account.'
        }
        return message;
    }
}
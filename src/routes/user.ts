import express from 'express';
import {User} from "../db/models/user";
import {auth} from "../middleware/middleware";
import {UserNameTaken} from "../chat/exceptions/user-name-taken";

const router = express.Router();

router // POST new user signup
    .post('/signup', async (req, res, next) => {
        const user = new User(req.body);
        try {
            await user.save();
            // create user token
            const token = await user.generateAuthToken();
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
            res.status(400).json({
                message
            });
        }
    }) // POST sign user in
    .post('/signin', async (req, res, next) => {
        try {
            // find user by credentials
            const user = await User.findByCredentials(req.body.email, req.body.password);
            // generate auth token for found user
            const token = await user.generateAuthToken();

            // res found user and token
            res.status(200).json({
                user,
                token,
                expiresIn: 10800
            });
        } catch ({message}) {
            res.status(400).json({
                message
            });
        }
    }) // POST logout user
    .post('/logout', auth, async (req, res, next) => {
        try {
            // filter user tokens that aren't equal to req token
            req.user!.tokens = req.user!.tokens!.filter((token: any) => token.token !== req.token);

            // save user data without current req token
            await req.user!.save();
            res.status(200).json({
                message: 'User logged out.'
            });
        } catch (e) {
            res.status(500).json({
                message: 'Error: User logout failed!'
            });
        }
    }) // POST log user out of all sessions
    .post('/logoutall', auth, async (req, res, next) => {
        try {
            // empty user's tokens array
            req.user!.tokens = [];
            await req.user!.save();
            res.status(200).json({
                message: 'User logged out from all sessions.'
            });
        } catch (e) {
            res.status(500).json({
                message: 'Error: User logout failed.'
            });
        }
    }) // GET user data
    .get('/user', auth, async(req, res, next) => {
        try {
            res.status(200).json({
                user: req.user
            });
        } catch ({message}) {
            res.status(401).json({
                message
            });
        }
    });

export {router as userRoutes};


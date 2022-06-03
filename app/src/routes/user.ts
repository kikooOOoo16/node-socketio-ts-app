import express from 'express';
import {auth} from "../middleware/middleware";
import {UserControllers} from "../controllers/user";

const router = express.Router();
const userControllers: UserControllers = UserControllers.getInstance();

router // POST new user sign up
    .post('/signup', userControllers.signUp)
    // POST sign user in
    .post('/signin', userControllers.signIn)
    // POST logout user
    .post('/logout', auth, userControllers.logout)
    // GET user data
    .get('/user', auth, userControllers.userProfile);

export {router as userRoutes};
import express from 'express';
import {auth} from "../middleware/middleware";
import {signIn, signUp, logout, logoutAll, userProfile} from "../controllers/user";

const router = express.Router();

router // POST new user signup
    .post('/signup', signUp)
    // POST sign user in
    .post('/signin', signIn)
    // POST logout user
    .post('/logout', auth, logout)
    // POST log user out of all sessions
    .post('/logoutall', auth, logoutAll)
    // GET user data
    .get('/user', auth, userProfile);

export {router as userRoutes};


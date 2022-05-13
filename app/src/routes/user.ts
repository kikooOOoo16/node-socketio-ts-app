import express from 'express';
import {auth} from "../middleware/middleware";
import {signIn, signUp, logout, userProfile} from "../controllers/user";

const router = express.Router();

router // POST new user signup
    .post('/signup', signUp)
    // POST sign user in
    .post('/signin', signIn)
    // POST logout user
    .post('/logout', auth, logout)
    // GET user data
    .get('/user', auth, userProfile);

export {router as userRoutes};
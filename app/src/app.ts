import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser'
import {userRoutes} from './routes/user';

// just import and run the file
import './db/mongoose';

export const app = express();

// setup body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

// parse incoming JSON
app.use(express.json());

// parse cookie data between server and client
app.use(cookieParser())

// Allow CORS communication
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', process.env.NG_APP_URL);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PATCH, PUT, DELETE, OPTIONS'
    );
    next();
});

// define app routes
app.use('/user', userRoutes);

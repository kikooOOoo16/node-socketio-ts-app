import express, {Request, Response} from 'express';
import bodyParser from 'body-parser';

export const app = express();

// setup body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

// Allow CORS communication
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
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

app.get('/', (req: Request, res: Response, next) => {
    return res.send('Hello World from TS express.');
});


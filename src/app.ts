import express, {Request, Response} from 'express';

export const app = express();

app.get('/', (req: Request, res: Response, next) => {
    return res.send('Hello World from TS express.');
});


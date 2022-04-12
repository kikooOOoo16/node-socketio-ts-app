import express from 'express';

export const app = express();

app.get('/', (req, res, next) => {
    return res.send('Hello World from TS express.');
});


import {connect} from 'mongoose';
import Logger from "../logger/logger";

connect(process.env.MONGODB_URL)
    .then(
        () => {
            Logger.debug(`mongoose.ts: Connected to MongoDB successfully.`);
        }
    ).catch(err => {
    Logger.error(`mongoose.ts: DB connection failed with err message ${err.message}.`)
});
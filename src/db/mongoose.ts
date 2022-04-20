import { connect } from 'mongoose';

connect(process.env.MONGODB_URL)
    .then(
        () => {
            console.log('Connected to MongoDB successfully.');
        }
    ).catch(err => {
    console.log(`${err} : DB connection failed.`);
});
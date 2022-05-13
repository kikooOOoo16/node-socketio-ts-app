import {Schema} from "mongoose";
import {Message} from "../../interfaces/message";

export const messageSchema = new Schema<Message>({
    author: {
        id : {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        },
        name: {
            type: String,
            required: true,
            trim: true
        }
    },
    text: {
        type: String,
        required: true,
        trim: true
    },
    createdAtUnixTime: {
        type: Number,
        required: true,
        trim: true
    },
    edited: {
        type: Boolean,
        required: true
    }
});
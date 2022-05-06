import {model, Schema} from "mongoose";
import {Room} from "../../interfaces/room";
import {Message} from "../../interfaces/message";

const messageSchema = new Schema<Message>({
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

const roomSchema = new Schema<Room>({
    name: {
        type: String,
        trim: true,
        required: true,
        unique: true
    },
    description: {
        type: String,
        trim: true,
        required: true
    },
    author: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    usersInRoom: [
        {
            type: Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    chatHistory: [messageSchema]
}, {
    timestamps: true
});

const Room = model('Room', roomSchema);

export {Room}
import {model, Schema} from "mongoose";
import {Room} from "../../interfaces/room";

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
    ]
}, {
    timestamps: true
});

const Room = model('Room', roomSchema);

export {Room}
import {model, Schema} from "mongoose";
import * as bcrypt from 'bcrypt';
import validator from "validator";
import {User} from "../../interfaces/user";
import {ServiceFactory} from "../../services/service-factory";
import {ServiceTypes} from "../../services/service-types";
import {AuthService} from "../../services/auth-services/auth-service";

const userSchema: Schema = new Schema<User>({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    email: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        lowercase: true,
        validate(value: string) {
            if (!validator.isEmail(value)) {
                throw new Error('Error: The entered email is invalid.');
            }
        }
    },
    password: {
        type: String,
        required: true,
        minLength: 7,
        trim: true,
        validate(value: string) {
            if (value.toLowerCase().includes('password')) {
                throw new Error(`Error: The password cannot contain the word "password".`);
            }
        }
    },
    socketId: {
        type: String
    }
}, {
    timestamps: true
});

// User doesn't hold any room data, this is just for mongoose to know the relationship
userSchema.virtual('userRooms', {
    ref: 'Room',
    localField: '_id',
    foreignField: 'author'
});

// return object with only the necessary user data
userSchema.methods.toJSON = function () {
    const user = this;

    // convert from MongoDB obj to regular obj
    const userObject = user.toObject();

    // delete password and tokens fields
    delete userObject.password;

    // return optimized user obj
    return userObject;
}

// MongoDB hooks middleware
// Hash Password
userSchema.pre('save', async function (next) {
    const user = this;
    const authService: AuthService = ServiceFactory.createService(ServiceTypes.AUTH_SERVICE);

    // hash password only if password field is modified which will happen on new user sign up and password update.
    if (user.isModified('password')) {
        user.password = await authService.hashPassword(user.password);
    }
    next();
});

// create mongoose model from user's schema
const User = model('User', userSchema);

export {User};
import {model, Schema} from "mongoose";
import jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import validator from "validator";
import {UserModel} from "../../interfaces/userModel";
import {User} from "../../interfaces/user";

const userSchema: Schema = new Schema({
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
    tokens: [
        {
            token: {
                type: String,
                required: true
            }
        }
    ]
}, {
    timestamps: true
});

// User doesn't hold any room data, this is just for mongoose to know the relationship
userSchema.virtual('userRooms', {
    ref: 'Room',
    localField: '_id',
    foreignField: 'author'
});

// Custom Mongoose Instance methods
// don't use arrow function because 'this' will point to global
userSchema.methods.generateAuthToken = async function () {
    const user = this;
    const token = jwt.sign({_id: user._id.toString()}, process.env.JWT_SECRET, {expiresIn: '3h'});

    // save user token to DB
    user.tokens = user.tokens.concat({token});
    await user.save();

    // return user token
    return token;
}

// return object with only the necessary user data
userSchema.methods.toJSON = function () {
    const user = this;

    // convert from MongoDB obj to regular obj
    const userObject = user.toObject();

    // delete password and tokens fields
    delete userObject.password;
    delete userObject.tokens;

    // return optimized user obj
    return userObject;
}

// Custom Mongoose model static methods
userSchema.static('findByCredentials', async (email, password) => {
    // find stored user by email
    const user = await User.findOne({email});
    // check if user with that email exists
    if (!user) {
        throw new Error('Error: User authentication failed! Invalid credentials.');
    }
    // check if encrypted password matches user's saved encrypted password
    const isMatch = await bcrypt.compare(password, user.password!);
    if (!isMatch) {
        throw new Error('Error: User authentication failed! Invalid credentials.');
    }
    // if all is well return user
    return user;
});

// MongoDB hooks middleware
// Hash Password
userSchema.pre('save', async function (next) {
    const user = this;

    // hash password only if password field is modified which will happen on new user sign up and password update.
    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 10);
    }
    next();
});

// create mongoose model from user's schema
//@ts-ignore
const User = model<User, UserModel>('User', userSchema);

export {User};
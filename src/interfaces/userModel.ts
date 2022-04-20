import {Model} from 'mongoose';
import {User} from "./user";

interface UserModel extends Model<User> {
    findByCredentials(email: string, password: string): User;
}

export {UserModel};
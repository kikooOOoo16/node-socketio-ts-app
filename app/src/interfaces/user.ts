import {UserDocument} from "./userDocument";

export interface User extends UserDocument {

    generateAuthToken(): string;
}
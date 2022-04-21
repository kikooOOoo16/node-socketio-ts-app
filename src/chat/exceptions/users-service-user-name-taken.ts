import {CustomUserServiceError} from "./CustomUserServiceError";

export class UserNameTaken extends CustomUserServiceError {

    constructor() {
        super('Error: That username is already taken.');
        Object.setPrototypeOf(this, UserNameTaken.prototype);
    }

    printError = (): string => {
        return 'Error: That username is already taken.';
    }

}
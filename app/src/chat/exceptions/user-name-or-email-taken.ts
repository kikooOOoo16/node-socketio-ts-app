import {CustomException} from "./custom-exception";

export class UserNameOrEmailTaken extends CustomException {

    constructor() {
        super('Error: That username or email address is already taken.');
        Object.setPrototypeOf(this, UserNameOrEmailTaken.prototype);
    }

    printError = (): string => {
        return 'Error: That username or email address is already taken.';
    }
}
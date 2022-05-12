import {CustomException} from "./custom-exception";

export class UserNameTaken extends CustomException {

    constructor() {
        super('Error: That username is already taken.');
        Object.setPrototypeOf(this, UserNameTaken.prototype);
    }

    printError = (): string => {
        return 'Error: That username is already taken.';
    }
}
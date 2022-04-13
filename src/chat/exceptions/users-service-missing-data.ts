import {CustomUserServiceError} from "./CustomUserServiceError";

export class UserDataMissingError extends CustomUserServiceError {

    constructor() {
        super('The username and room name are required.');
        Object.setPrototypeOf(this, UserDataMissingError.prototype);
    }

    printError = (): string => {
        return 'Error: The username and room name are required.';
    }

}
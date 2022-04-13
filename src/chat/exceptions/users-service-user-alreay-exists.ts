import {CustomUserServiceError} from "./CustomUserServiceError";

export class UserExistsError extends CustomUserServiceError {

    constructor() {
        super('The user is already in the room.');
        // Set the prototype explicitly.
        Object.setPrototypeOf(this, UserExistsError.prototype);
    }

    printError() {
        return `Error: The user is already in the room.`;
    }
}
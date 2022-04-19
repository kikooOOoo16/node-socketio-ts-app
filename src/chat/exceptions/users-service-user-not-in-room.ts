import {CustomUserServiceError} from "./CustomUserServiceError";

export class UserNotInRoom extends CustomUserServiceError {

    constructor() {
        super('The requested user is not in the current room.');
        Object.setPrototypeOf(this, UserNotInRoom.prototype);
    }

    printError = (): string => {
        return 'Error: The requested user is not in the current room.';
    }

}
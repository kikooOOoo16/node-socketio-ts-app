import {CustomUserServiceError} from "./CustomUserServiceError";

export class UserAlreadyInRoom extends CustomUserServiceError {

    constructor() {
        super('The user is already in the room.');
        Object.setPrototypeOf(this, UserAlreadyInRoom.prototype);
    }

    printError = (): string => {
        return 'Error: The user is already in the room.';
    }

}
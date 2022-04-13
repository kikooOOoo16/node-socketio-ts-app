import {CustomUserServiceError} from "./CustomUserServiceError";

export class UserAlreadyInRoomError extends CustomUserServiceError {

    constructor(private username: string,private room: string) {
        super(`The user ${username} is already in the room ${room}.`);
        Object.setPrototypeOf(this, UserAlreadyInRoomError.prototype);
    }

    printError() {
        return `Error: The user ${this.username} is already in the room ${this.room}.`;
    }
}
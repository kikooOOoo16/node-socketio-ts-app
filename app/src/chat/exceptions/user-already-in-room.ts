import {CustomException} from "./custom-exception";

export class UserAlreadyInRoom extends CustomException {

    constructor() {
        super('The user is already in the room.');
        Object.setPrototypeOf(this, UserAlreadyInRoom.prototype);
    }

    printError = (): string => {
        return 'Error: The user is already in the room.';
    }
}
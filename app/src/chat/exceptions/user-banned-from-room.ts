import {CustomException} from "./custom-exception";

export class UserBannedFromRoom extends CustomException {

    constructor() {
        super('The user is banned from the room.');
        Object.setPrototypeOf(this, UserBannedFromRoom.prototype);
    }

    printError = (): string => {
        return 'Error: The user is banned from the room.';
    }
}
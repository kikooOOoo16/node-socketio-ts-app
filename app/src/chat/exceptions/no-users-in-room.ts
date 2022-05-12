import {CustomException} from "./custom-exception";

export class NoUsersInRoom extends CustomException {
    constructor() {
        super(`There was a problem updating the room's users array.`);
        Object.setPrototypeOf(this, NoUsersInRoom.prototype);
    }

    printError = (): string => {
        return 'Error: There was a problem updating the room\'s users array.';
    }
}

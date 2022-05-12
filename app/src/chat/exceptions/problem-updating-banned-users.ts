import {CustomException} from "./custom-exception";

export class ProblemUpdatingBannedUsers extends CustomException {

    constructor() {
        super(`There was a problem updating the room's banned users list.`);
        Object.setPrototypeOf(this, ProblemUpdatingBannedUsers.prototype);
    }

    printError = (): string => {
        return 'Error: There was a problem updating the room\'s banned users list.';
    }
}
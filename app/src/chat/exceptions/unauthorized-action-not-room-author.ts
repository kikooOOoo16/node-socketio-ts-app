import {CustomException} from "./custom-exception";

export class UnauthorizedActionNotRoomAuthor extends CustomException {

    constructor() {
        super(`Unauthorized action! You are not the room's administrator to do that.`);
        Object.setPrototypeOf(this, UnauthorizedActionNotRoomAuthor.prototype);
    }

    printError = (): string => {
        return `Error: Unauthorized action! You are not the room's administrator to do that.`;
    }
}
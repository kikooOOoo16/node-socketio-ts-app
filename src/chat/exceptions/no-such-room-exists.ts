import {CustomException} from "./custom-exception";

export class NoSuchRoomExists extends CustomException {

    constructor() {
        super(`The requested room doesn't exist.`);
        Object.setPrototypeOf(this, NoSuchRoomExists.prototype);
    }

    printError = (): string => {
        return 'Error: The requested room doesn\'t exist.';
    }

}
import {CustomUserServiceError} from "./CustomUserServiceError";

export class NoSuchRoomExists extends CustomUserServiceError {

    constructor() {
        super(`The requested room doesn't exist.`);
        Object.setPrototypeOf(this, NoSuchRoomExists.prototype);
    }

    printError = (): string => {
        return 'Error: The requested room doesn\'t exist.';
    }

}
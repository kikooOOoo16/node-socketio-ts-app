import {CustomUserServiceError} from "./CustomUserServiceError";

export class InvalidRoomQuery extends CustomUserServiceError {

    constructor() {
        super(`Invalid query. The requested room couldn't be found.`);
        Object.setPrototypeOf(this, InvalidRoomQuery.prototype);
    }

    printError = (): string => {
        return 'Error: Invalid query. The requested room couldn\'t be found.';
    }

}
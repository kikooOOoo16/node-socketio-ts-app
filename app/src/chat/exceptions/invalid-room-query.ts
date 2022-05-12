import {CustomException} from "./custom-exception";

export class InvalidRoomQuery extends CustomException {

    constructor() {
        super(`Invalid query. The requested room couldn't be found.`);
        Object.setPrototypeOf(this, InvalidRoomQuery.prototype);
    }

    printError = (): string => {
        return 'Error: Invalid query. The requested room couldn\'t be found.';
    }
}
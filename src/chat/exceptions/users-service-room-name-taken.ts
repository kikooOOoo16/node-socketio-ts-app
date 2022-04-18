import {CustomUserServiceError} from "./CustomUserServiceError";

export class RoomNameTaken extends CustomUserServiceError {

    constructor() {
        super('That room name already exists, please choose a different one.');
        Object.setPrototypeOf(this, RoomNameTaken.prototype);
    }

    printError = (): string => {
        return 'Error: That room name already exists, please choose a different one.';
    }

}
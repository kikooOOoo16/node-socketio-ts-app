import {CustomUserServiceError} from "./CustomUserServiceError";

export class RoomDataMissing extends CustomUserServiceError {

    constructor() {
        super('Required room data is missing. Please pass all the required data.');
        Object.setPrototypeOf(this, RoomDataMissing.prototype);
    }

    printError = (): string => {
        return 'Error: Required room data is missing. Please pass all the required data.';
    }

}
import {CustomException} from "./custom-exception";

export class RoomDataMissing extends CustomException {

    constructor() {
        super('Required room data is missing. Please pass all the required data.');
        Object.setPrototypeOf(this, RoomDataMissing.prototype);
    }

    printError = (): string => {
        return 'Error: Required room data is missing. Please pass all the required data.';
    }
}
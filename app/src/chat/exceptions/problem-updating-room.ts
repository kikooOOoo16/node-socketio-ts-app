import {CustomException} from "./custom-exception";

export class ProblemUpdatingRoom extends CustomException {

    constructor() {
        super('There was a problem updating the specified room.');
        Object.setPrototypeOf(this, ProblemUpdatingRoom.prototype);
    }

    printError = (): string => {
        return 'Error: There was a problem updating the specified room.';
    }
}
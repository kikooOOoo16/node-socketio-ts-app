import {CustomException} from "./custom-exception";

export class ProblemDeletingRoom extends CustomException {

    constructor() {
        super('There was a problem deleting the specified room.');
        Object.setPrototypeOf(this, ProblemDeletingRoom.prototype);
    }

    printError = (): string => {
        return 'Error: There was a problem deleting the specified room.';
    }
}
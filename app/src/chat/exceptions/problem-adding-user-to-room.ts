import {CustomException} from "./custom-exception";

export class ProblemAddingUserToRoom extends CustomException {

    constructor() {
        super('There was a problem adding the current user to the room.');
        Object.setPrototypeOf(this, ProblemAddingUserToRoom.prototype);
    }

    printError = (): string => {
        return 'Error: There was a problem adding the current user to the room.';
    }

}
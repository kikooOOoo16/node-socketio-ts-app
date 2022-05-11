import {CustomException} from "./custom-exception";

export class ProblemSavingUserSocketId extends CustomException {

    constructor() {
        super(`There was a problem saving the users's socketID to the DB.`);
        Object.setPrototypeOf(this, ProblemSavingUserSocketId.prototype);
    }

    printError = (): string => {
        return 'Error: There was a problem saving the users\'s socketID to the DB.';
    }

}
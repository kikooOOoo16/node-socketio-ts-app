import {AbstractException} from "../abstract-exception";

export class ProblemSavingUserSocketIdException extends AbstractException {

    constructor() {
        super(`There was a problem saving the users's socketID to the DB.`);
        Object.setPrototypeOf(this, ProblemSavingUserSocketIdException.prototype);
    }

    serializeErrors(): { message: string; field?: string }[] {
        return [
            {
                message: 'Error: There was a problem saving the users\'s socketID to the DB.'
            },
        ];
    }
}
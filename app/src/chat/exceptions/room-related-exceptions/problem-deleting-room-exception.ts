import {AbstractException} from "../abstract-exception";

export class ProblemDeletingRoomException extends AbstractException {

    constructor() {
        super('There was a problem deleting the specified room.');
        Object.setPrototypeOf(this, ProblemDeletingRoomException.prototype);
    }

    serializeErrors(): { message: string; field?: string }[] {
        return [
            {
                message: 'Error: There was a problem deleting the specified room.'
            },
        ];
    }
}
import {AbstractException} from "../abstract-exception";

export class ProblemAddingUserToRoomException extends AbstractException {

    constructor() {
        super('There was a problem adding the current user to the room.');
        Object.setPrototypeOf(this, ProblemAddingUserToRoomException.prototype);
    }

    serializeErrors(): { message: string; field?: string }[] {
        return [
            {
                message: 'Error: There was a problem adding the current user to the room.'
            },
        ];
    }
}
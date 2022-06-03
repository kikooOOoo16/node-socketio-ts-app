import {AbstractException} from "../abstract-exception";

export class ProblemUpdatingRoomException extends AbstractException {

    constructor() {
        super('There was a problem updating the specified room.');
        Object.setPrototypeOf(this, ProblemUpdatingRoomException.prototype);
    }

    serializeErrors(): { message: string; field?: string }[] {
        return [
            {
                message: 'Error: There was a problem updating the specified room.'
            },
        ];
    }
}
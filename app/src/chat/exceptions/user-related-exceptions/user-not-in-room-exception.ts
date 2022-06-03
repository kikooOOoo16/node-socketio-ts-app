import {AbstractException} from "../abstract-exception";

export class UserNotInRoomException extends AbstractException {

    constructor() {
        super('The requested user is not in the current room.');
        Object.setPrototypeOf(this, UserNotInRoomException.prototype);
    }

    serializeErrors(): { message: string; field?: string }[] {
        return [
            {
                message: 'Error: The requested user is not in the current room.'
            },
        ];
    }
}
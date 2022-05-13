import {AbstractException} from "../abstract-exception";

export class UserAlreadyInRoomException extends AbstractException {

    constructor() {
        super('The user is already in the room.');
        Object.setPrototypeOf(this, UserAlreadyInRoomException.prototype);
    }

    serializeErrors(): { message: string; field?: string }[] {
        return [
            {
                message: 'Error: The user is already in the room.'
            },
        ];
    }
}
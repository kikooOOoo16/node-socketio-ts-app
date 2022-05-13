import {AbstractException} from "../abstract-exception";

export class UserBannedFromRoomException extends AbstractException {

    constructor() {
        super('The user is banned from the room.');
        Object.setPrototypeOf(this, UserBannedFromRoomException.prototype);
    }

    serializeErrors(): { message: string; field?: string }[] {
        return [
            {
                message: 'Error: The user is banned from the room.'
            },
        ];
    }
}
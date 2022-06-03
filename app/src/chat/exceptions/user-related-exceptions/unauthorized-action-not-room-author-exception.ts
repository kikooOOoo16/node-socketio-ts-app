import {AbstractException} from "../abstract-exception";

export class UnauthorizedActionNotRoomAuthorException extends AbstractException {

    constructor() {
        super(`Unauthorized action! You are not the room's administrator to do that.`);
        Object.setPrototypeOf(this, UnauthorizedActionNotRoomAuthorException.prototype);
    }

    serializeErrors(): { message: string; field?: string }[] {
        return [
            {
                message: 'Error: Unauthorized action! You are not the room\'s administrator to do that.'
            },
        ];
    }
}
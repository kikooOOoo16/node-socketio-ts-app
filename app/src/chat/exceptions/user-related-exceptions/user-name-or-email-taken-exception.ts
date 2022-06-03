import {AbstractException} from "../abstract-exception";

export class UserNameOrEmailTakenException extends AbstractException {

    constructor() {
        super('Error: That username or email address is already taken.');
        Object.setPrototypeOf(this, UserNameOrEmailTakenException.prototype);
    }

    serializeErrors(): { message: string; field?: string }[] {
        return [
            {
                message: 'Error: That username or email address is already taken.'
            },
        ];
    }
}
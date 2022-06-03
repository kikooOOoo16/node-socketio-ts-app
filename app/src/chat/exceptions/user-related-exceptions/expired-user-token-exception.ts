import {AbstractException} from "../abstract-exception";

export class ExpiredUserTokenException extends AbstractException {

    constructor() {
        super(`Error: User token has expired.`);
        Object.setPrototypeOf(this, ExpiredUserTokenException.prototype);
    }

    serializeErrors(): { message: string; field?: string }[] {
        return [
            {
                message: 'Error: User token has expired.'
            },
        ];
    }
}
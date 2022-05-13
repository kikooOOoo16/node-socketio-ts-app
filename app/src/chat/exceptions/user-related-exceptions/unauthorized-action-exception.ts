import {AbstractException} from "../abstract-exception";

export class UnauthorizedActionException extends AbstractException {

    constructor() {
        super(`Unauthorized action!`);
        Object.setPrototypeOf(this, UnauthorizedActionException.prototype);
    }

    serializeErrors(): { message: string; field?: string }[] {
        return [
            {
                message: 'Error: Unauthorized action!'
            },
        ];
    }
}
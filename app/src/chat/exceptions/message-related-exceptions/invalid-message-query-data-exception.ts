import {AbstractException} from "../abstract-exception";

export class InvalidMessageQueryDataException extends AbstractException {

    constructor() {
        super(`Error: Invalid message sent. Message must exist and can't be an empty string.`);
        Object.setPrototypeOf(this, InvalidMessageQueryDataException.prototype);
    }

    serializeErrors(): { message: string; field?: string }[] {
        return [
            {
                message: 'Error: Invalid message sent. Message must exist and can\'t be an empty string.'
            },
        ];
    }
}
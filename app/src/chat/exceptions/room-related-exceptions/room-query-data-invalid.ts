import {AbstractException} from "../abstract-exception";

export class RoomQueryDataInvalidException extends AbstractException {

    constructor() {
        super('The provided room query data is invalid.');
        Object.setPrototypeOf(this, RoomQueryDataInvalidException.prototype);
    }

    serializeErrors(): { message: string; field?: string }[] {
        return [
            {
                message: 'Error: The provided room query data is invalid.'
            },
        ];
    }
}
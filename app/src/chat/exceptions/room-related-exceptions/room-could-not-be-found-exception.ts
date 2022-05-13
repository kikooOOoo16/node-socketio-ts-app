import {AbstractException} from "../abstract-exception";

export class RoomCouldNotBeFoundException extends AbstractException {

    constructor() {
        super('Error: The requested room couldn\'t be found.');
        Object.setPrototypeOf(this, RoomCouldNotBeFoundException.prototype);
    }

    serializeErrors(): { message: string; field?: string }[] {
        return [
            {
                message: 'Error: The requested room couldn\'t be found.'
            },
        ];
    }
}
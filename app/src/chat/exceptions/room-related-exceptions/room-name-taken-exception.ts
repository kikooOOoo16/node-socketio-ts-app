import {AbstractException} from "../abstract-exception";

export class RoomNameTakenException extends AbstractException {

    constructor() {
        super('That room name already exists, please choose a different one.');
        Object.setPrototypeOf(this, RoomNameTakenException.prototype);
    }

    serializeErrors(): { message: string; field?: string }[] {
        return [
            {
                message: 'Error: That room name already exists, please choose a different one.'
            },
        ];
    }
}
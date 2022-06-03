import {AbstractException} from "../abstract-exception";

export class RoomQueryDataMissingException extends AbstractException {

    constructor() {
        super('Required query data for room is missing. Please pass all the required data.');
        Object.setPrototypeOf(this, RoomQueryDataMissingException.prototype);
    }

    serializeErrors(): { message: string; field?: string }[] {
        return [
            {
                message: 'Error: Required query data for room is missing. Please pass all the required data.'
            },
        ];
    }
}
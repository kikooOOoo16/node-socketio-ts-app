import {AbstractException} from "../abstract-exception";

export class ProblemUpdatingRoomBannedUsersException extends AbstractException {

    constructor() {
        super(`There was a problem updating the room's banned users list.`);
        Object.setPrototypeOf(this, ProblemUpdatingRoomBannedUsersException.prototype);
    }

    serializeErrors(): { message: string; field?: string }[] {
        return [
            {
                message: 'Error: There was a problem updating the room\'s banned users list.'
            },
        ];
    }
}
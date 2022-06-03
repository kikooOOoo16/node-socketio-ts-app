import {AbstractException} from "../abstract-exception";

export class UserQueryDataMissingException extends AbstractException {

    constructor() {
        super('Required user data is missing. Please pass all the required data.');
        Object.setPrototypeOf(this, UserQueryDataMissingException.prototype);
    }

    serializeErrors(): { message: string; field?: string }[] {
        return [
            {
                message: 'Error: Required user data is missing. Please pass all the required data.'
            },
        ];
    }
}
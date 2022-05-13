import {AbstractException} from "../abstract-exception";

export class MissingQueryDataException extends AbstractException {

    constructor() {
        super('Missing query data. Please pass all the required data.');
        Object.setPrototypeOf(this, MissingQueryDataException.prototype);
    }

    serializeErrors(): { message: string; field?: string }[] {
        return [
            {
                message: 'Error: Missing query data. Please pass all the required data.'
            },
        ];
    }
}
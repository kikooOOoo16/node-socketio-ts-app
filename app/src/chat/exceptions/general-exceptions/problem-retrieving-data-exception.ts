import {AbstractException} from "../abstract-exception";

export class ProblemRetrievingDataException extends AbstractException {

    constructor() {
        super('There was a problem retrieving the requested data.');
        Object.setPrototypeOf(this, ProblemRetrievingDataException.prototype);
    }

    serializeErrors(): { message: string; field?: string }[] {
        return [
            {
                message: 'Error: There was a problem retrieving the requested data.'
            },
        ];
    }
}
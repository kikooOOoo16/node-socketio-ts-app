import {CustomException} from "./custom-exception";

export class ProblemRetrievingData extends CustomException {

    constructor() {
        super('There was a problem retrieving the requested data.');
        Object.setPrototypeOf(this, ProblemRetrievingData.prototype);
    }

    printError = (): string => {
        return 'Error: There was a problem retrieving the requested data.';
    }
}
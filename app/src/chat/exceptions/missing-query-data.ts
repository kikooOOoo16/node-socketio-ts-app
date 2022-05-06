import {CustomException} from "./custom-exception";

export class MissingQueryData extends CustomException {

    constructor() {
        super('Missing query data. Please pass all the required data.');
        Object.setPrototypeOf(this, MissingQueryData.prototype);
    }

    printError = (): string => {
        return 'Error: Missing query data. Please pass all the required data.';
    }

}
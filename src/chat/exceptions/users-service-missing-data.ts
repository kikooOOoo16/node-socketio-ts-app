import {CustomUserServiceError} from "./CustomUserServiceError";

export class MissingQueryData extends CustomUserServiceError {

    constructor() {
        super('Missing query data. Please pass all the required data.');
        Object.setPrototypeOf(this, MissingQueryData.prototype);
    }

    printError = (): string => {
        return 'Error: Missing query data. Please pass all the required data.';
    }

}
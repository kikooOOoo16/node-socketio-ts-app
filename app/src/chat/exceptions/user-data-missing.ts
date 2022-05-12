import {CustomException} from "./custom-exception";

export class UserDataMissing extends CustomException {

    constructor() {
        super('Required user data is missing. Please pass all the required data.');
        Object.setPrototypeOf(this, UserDataMissing.prototype);
    }

    printError = (): string => {
        return 'Error: Required user data is missing. Please pass all the required data.';
    }
}
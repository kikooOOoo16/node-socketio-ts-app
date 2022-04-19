import {CustomUserServiceError} from "./CustomUserServiceError";

export class UserDataMissing extends CustomUserServiceError {

    constructor() {
        super('Required user data is missing. Please pass all the required data.');
        Object.setPrototypeOf(this, UserDataMissing.prototype);
    }

    printError = (): string => {
        return 'Error: Required user data is missing. Please pass all the required data.';
    }

}
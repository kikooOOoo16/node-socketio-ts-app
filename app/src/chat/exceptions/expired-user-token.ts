import {CustomException} from "./custom-exception";

export class ExpiredUserToken extends CustomException {

    constructor() {
        super(`User token has expired.`);
        Object.setPrototypeOf(this, ExpiredUserToken.prototype);
    }

    printError = (): string => {
        return 'Error: User token has expired.';
    }

}
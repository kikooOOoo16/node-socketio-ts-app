import {CustomUserServiceError} from "./CustomUserServiceError";

export class UnauthorizedAction extends CustomUserServiceError {

    constructor() {
        super(`Unauthorized action!`);
        Object.setPrototypeOf(this, UnauthorizedAction.prototype);
    }

    printError = (): string => {
        return 'Error: Unauthorized action!';
    }

}
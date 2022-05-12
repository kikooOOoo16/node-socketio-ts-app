import {CustomException} from "./custom-exception";

export class UnauthorizedAction extends CustomException {

    constructor() {
        super(`Unauthorized action!`);
        Object.setPrototypeOf(this, UnauthorizedAction.prototype);
    }

    printError = (): string => {
        return 'Error: Unauthorized action!';
    }
}
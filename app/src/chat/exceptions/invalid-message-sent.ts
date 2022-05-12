import {CustomException} from "./custom-exception";

export class InvalidMessageSent extends CustomException {

    constructor() {
        super(`Invalid message sent. Message must exist and can't be an empty string.`);
        Object.setPrototypeOf(this, InvalidMessageSent.prototype);
    }

    printError = (): string => {
        return `Error: Invalid message sent. Message must exist and can't be an empty string.`;
    }
}
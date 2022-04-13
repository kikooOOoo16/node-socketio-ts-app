export class UserDoesNotExistError extends Error {

    constructor() {
        super(`The queried user doesn't exist.`);
        // Set the prototype explicitly.
        Object.setPrototypeOf(this, UserDoesNotExistError.prototype);
    }

    printError() {
        return `Error: The queried user doesn't exist.`;
    }
}
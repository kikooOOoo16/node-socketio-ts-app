export abstract class CustomException extends Error {

    protected constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, CustomException.prototype);
    }

    abstract printError(): string;
}
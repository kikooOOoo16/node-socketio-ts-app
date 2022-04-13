export abstract class CustomUserServiceError extends Error {

    protected constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, CustomUserServiceError.prototype);
    }

    abstract printError(): string;
}
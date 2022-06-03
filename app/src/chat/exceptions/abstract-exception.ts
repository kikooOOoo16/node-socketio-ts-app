export abstract class AbstractException extends Error {

    protected constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, AbstractException.prototype);
    }
    abstract serializeErrors(): {
        message: string,
        field?: string
    } [];
}
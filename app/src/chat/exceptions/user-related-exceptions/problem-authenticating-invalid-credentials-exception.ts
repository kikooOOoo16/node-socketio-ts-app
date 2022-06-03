import {AbstractException} from "../abstract-exception";

export class ProblemAuthenticatingInvalidCredentialsException extends AbstractException {

    constructor() {
        super(`Error: Problem authenticating. Invalid credentials.`);
        Object.setPrototypeOf(this, ProblemAuthenticatingInvalidCredentialsException.prototype);
    }

    serializeErrors(): { message: string; field?: string }[] {
        return [
            {
                message: 'Error: Problem authenticating. Invalid credentials.'
            },
        ];
    }
}
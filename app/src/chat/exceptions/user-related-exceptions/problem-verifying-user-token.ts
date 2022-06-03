import {AbstractException} from "../abstract-exception";

export class ProblemVerifyingUserToken extends AbstractException {

    constructor() {
        super(`Error: Problem verifying user token.`);
        Object.setPrototypeOf(this, ProblemVerifyingUserToken.prototype);
    }

    serializeErrors(): { message: string; field?: string }[] {
        return [
            {
                message: 'Error: Problem verifying user token.'
            },
        ];
    }
}
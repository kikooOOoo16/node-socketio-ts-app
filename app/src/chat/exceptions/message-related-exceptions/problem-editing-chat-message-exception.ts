import {AbstractException} from "../abstract-exception";

export class ProblemEditingChatMessageException extends AbstractException {

    constructor() {
        super(`Problem editing requested chat message.`);
        Object.setPrototypeOf(this, ProblemEditingChatMessageException.prototype);
    }

    serializeErrors(): { message: string; field?: string }[] {
        return [
            {
                message: 'Error: Problem editing requested chat message.'
            },
        ];
    }
}
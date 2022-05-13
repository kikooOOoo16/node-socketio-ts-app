import {AbstractException} from "../abstract-exception";

export class ProblemSavingRoomChatHistoryException extends AbstractException {

    constructor() {
        super(`There was a problem saving the chat history.`);
        Object.setPrototypeOf(this, ProblemSavingRoomChatHistoryException.prototype);
    }

    serializeErrors(): { message: string; field?: string }[] {
        return [
            {
                message: 'Error: There was a problem saving the chat history.'
            },
        ];
    }
}
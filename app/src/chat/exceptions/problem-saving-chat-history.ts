import {CustomException} from "./custom-exception";

export class ProblemSavingChatHistory extends CustomException {

    constructor() {
        super(`There was a problem saving the chat history.`);
        Object.setPrototypeOf(this, ProblemSavingChatHistory.prototype);
    }

    printError = (): string => {
        return 'Error: There was a problem saving the chat history.';
    }
}
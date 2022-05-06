import {CustomException} from "./custom-exception";

export class ProfaneLanguageNotAllowed extends CustomException {

    constructor() {
        super('Profane language is not allowed!');
        Object.setPrototypeOf(this, ProfaneLanguageNotAllowed.prototype);
    }

    printError = (): string => {
        return 'Error: Profane language is not allowed!';
    }

}
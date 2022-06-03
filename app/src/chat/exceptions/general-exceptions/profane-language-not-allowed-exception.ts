import {AbstractException} from "../abstract-exception";

export class ProfaneLanguageNotAllowedException extends AbstractException {

    constructor() {
        super('Profane language is not allowed!');
        Object.setPrototypeOf(this, ProfaneLanguageNotAllowedException.prototype);
    }

    serializeErrors(): { message: string; field?: string }[] {
        return [
            {
                message: 'Error: Profane language is not allowed!'
            },
        ];
    }
}
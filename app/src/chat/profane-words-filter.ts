import Logger from "../logger/logger";
import Filter from "bad-words";
import {ProfaneLanguageNotAllowedException} from "./exceptions/general-exceptions/profane-language-not-allowed-exception";

export class ProfaneWordsFilter {
    private badWordsFilter: Filter;

    constructor() {
        this.badWordsFilter = new Filter();
    }

    filterString(inputString: string, roomName: string) {

        if (this.badWordsFilter.isProfane(inputString)) {
            Logger.debug(`Socket.ts: socket.on sendMessage: Profane language check triggered in room ${roomName}.`);
            throw new ProfaneLanguageNotAllowedException();
        }
    }

    filterArrayOfStrings(inputStringsArray: string[]) {

        inputStringsArray.forEach(inputString => {
            if (this.badWordsFilter.isProfane(inputString)) {
                throw new ProfaneLanguageNotAllowedException();
            }
        })
    }
}
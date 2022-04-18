import {Message} from "../interfaces/message";

export class MessageGeneratorService {
    private static instance: MessageGeneratorService;

    private constructor() {
    }

    public static getInstance(): MessageGeneratorService {
        if (!MessageGeneratorService.instance) {
            MessageGeneratorService.instance = new MessageGeneratorService();
        }
        return MessageGeneratorService.instance;
    }

    public generateMessage = (username : string, msgText : string) : Message => {
        const createdAtUnixTime = new Date().getTime();
        return {
            author: username,
            text: msgText,
            createdAtUnixTime
        };
    }
}
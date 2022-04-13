import {Message} from "../models/message";

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
        return new Message(username, msgText, createdAtUnixTime);
    }
}
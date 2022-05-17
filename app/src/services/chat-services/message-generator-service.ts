import {Message} from "../../interfaces/message";
import {User} from "../../interfaces/user";

export class MessageGeneratorService {
    private static instance: MessageGeneratorService;

    public static getInstance(): MessageGeneratorService {
        if (!MessageGeneratorService.instance) {
            MessageGeneratorService.instance = new MessageGeneratorService();
        }
        return MessageGeneratorService.instance;
    }

    public generateMessage(user: User | undefined, msgText: string): Message {
        const createdAtUnixTime = new Date().getTime();

        //if no user was passed the message is being sent by the Server
        const author = {
            id: user ? user._id : '',
            name: user ? user.name : 'SERVER'
        }

        return {
            author,
            text: msgText,
            createdAtUnixTime
        };
    }
}
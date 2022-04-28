import {Message} from "../interfaces/message";
import {User} from "../interfaces/user";
import mongoose from "mongoose";

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

    public generateMessage = (user: User | undefined, msgText: string): Message => {
        let author;
        const createdAtUnixTime = new Date().getTime();

        //if no user was passed generate message as ADMIN else generate using user data
        if (!user) {
            author = {
                id: '',
                name: 'ADMIN'
            }
        } else {
            author = {
                id: user._id,
                name: user.name
            }
        }

        return {
            author,
            text: msgText,
            createdAtUnixTime
        };
    }
}
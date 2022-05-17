import Logger from "../../logger/logger";
import {Schema} from "mongoose";

import {User as UserModel} from "../../db/models/user";
import {Room as RoomModel} from "../../db/models/room";
import {RoomPopulatedUsers} from "../../interfaces/roomPopulatedUsers";
import {User} from "../../interfaces/user";
import {Message} from "../../interfaces/message";

import {UnauthorizedActionException} from "../../chat/exceptions/user-related-exceptions/unauthorized-action-exception";
import {UnauthorizedActionNotRoomAuthorException} from "../../chat/exceptions/user-related-exceptions/unauthorized-action-not-room-author-exception";
import {ProblemUpdatingRoomException} from "../../chat/exceptions/room-related-exceptions/problem-updating-room-exception";
import {ProblemSavingUserSocketIdException} from "../../chat/exceptions/user-related-exceptions/problem-saving-user-socket-id-exception";
import {ProblemEditingChatMessageException} from "../../chat/exceptions/message-related-exceptions/problem-editing-chat-message-exception";
import {ProblemRetrievingDataException} from "../../chat/exceptions/general-exceptions/problem-retrieving-data-exception";
import {ProblemAuthenticatingInvalidCredentialsException} from "../../chat/exceptions/user-related-exceptions/problem-authenticating-invalid-credentials-exception";

export class UsersService {
    private static instance: UsersService;

    private constructor() {
    }

    public static getInstance(): UsersService {
        if (!UsersService.instance) {
            UsersService.instance = new UsersService();
        }
        return UsersService.instance;
    }

    async fetchUserById(userId: Schema.Types.ObjectId | string): Promise<{ user: User }> {

        const user: User | null = await UserModel.findById(userId);

        if (!user) {
            Logger.warn(`Couldn't find user in db with provided userId= ${userId}`);
            throw new UnauthorizedActionException();
        }
        Logger.debug(`users-service: fetchUserById: Successfully fetcher user data for user name= ${user.name}`);
        return {user};
    }

    async fetchUserByEmail(email: string): Promise<{ user: User }> {
        let user: User | null;
        try {
            user = await UserModel.findOne({email});
        } catch (e) {
            Logger.warn(`users-service: fetchUserByEmail(): There was a problem retrieving the users data for the email ${email}`);
            throw new ProblemRetrievingDataException();
        }

        if (!user) {
            throw new ProblemAuthenticatingInvalidCredentialsException();
        }

        Logger.debug(`users-service: fetchUserByEmail: Successfully found user data for email = ${email}`);
        return {user};
    }

    async saveUsersSocketID(userId: string, socketId: string) {
        Logger.debug(`users-service: saveUsersSocketID: triggered for userId = ${userId} and socketID = ${socketId}`);

        try {
            // update user in DB with new socketId
            await UserModel.findByIdAndUpdate(userId, {socketId: socketId});
        } catch (e) {

            Logger.error(`users-service: saveUsersSocketID: failed saving user's socket id with err ${e.message}`);
            throw new ProblemSavingUserSocketIdException();
        }
    }

    async removeUsersSocketID(userId: string, socketId: string) {
        Logger.debug(`users-service: removeUsersSocketID: triggered for userId = ${userId} and socketID = ${socketId}`);

        try {
            // update user in DB with new socketId
            await UserModel.findByIdAndUpdate(userId, {socketId: null});
        } catch (e) {

            Logger.error(`users-service: saveUsersSocketID: failed saving user's socket id with err ${e.message}`);
            throw new ProblemSavingUserSocketIdException();
        }
    }

    async checkUserRoomOwnershipById(roomAuthorId: Schema.Types.ObjectId, userId: Schema.Types.ObjectId | string) {
        // check if current user is the author/admin of the room
        if (String(roomAuthorId) !== String(userId)) {
            Logger.warn(`users-service: checkUserRoomOwnershipById(): Unauthorized action err: The currentUser ${String(userId)} is not the room's author = ${String(roomAuthorId)}`)
            throw new UnauthorizedActionNotRoomAuthorException();
        }
        Logger.debug(`users-service: checkUserRoomOwnershipById(): Passed, the currentUser ${String(userId)} is the rooms author = ${String(roomAuthorId)}`);
    }

    checkIfMessageBelongsToUser(editedMessage: Message, userId: string) {

        if (String(editedMessage.author.id) !== userId) {
            Logger.warn(`users-service: checkIfMessageBelongsToUser(): Edit message failed for userId ${userId} and message author id ${String(editedMessage.author.id)}`);
            throw new UnauthorizedActionException();
        }
        Logger.debug(`users-service: checkIfMessageBelongsToUser(): The user ${userId} is definitely the author of the message ${String(editedMessage.text)}`);
    }

    async editUserMessage(editedMessage: Message, room: RoomPopulatedUsers): Promise<{ updatedRoom: RoomPopulatedUsers }> {

        if (room.chatHistory && room.chatHistory.length > 0) {
            //edit specific message in room's chat history
            for (let i = 0; i < room.chatHistory.length; i++) {
                if (String(room.chatHistory[i]._id) === String(editedMessage._id)) {
                    room.chatHistory[i].text = editedMessage.text;
                    room.chatHistory[i].edited = true;
                    break;
                }
            }
        } else {
            Logger.warn(`users-service: editUserMessage(): Problem editing chat message. The room's (name = ${room.name}) chat history is empty room.chatHistory.length = ${room.chatHistory?.length}`);
            throw new ProblemEditingChatMessageException();
        }

        Logger.debug(`users-service: editUserMessage(): Room with edited chat history = ${room}`);

        try {
            // update room chatHistory for selected room, new flag required to return room after update was applied
            const updatedRoom: RoomPopulatedUsers | null = await RoomModel.findOneAndUpdate({name: room.name}, {'chatHistory': room.chatHistory}, {new: true})
                .populate<{ usersInRoom: User[] }>({
                    path: 'usersInRoom',
                    select: '_id name email'
                });

            if (updatedRoom !== null) {
                Logger.debug(`users-service: editUserMessage(): Saved updatedRoom to DB.`);
                return {updatedRoom};
            } else {
                Logger.warn(`users-service: editUserMessage(): Problem updating room's chat history. Update result updateRoom = ${updatedRoom}, possible that the required room name= ${room.name} was not found.`);
                throw new ProblemUpdatingRoomException();
            }
        } catch (e) {
            Logger.warn(`users-service: editUserMessage(): Problem updating room's chat history. Err message = ${e.message}`);
            throw new ProblemUpdatingRoomException();
        }
    }
}

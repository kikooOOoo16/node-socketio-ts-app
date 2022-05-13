import {CustomExceptionType} from "./custom-exception-type";
import {ExpiredUserToken} from "./expired-user-token";
import {InvalidRoomQuery} from "./invalid-room-query";
import {MissingQueryData} from "./missing-query-data";
import {NoSuchRoomExists} from "./no-such-room-exists";
import {RoomDataMissing} from "./room-data-missing";
import {RoomNameTaken} from "./room-name-taken";
import {UnauthorizedAction} from "./unauthorized-action";
import {UserAlreadyInRoom} from "./user-already-in-room";
import {UserDataMissing} from "./user-data-missing";
import {UserNameOrEmailTaken} from "./user-name-or-email-taken";
import {UserNotInRoom} from "./user-not-in-room";
import {ProblemRetrievingData} from "./problem-retrieving-data";
import {ProblemAddingUserToRoom} from "./problem-adding-user-to-room";
import {ProblemSavingChatHistory} from "./problem-saving-chat-history";
import {InvalidMessageSent} from "./invalid-message-sent";
import {ProblemUpdatingRoom} from "./problem-updating-room";
import {ProblemDeletingRoom} from "./problem-deleting-room";
import {ProfaneLanguageNotAllowed} from "./profane-language-not-allowed";
import {UnauthorizedActionNotRoomAuthor} from "./unauthorized-action-not-room-author";
import {ProblemSavingUserSocketId} from "./problem-saving-user-socket-id";
import {NoUsersInRoom} from "./no-users-in-room";
import {ProblemUpdatingBannedUsers} from "./problem-updating-banned-users";
import {ProblemRemovingSocketFromSocketIORoom} from "./problem-removing-socket-from-socketIO-room";
import {UserBannedFromRoom} from "./user-banned-from-room";

export class ExceptionFactory {
    static createException = (exceptionType: CustomExceptionType)  => {
        switch (exceptionType) {
            case CustomExceptionType.EXPIRED_USER_TOKEN:
                return new ExpiredUserToken();
            case CustomExceptionType.INVALID_ROOM_QUERY:
                return new InvalidRoomQuery();
            case CustomExceptionType.MISSING_QUERY_DATA:
                return new MissingQueryData();
            case CustomExceptionType.NO_SUCH_ROOM_EXISTS:
                return new NoSuchRoomExists();
            case CustomExceptionType.ROOM_DATA_MISSING:
                return new RoomDataMissing();
            case CustomExceptionType.ROOM_NAME_TAKEN:
                return new RoomNameTaken();
            case CustomExceptionType.UNAUTHORIZED_ACTION:
                return new UnauthorizedAction();
            case CustomExceptionType.USER_ALREADY_IN_ROOM:
                return new UserAlreadyInRoom();
            case CustomExceptionType.USER_DATA_MISSING:
                return new UserDataMissing();
            case CustomExceptionType.USER_NAME_TAKEN:
                return new UserNameOrEmailTaken();
            case CustomExceptionType.USER_NOT_IN_ROOM:
                return new UserNotInRoom();
            case CustomExceptionType.PROBLEM_RETRIEVING_DATA:
                return new ProblemRetrievingData();
            case CustomExceptionType.PROBLEM_ADDING_USER_TO_ROOM:
                return new ProblemAddingUserToRoom();
            case CustomExceptionType.PROBLEM_SAVING_CHAT_HISTORY:
                return new ProblemSavingChatHistory();
            case CustomExceptionType.INVALID_MESSAGE_SENT:
                return new InvalidMessageSent();
            case CustomExceptionType.PROBLEM_UPDATING_ROOM:
                return new ProblemUpdatingRoom();
            case CustomExceptionType.PROBLEM_DELETING_ROOM:
                return new ProblemDeletingRoom();
            case CustomExceptionType.PROFANE_LANGUAGE_NOT_ALLOWED:
                return new ProfaneLanguageNotAllowed();
            case CustomExceptionType.UNAUTHORIZED_ACTION_NOT_ROOM_AUTHOR:
                return new UnauthorizedActionNotRoomAuthor();
            case CustomExceptionType.PROBLEM_SAVING_USER_SOCKET_ID:
                return new ProblemSavingUserSocketId();
            case CustomExceptionType.NO_USERS_IN_ROOM:
                return new NoUsersInRoom();
            case CustomExceptionType.PROBLEM_UPDATING_ROOMS_BANNED_USERS:
                return new ProblemUpdatingBannedUsers();
            case CustomExceptionType.PROBLEM_REMOVING_SOCKET_FROM_SOCKET_IO_ROOM:
                return new ProblemRemovingSocketFromSocketIORoom();
            case CustomExceptionType.USER_BANNED_FROM_ROOM:
                return new UserBannedFromRoom();
        }
    }
}
import {customExceptionType} from "./custom-exception-type";
import {ExpiredUserToken} from "./expired-user-token";
import {InvalidRoomQuery} from "./invalid-room-query";
import {MissingQueryData} from "./missing-query-data";
import {NoSuchRoomExists} from "./no-such-room-exists";
import {RoomDataMissing} from "./room-data-missing";
import {RoomNameTaken} from "./room-name-taken";
import {UnauthorizedAction} from "./unauthorized-action";
import {UserAlreadyInRoom} from "./user-already-in-room";
import {UserDataMissing} from "./user-data-missing";
import {UserNameTaken} from "./user-name-taken";
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
    static createException = (exceptionType: customExceptionType)  => {
        switch (exceptionType) {
            case customExceptionType.EXPIRED_USER_TOKEN:
                return new ExpiredUserToken();
            case customExceptionType.INVALID_ROOM_QUERY:
                return new InvalidRoomQuery();
            case customExceptionType.MISSING_QUERY_DATA:
                return new MissingQueryData();
            case customExceptionType.NO_SUCH_ROOM_EXISTS:
                return new NoSuchRoomExists();
            case customExceptionType.ROOM_DATA_MISSING:
                return new RoomDataMissing();
            case customExceptionType.ROOM_NAME_TAKEN:
                return new RoomNameTaken();
            case customExceptionType.UNAUTHORIZED_ACTION:
                return new UnauthorizedAction();
            case customExceptionType.USER_ALREADY_IN_ROOM:
                return new UserAlreadyInRoom();
            case customExceptionType.USER_DATA_MISSING:
                return new UserDataMissing();
            case customExceptionType.USER_NAME_TAKEN:
                return new UserNameTaken();
            case customExceptionType.USER_NOT_IN_ROOM:
                return new UserNotInRoom();
            case customExceptionType.PROBLEM_RETRIEVING_DATA:
                return new ProblemRetrievingData();
            case customExceptionType.PROBLEM_ADDING_USER_TO_ROOM:
                return new ProblemAddingUserToRoom();
            case customExceptionType.PROBLEM_SAVING_CHAT_HISTORY:
                return new ProblemSavingChatHistory();
            case customExceptionType.INVALID_MESSAGE_SENT:
                return new InvalidMessageSent();
            case customExceptionType.PROBLEM_UPDATING_ROOM:
                return new ProblemUpdatingRoom();
            case customExceptionType.PROBLEM_DELETING_ROOM:
                return new ProblemDeletingRoom();
            case customExceptionType.PROFANE_LANGUAGE_NOT_ALLOWED:
                return new ProfaneLanguageNotAllowed();
            case customExceptionType.UNAUTHORIZED_ACTION_NOT_ROOM_AUTHOR:
                return new UnauthorizedActionNotRoomAuthor();
            case customExceptionType.PROBLEM_SAVING_USER_SOCKET_ID:
                return new ProblemSavingUserSocketId();
            case customExceptionType.NO_USERS_IN_ROOM:
                return new NoUsersInRoom();
            case customExceptionType.PROBLEM_UPDATING_ROOMS_BANNED_USERS:
                return new ProblemUpdatingBannedUsers();
            case customExceptionType.PROBLEM_REMOVING_SOCKET_FROM_SOCKET_IO_ROOM:
                return new ProblemRemovingSocketFromSocketIORoom();
            case customExceptionType.USER_BANNED_FROM_ROOM:
                return new UserBannedFromRoom();
        }
    }
}
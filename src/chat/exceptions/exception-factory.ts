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

export class ExceptionFactory {
    static createException = (exceptionType: customExceptionType)  => {
        switch (exceptionType) {
            case customExceptionType.expiredUserToken:
                return new ExpiredUserToken();
            case customExceptionType.invalidRoomQuery:
                return new InvalidRoomQuery();
            case customExceptionType.missingQueryData:
                return new MissingQueryData();
            case customExceptionType.noSuchRoomExists:
                return new NoSuchRoomExists();
            case customExceptionType.roomDataMissing:
                return new RoomDataMissing();
            case customExceptionType.roomNameTaken:
                return new RoomNameTaken();
            case customExceptionType.unauthorizedAction:
                return new UnauthorizedAction();
            case customExceptionType.userAlreadyInRoom:
                return new UserAlreadyInRoom();
            case customExceptionType.userDataMissing:
                return new UserDataMissing();
            case customExceptionType.userNameTaken:
                return new UserNameTaken();
            case customExceptionType.userNotInRoom:
                return new UserNotInRoom();
            case customExceptionType.problemRetrievingData:
                return new ProblemRetrievingData();
            case customExceptionType.problemAddingUserToRoom:
                return new ProblemAddingUserToRoom();
        }
    }
}
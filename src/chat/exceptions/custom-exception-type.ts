export enum customExceptionType {
    unauthorizedAction = 'UNAUTHORIZED_ACTION',
    expiredUserToken = 'EXPIRED_USER_TOKEN',
    userDataMissing = 'USER_DATA_MISSING',
    userNameTaken = 'USER_NAME_TAKEN',
    userNotInRoom = 'USER_NOT_IN_ROOM',
    userAlreadyInRoom = 'USER_ALREADY_IN_ROOM',
    invalidRoomQuery = 'INVALID_ROOM_QUERY',
    missingQueryData = 'MISSING_QUERY_DATA',
    noSuchRoomExists = 'NO_SUCH_ROOM_EXISTS',
    roomDataMissing = 'ROOM_DATA_MISSING',
    roomNameTaken = 'ROOM_NAME_TAKEN',
    problemRetrievingData = 'PROBLEM_RETRIEVING_DATA',
    problemAddingUserToRoom = 'PROBLEM_ADDING_USER_TO_ROOM'
}
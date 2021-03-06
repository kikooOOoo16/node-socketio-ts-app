import {Server, Socket} from "socket.io";
import Logger from "../logger/logger";

import {ServiceFactory} from "../services/service-factory";
import {ServiceTypes} from "../services/service-types";
import {RoomPopulatedUsers} from "../interfaces/roomPopulatedUsers";
import {User} from "../interfaces/user";
import {Message} from "../interfaces/message";
import {UserTokenPayload} from "../interfaces/userTokenPayload";

import {ProblemRemovingSocketFromSocketIORoomException} from "./exceptions/room-related-exceptions/problem-removing-socket-from-socket-i-o-room-exception";
import {UserNotInRoomException} from "./exceptions/user-related-exceptions/user-not-in-room-exception";
import {UsersService} from "../services/chat-services/users-service";
import {RoomsService} from "../services/chat-services/rooms-service";
import {AuthService} from "../services/auth-services/auth-service";
import {RoomUsersManagerService} from "../services/chat-services/room-users-manager-service";
import {MessageGeneratorService} from "../services/chat-services/message-generator-service";
import {SocketEventsTypes} from "./socket-events-types";

export class SocketHelper {
    private usersService: UsersService;
    private roomsService: RoomsService;
    private roomUsersManagerService: RoomUsersManagerService;
    private authService: AuthService;
    private messageGeneratorService: MessageGeneratorService;

    constructor() {
        this.usersService = ServiceFactory.createService(ServiceTypes.USERS_SERVICE);
        this.roomsService = ServiceFactory.createService(ServiceTypes.ROOMS_SERVICE);
        this.roomUsersManagerService = ServiceFactory.createService(ServiceTypes.ROOM_USERS_MANAGER_SERVICE);
        this.messageGeneratorService = ServiceFactory.createService(ServiceTypes.MESSAGE_GENERATOR_SERVICE);
        this.authService = ServiceFactory.createService((ServiceTypes.AUTH_SERVICE));
    }

    // initial user checks and get specific room and currentUser data
    async initialUserRoomChecksAndDataRetrieval(token: string, roomName: string): Promise<{ room: RoomPopulatedUsers, currentUser: User }> {

        const tokenPayload: UserTokenPayload = await this.authService.verifyJWT(token);

        const {user: currentUser} = await this.usersService.fetchUserById(tokenPayload._id);

        const {room} = await this.roomsService.fetchRoomPopulateUsers(roomName);

        const {userIsInRoom} = this.roomUsersManagerService.checkIfUserIsInRoom(room.usersInRoom, currentUser._id, roomName);

        if (!userIsInRoom) {
            throw new UserNotInRoomException();
        }

        return {room, currentUser};
    }

    async sendInitialMessages(io: Server, socket: Socket, currentUser: User, roomName: string, callback: any) {
        // Send greetings from app msg to current socket.
        const welcomeMsg: Message = this.messageGeneratorService.generateMessage(undefined, 'Welcome to the Chat app! Please follow our guidelines.');

        // send message to specific user
        io.to(socket.id).emit(SocketEventsTypes.MESSAGE, welcomeMsg);

        // send socketIO emit to all users within the room
        const newUserInRoomMsg: Message = this.messageGeneratorService.generateMessage(undefined, `${currentUser.name} has joined the chat.`);
        socket.broadcast.to(roomName).emit(SocketEventsTypes.MESSAGE, newUserInRoomMsg);

        // return callback with roomName
        callback(roomName);
    }

// remove socket instance from SocketIO room
    removeSocketFromRoom(io: Server, user: User, roomName: string, kickOrBan: string) {
        // get socket instance by using user's socketID and call leave room on that instance
        if (user.socketId) {

            const clientSocket = io.sockets.sockets.get(user.socketId);

            if (clientSocket) {

                clientSocket.leave(roomName);

                // generate kickedFromRoomMsg and notify the client socket that it was kicked from the room
                const removedFromRoomMsg = this.messageGeneratorService.generateMessage(undefined, `You were ${kickOrBan === 'kick' ? 'kicked' : 'banned'} from the room by the admin.`);
                clientSocket.emit(kickOrBan === 'kick' ? SocketEventsTypes.KICKED_FROM_ROOM : SocketEventsTypes.BANNED_FROM_ROOM, removedFromRoomMsg);

                Logger.debug(`socket-helper: removeSocketFromRoom():  Updated socketIO room state by removing socketInstance ${user.socketId} from roomName= ${roomName}.`);
                return;
            }
            // if no client, failed to remove socket instance from SocketIO room
            Logger.error(`socket-helper: removeSocketFromRoom(): Problem removing user from SocketIO room with socketID ${user.socketId} roomName= ${roomName}`);
            throw new ProblemRemovingSocketFromSocketIORoomException();

        } else {
            // if there was no socketId for the given user return an err
            Logger.error(`socket-helper: removeSocketFromRoom(): Problem removing user from SocketIO room with socketID ${user.socketId} roomName= ${roomName}`);
            throw new ProblemRemovingSocketFromSocketIORoomException();
        }
    }

    removeAllSocketsFromRoom(io: Server, roomName: string) {
        // get socketIO clientSocket ids for all sockets that are in room
        const clientSocketIds = io.sockets.adapter.rooms.get(roomName);
        if (clientSocketIds && clientSocketIds.size !== 0) {

            for (const clientId of clientSocketIds) {

                const clientSocket = io.sockets.sockets.get(clientId);

                if (clientSocket) {
                    clientSocket.leave(roomName);
                }
            }
            Logger.debug(`socket-helper: removeAllSocketsFromRoom(): removed all sockets from SocketIO instance of the room.`);
        } else {
            Logger.warn(`socket-helper: removeAllSocketsFromRoom(): ${clientSocketIds && clientSocketIds.size === 0 ? 'There are no users in the room =' : 'Failed to retrieve the socketIds of all the clients inside the room ='} ${roomName}`);
        }
    }

    async sendUsersInRoomUpdate(io: Server, roomName: string) {
        // get latest room data
        const {room} = await this.roomsService.fetchRoomPopulateUsers(roomName);

        Logger.debug(`socket-helper: sendUsersInRoomUpdate(): Sent update with room data for room ${roomName}`);
        // send socketIO roomDataUpdate emit to all users within the room
        io.to(roomName).emit(SocketEventsTypes.ROOM_DATA_UPDATE, room);
    }

    async sendRoomsListUpdate(io: Server) {

        const {allRooms} = await this.roomsService.fetchAllRooms();

        Logger.debug('socket-helper: sendRoomsListUpdate(): Sent rooms list update');
        // send socketIO roomsListUpdate emit to all users
        io.emit(SocketEventsTypes.ROOMS_LIST_UPDATE, allRooms);
    }
}
import {ServiceTypes} from "./service-types";
import {UsersService} from "./chat-services/users-service";
import {RoomsService} from "./chat-services/rooms-service";
import {MessageGeneratorService} from "./chat-services/message-generator-service";
import {AuthService} from "./auth-services/auth-service";
import {RoomUsersManagerService} from "./chat-services/room-users-manager-service";


export class ServiceFactory {

    private static readonly serviceMap: Map<ServiceTypes, any> = new Map<ServiceTypes, any>([
        [ServiceTypes.USERS_SERVICE, UsersService.getInstance()],
        [ServiceTypes.ROOMS_SERVICE, RoomsService.getInstance()],
        [ServiceTypes.ROOM_USERS_MANAGER_SERVICE, RoomUsersManagerService.getInstance()],
        [ServiceTypes.MESSAGE_GENERATOR_SERVICE, MessageGeneratorService.getInstance()],
        [ServiceTypes.AUTH_SERVICE, AuthService.getInstance()]
    ]);

    static createService(serviceTypes: ServiceTypes) {
        return this.serviceMap.get(serviceTypes);
    }
}
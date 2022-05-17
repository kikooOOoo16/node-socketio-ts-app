import jwt from "jsonwebtoken";
import Logger from "../../logger/logger";
import * as bcrypt from "bcrypt";
import {UserTokenPayload} from "../../interfaces/userTokenPayload";
import {User} from "../../interfaces/user";
import {UnauthorizedActionException} from "../../chat/exceptions/user-related-exceptions/unauthorized-action-exception";
import {ExpiredUserTokenException} from "../../chat/exceptions/user-related-exceptions/expired-user-token-exception";
import {RoomUsersManagerService} from "../chat-services/room-users-manager-service";
import {ProblemAuthenticatingInvalidCredentialsException} from "../../chat/exceptions/user-related-exceptions/problem-authenticating-invalid-credentials-exception";
import {ProblemVerifyingUserToken} from "../../chat/exceptions/user-related-exceptions/problem-verifying-user-token";

export class AuthService {
    private static instance: AuthService;
    private roomUsersManagerService: RoomUsersManagerService;

    public static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    private constructor() {
        this.roomUsersManagerService = RoomUsersManagerService.getInstance();
    }

    async validateUserCredentials(user: User, password: string) {

        const isMatch = await bcrypt.compare(password, user.password!);
        if (!isMatch) {
            Logger.warn(`auth-service: validateUserCredentials(): failed for user ${user.name}`);
            throw new ProblemAuthenticatingInvalidCredentialsException();
        }
    }

    // verify JWT and if expired remove user from any rooms
    async verifyJWT(token: string): Promise<UserTokenPayload> {
        try {
            return jwt.verify(token, process.env.JWT_SECRET) as UserTokenPayload;
        } catch (e) {
            if (e instanceof Error) {
                Logger.warn(`auth-service: verifyJWT(): Failed to validate user auth token with err message ${e.message}`);

                if (e.name === 'TokenExpiredError') {
                    Logger.warn('auth-service: verifyJWT(): TokenExpiredErr caught, remove user if he is in any room.');

                    const payload = this.getExpiredJWTPayload(token);
                    // handle remove user from room
                    await this.roomUsersManagerService.removeUserFromAllRooms(payload._id);
                    throw new ExpiredUserTokenException();
                }
                throw new ProblemVerifyingUserToken();
            }
            throw new UnauthorizedActionException();
        }
    }

    // get user id from expired token
    getExpiredJWTPayload(token: string): UserTokenPayload {
        return jwt.verify(token, process.env.JWT_SECRET, {ignoreExpiration: true}) as UserTokenPayload;
    }

    async generateAuthToken(userId: string) {
        return jwt.sign({_id: userId}, process.env.JWT_SECRET, {expiresIn: '3h'});
    }

    async hashPassword(password: string): Promise<string> {
        return await bcrypt.hash(password, 10);
    }
}
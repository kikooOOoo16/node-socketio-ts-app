import {User} from "./src/interfaces/user";

declare global {
    namespace Express {
        export interface Request {
            token?: string;
            user?: User;
        }
    }
}
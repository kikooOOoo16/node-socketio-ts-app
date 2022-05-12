import {CustomException} from "./custom-exception";

export class ProblemRemovingSocketFromSocketIORoom extends CustomException {

    constructor() {
        super(`There was a problem removing the socket instance from the SocketIO room.`);
        Object.setPrototypeOf(this, ProblemRemovingSocketFromSocketIORoom.prototype);
    }

    printError = (): string => {
        return 'Error: There was a problem removing the socket instance from the SocketIO room.';
    }
}
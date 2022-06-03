import {AbstractException} from "../abstract-exception";

export class ProblemRemovingSocketFromSocketIORoomException extends AbstractException {

    constructor() {
        super(`There was a problem removing the socket instance from the SocketIO room.`);
        Object.setPrototypeOf(this, ProblemRemovingSocketFromSocketIORoomException.prototype);
    }

    serializeErrors(): { message: string; field?: string }[] {
        return [
            {
                message: 'Error: There was a problem removing the socket instance from the SocketIO room.'
            },
        ];
    }
}
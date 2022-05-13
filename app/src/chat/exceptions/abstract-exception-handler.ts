import {AbstractException} from "./abstract-exception";
import Logger from "../../logger/logger";

export const abstractExceptionHandler = (err: Error, callback: any) => {
    if (err instanceof AbstractException) {
        Logger.error('Custom Exception caught. Err structure is = ');
        Logger.warn(err);
        Logger.debug('SerializeErrors structure = ');
        Logger.info(err.serializeErrors());
        callback(err.serializeErrors());
    }
}
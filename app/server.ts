import {app} from './src/app';
import * as http from "http";
import {socket} from './src/chat/socket';
import Logger from "./src/logger/logger";

const normalizePort = (val: string | number) => {
    const port = parseInt( String(val), 10);
    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        //  port num
        return port;
    }
    return false;
}

const onError = (error: { syscall: string; code: any; }) => {
    if (error.syscall !== 'listen') {
        throw error;
    }
    let addr;
    const bind = typeof addr === 'string' ? 'pipe' + addr : 'port' + port;
    switch (error.code) {
        case 'EACCES':
            Logger.error(`${bind} requires elevated privileges.`);
            process.exit(1);
            break;
        case 'EADDRINUSE':
            Logger.error(`${bind} is already in use.`);
            process.exit(1);
            break;
        default:
            throw error;
    }
};

const onListening = () => {
    const addr = server.address();
    const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + port;
    Logger.debug(`\nServer is listening on ${bind}.`);
};

const port = normalizePort(process.env.PORT || 3000);
app.set('port', port);

const server = http.createServer(app);

// Enable SocketIO communication
socket(server);

server.on('error', onError);
server.on('listening', onListening);
server.listen(port);
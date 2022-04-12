import {app} from './src/app';
import * as http from "http";

const normalizePort = (val: string | number) => {
    let port = parseInt( String(val), 10);
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
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
};

const onListening = () => {
    const addr = server.address();
    const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + port;
    console.log(`\nServer is listening on ${bind}.`);
};

const port = normalizePort(process.env.PORT || 3000);
app.set('port', port);

const server = http.createServer(app);
server.on('error', onError);
server.on('listening', onListening);
server.listen(port);
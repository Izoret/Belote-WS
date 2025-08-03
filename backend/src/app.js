import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { handleMessage, handleDisconnect } from './handlers/mainController.js';

const wss = new WebSocketServer({ port: 8080 });

console.log("🟢  Serveur WebSocket démarré sur le port 8080 !");

wss.on('connection', ws => {
    ws.id = uuidv4();
    ws.send(JSON.stringify({ type: 'connection_ready', payload: { id: ws.id } }));
    console.log(`Client ${ws.id} connecté.`);

    ws.on('message', message => handleMessage(ws, message));
    ws.on('close', () => handleDisconnect(ws));
});


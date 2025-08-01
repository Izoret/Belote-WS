import { rooms } from './app.js';
import * as service from './service.js';
import * as logic from './logic.js';

export async function handleMessage(ws, message) {
    try {
        const data = JSON.parse(message);
        const { type, payload } = data;

        switch (type) {
            case "join_room":
                await service.handleJoinRoom(ws, payload);
                break;
            case "send_message":
                await service.handleChatMsg(ws, payload);
                break;
            case "start_game":
                await service.handleStartGame(ws, payload);
                break;
            case "change_team":
                await service.handleChangeTeam(ws, payload);
                break;
            case "reconnect":
                await service.handleReconnect(ws, payload);
                break;
            case "leave_room":
                handleDisconnect(ws);
                break;
            default:
                throw new Error('Type de message non reconnu');
        }
    } catch (error) {
        console.error(`Erreur pour le client ${ws.id}:`, error.message);
        ws.send(JSON.stringify({
            type: 'error',
            message: error.message
        }));
    }
}

export function handleDisconnect(ws) {
    console.log(`Client ${ws.id} déconnecté.`);
    const roomCode = ws.roomCode;
    
    if (roomCode && rooms.has(roomCode)) {
        const room = rooms.get(roomCode);

        const player = room.players.find(player => player.id === ws.id);
        room.players = room.players.filter(player => player.id !== ws.id);

        if (room.players.length === 0) {
            rooms.delete(roomCode);
            console.log(`Room ${roomCode} vide, supprimée.`);
        } else {
            room.deadPlayers.push(player);
            service.broadcastRoomUpdate(roomCode);
        }
    }
}

export function broadcastRoomUpdate(roomCode) {
    service.broadcastRoomUpdate(roomCode);
}

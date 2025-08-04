import * as roomService from '../services/roomService.js';
import * as chatService from '../services/chatService.js';
import * as gameService from '../services/gameService.js';

export async function handleMessage(ws, message) {
    try {
        const data = JSON.parse(message);
        const { type, payload } = data;

        switch (type) {
            case "join_room":
                await roomService.joinRoom(ws, payload);
                break;
            case "send_message":
                await chatService.sendMessage(ws, payload);
                break;
            case "start_game":
                await gameService.startGame(ws, payload);
                break;
            case "bid_action":
                await gameService.handleBid(ws, payload);
                break
            case 'play_card':
                gameService.playCard(ws, payload)
                break
            case "change_team":
                await roomService.changeTeam(ws, payload);
                break;
            case "reconnect":
                await roomService.reconnect(ws, payload);
                break;
            case "leave_room":
                roomService.leaveRoom(ws);
                break;
            case "end_game":
                gameService.endGame(ws, payload);
                break;
            default:
                throw new Error('Type de message non reconnu');
        }
    } catch (error) {
        console.error(`Erreur pour le client ${ws.id}:`, error.message);
        ws.send(JSON.stringify({ type: 'error', message: error.message }));
    }
}

export function handleDisconnect(ws) {
    roomService.leaveRoom(ws);
}

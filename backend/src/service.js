import { rooms } from './app.js';
import * as logic from './logic.js';

export async function handleJoinRoom(ws, { roomCode, playerName }) {
    ws.roomCode = roomCode;

    if (!rooms.has(roomCode)) {
        console.log(`Création du lobby '${roomCode}' !`);
        rooms.set(roomCode, { players: [], chat: [] });
    }

    const room = rooms.get(roomCode);

    if (room.players.length >= 4) {
        throw new Error('Le lobby est déjà plein !');
    }

    if (room.players.some(player => player.name === playerName)) {
        throw new Error('Ce nom est déjà pris dans cette room !');
    }

    room.players.push({
        id: ws.id,
        name: playerName,
        ws: ws
    });

    console.log(`Le joueur ${playerName} (${ws.id}) a rejoint la room ${roomCode}`);
    broadcastRoomUpdate(roomCode);
}

export async function handleSendMessage(ws, { text }) {
    const roomCode = ws.roomCode;
    const room = rooms.get(roomCode);
    if (!room) throw new Error('Room non trouvée');

    const sender = room.players.find(p => p.id === ws.id);
    if (!sender) throw new Error('Joueur non trouvé dans la room');

    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');

    const messagePayload = {
        author: sender.name,
        text,
        timestamp: `${hours}:${minutes}`
    };

    room.chat.push(messagePayload);
    broadcastChatMessage(roomCode, messagePayload);
}

export async function handleStartGame(ws) {
    const roomCode = ws.roomCode;
    const room = rooms.get(roomCode);

    if (!room) throw new Error('Room non trouvée');
    if (room.players.length !== 4) throw new Error('Il faut exactement 4 joueurs pour commencer');
    if (room.game) throw new Error('La partie a déjà commencé');

    console.log(`Début de partie dans la room ${roomCode} !!`);

    const deck = logic.shuffleDeck(logic.createDeck());
    const atoutPropose = deck.pop();

    room.game = {
        deck,
        atoutPropose,
        players: room.players.map(p => ({ id: p.id, name: p.name }))
    };

    broadcastGameStart(roomCode);
}

export function broadcastRoomUpdate(roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return;

    const publicPlayers = room.players.map(p => ({ id: p.id, name: p.name }));

    room.players.forEach(player => {
        player.ws.send(JSON.stringify({
            type: 'room_update',
            payload: {
                players: publicPlayers,
                chat: room.chat
            }
        }));
    });
}

export function broadcastChatMessage(roomCode, messagePayload) {
    const room = rooms.get(roomCode);
    if (!room) return;

    room.players.forEach(player => {
        player.ws.send(JSON.stringify({
            type: 'new_message',
            payload: messagePayload
        }));
    });
}

export function broadcastGameStart(roomCode) {
    const room = rooms.get(roomCode);
    if (!room || !room.game) return;

    room.players.forEach(player => {
        player.ws.send(JSON.stringify({
            type: 'game_started',
            payload: {
                players: room.game.players,
                atoutPropose: room.game.atoutPropose
            }
        }));
    });
}

import { rooms } from './app.js';
import * as logic from './logic.js';

export async function handleJoinRoom(ws, { roomCode, playerName }) {
    ws.roomCode = roomCode;

    if (!rooms.has(roomCode)) {
        console.log(`Création du lobby '${roomCode}' !`);
        rooms.set(roomCode, { players: [], chat: [], deadPlayers: [] });
    }

    const room = rooms.get(roomCode);
    const player = {
        id: ws.id,
        name: playerName,
        team: null,
        ws: ws
    };

    logic.newPlayerInRoom(room, player);

    console.log(`Le joueur ${playerName} (${ws.id}) a rejoint la room ${roomCode}`);

    broadcastRoomUpdate(roomCode);
}

export async function handleChangeTeam(ws, { team }) {
    const roomCode = ws.roomCode;
    const room = rooms.get(roomCode);
    if (!room) throw new Error('Room non trouvée');

    const player = room.players.find(p => p.id === ws.id);
    if (!player) throw new Error('Joueur non trouvé');

    player.team = team === 1 || team === 2 ? team : null;

    broadcastRoomUpdate(roomCode);
}

export async function handleChatMsg(ws, { text }) {
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
    broadcastChatMsg(roomCode, messagePayload);
}

export async function handleStartGame(ws) {
    const roomCode = ws.roomCode;
    const room = rooms.get(roomCode);

    if (!room) throw new Error('Room non trouvée');
    if (room.players.length !== 4) throw new Error('Il faut exactement 4 joueurs pour commencer');
    if (room.game) throw new Error('La partie a déjà commencé');

    const team1Count = room.players.filter(p => p.team === 1).length;
    const team2Count = room.players.filter(p => p.team === 2).length;
    if (team1Count !== 2 || team2Count !== 2) throw new Error("Les équipes ne sont pas équilibrées (2 Bleu / 2 Rouge) !");

    console.log(`Début de partie dans la room ${roomCode} !!`);

    const deck = logic.shuffleDeck(logic.createDeck());

    room.game = {
        deck,
        players: room.players.map(p => ({ 
            id: p.id,
            name: p.name,
            team: p.team,
            hand: []
        }))
    }

    broadcastGameState(roomCode)

    await new Promise(resolve => setTimeout(resolve, 1000))

    logic.dealCards(room.game.players, room.game.deck, 3)
    broadcastGameState(roomCode)

    await new Promise(resolve => setTimeout(resolve, 2000))

    logic.dealCards(room.game.players, room.game.deck, 2)
    broadcastGameState(roomCode)
}

export async function handleReconnect(ws, { oldId }) {
    let room = null;
    let oldPlayer = null;
    let roomCode = null;

    for (const [rc, r] of rooms.entries()) {
        const pl = r.deadPlayers.find(p => p.id === oldId);
        if (pl) {
            room = r;
            oldPlayer = pl;
            roomCode = rc;
            break;
        }
    }

    if (!oldPlayer || !room || !roomCode) {
        throw new Error("Reconnexion a échoué.. room code : " + roomCode);
    }
    
    const player = {
        id: ws.id,
        name: oldPlayer.name,
        team: oldPlayer.team,
        ws: ws
    };

    ws.roomCode = roomCode;

    logic.newPlayerInRoom(room, player);
    room.deadPlayers = room.deadPlayers.filter(p => p.id !== oldPlayer.id);

    console.log(`Joueur ${oldPlayer.name} (${ws.id}) reconnecté à la room ${roomCode}`);

    broadcastRoomUpdate(roomCode)
    castInfoToReconnected(ws, roomCode, oldPlayer.team)
}

// -------------CASTS-------------

export function castInfoToReconnected(ws, roomCode, team) {
    ws.send(JSON.stringify({
        type: 'f_reconnect',
        payload: {
            roomCode: roomCode,
            team: team
        }
    }));
}

export function broadcastRoomUpdate(roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return;

    const publicPlayers = room.players.map(p => ({ id: p.id, name: p.name, team: p.team }));

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

export function broadcastChatMsg(roomCode, messagePayload) {
    const room = rooms.get(roomCode);
    if (!room) return;

    room.players.forEach(player => {
        player.ws.send(JSON.stringify({
            type: 'new_message',
            payload: messagePayload
        }));
    });
}

export function broadcastGameState(roomCode) {
    const room = rooms.get(roomCode);
    if (!room || !room.game) return;

    const fullGameState = room.game

    room.players.forEach(player => {
        const personalGameState = {
            myHand: [],
            players: []
        };

        const myPlayerState = fullGameState.players.find(p => p.id === player.id);
        if (myPlayerState) {
            personalGameState.myHand = myPlayerState.hand;
        }

        personalGameState.players = fullGameState.players.map(p => {
            return {
                id: p.id,
                name: p.name,
                team: p.team,
                handSize: p.hand.length
            };
        });

        player.ws.send(JSON.stringify({
            type: 'game_state_update',
            payload: personalGameState
        }));
    });
}

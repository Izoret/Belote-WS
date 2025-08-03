import { rooms } from './app.js';
import * as logic from './logic.js';
import { broadcastDealingAnimation } from './animationController.js';

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

    const team1 = room.players.filter(p => p.team === 1);
    const team2 = room.players.filter(p => p.team === 2);
    if (team1.length !== 2 || team2.length !== 2) throw new Error("Les équipes ne sont pas équilibrées (2 Bleu / 2 Rouge) !")

    const orderedPlayers = [team1[0], team2[0], team1[1], team2[1]]

    console.log(`Début de partie dans la room ${roomCode} !!`)

    const deck = logic.shuffleDeck(logic.createDeck());

    room.game = {
        deck,
        dealerId: ws.id,
        players: orderedPlayers.map(p => ({ 
            id: p.id,
            name: p.name,
            team: p.team,
            hand: []
        })),
        bidding: {
            phase: 0,
            trumpCard: null,
            currendBidderId: null,
            takerId: null
        },
        trumpSuit: null
    }

    broadcastGameState(roomCode)

    await new Promise(resolve => setTimeout(resolve, 1000))

//    broadcastDealingAnimation(roomCode, 3);
  //  await new Promise(resolve => setTimeout(resolve, 3000));

    logic.dealCards(room.game.players, room.game.deck, 3)
    broadcastGameState(roomCode)

    await new Promise(resolve => setTimeout(resolve, 2000))

  //  broadcastDealingAnimation(roomCode, 2);
    //await new Promise(resolve => setTimeout(resolve, 2000));

    logic.dealCards(room.game.players, room.game.deck, 2)
    broadcastGameState(roomCode)

    await new Promise(resolve => setTimeout(resolve, 2000))

    room.game.bidding.trumpCard = room.game.deck.pop();
    broadcastGameState(roomCode)

    await new Promise(resolve => setTimeout(resolve, 2000))

    room.game.bidding.phase = 1;

    const dealerIndex = room.game.players.findIndex(p => p.id === ws.id);
    const firstBidderIndex = (dealerIndex + 1) % 4;
    room.game.bidding.currentBidderId = room.game.players[firstBidderIndex].id;

    broadcastGameState(roomCode)
}

export async function handleBidAction(ws, { action }) {
    const roomCode = ws.roomCode
    const room = rooms.get(roomCode)
    if (!room || !room.game) throw new Error('Game not found')
    if (ws.id !== room.game.bidding.currentBidderId) throw new Error("Not your turn to bid")

    if (room.game.bidding.phase === 1) {
        if (action === 'take') {
            const bidder = room.game.players.find(p => p.id === ws.id);
            bidder.hand.push(room.game.bidding.trumpCard);

            room.game.trumpSuit = room.game.bidding.trumpCard.suit;

            room.game.bidding.trumpCard = null;
            room.game.bidding.takerId = ws.id;
            room.game.bidding.phase = 0;
        }
        else if (action === 'pass') {
            if (room.game.bidding.currentBidderId === room.game.dealerId) room.game.bidding.phase = 2
            
            const currentIndex = room.game.players.findIndex(p => p.id === ws.id);
            const nextIndex = (currentIndex + 1) % 4;
            room.game.bidding.currentBidderId = room.game.players[nextIndex].id;
        }
    } else if (room.game.bidding.phase === 2) {
        if (action === 'pass') {
            if (room.game.bidding.currentBidderId === room.game.dealerId) {
                broadcastEndGame(roomCode);
                return;
            }

            const currentIndex = room.game.players.findIndex(p => p.id === ws.id);
            const nextIndex = (currentIndex + 1) % 4;
            room.game.bidding.currentBidderId = room.game.players[nextIndex].id;
        } else {
            const bidder = room.game.players.find(p => p.id === ws.id);
            bidder.hand.push(room.game.bidding.trumpCard);

            room.game.bidding.trumpCard = null;
            room.game.bidding.takerId = ws.id;
            room.game.bidding.phase = 0;

            room.game.trumpSuit = action
        }
    }

    broadcastGameState(roomCode);
}

export async function handleEndGame(ws, {}) {
    console.log("end game clicked!")

    const roomCode = ws.roomCode;
    const room = rooms.get(roomCode);

    if (!room) throw new Error('Room non trouvée.??');
    if (!room.game) throw new Error("Il n'y a pas de partie en cours.");

    room.game = null;

    broadcastEndGame(roomCode)
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
            type: 'new_chat_msg',
            payload: messagePayload
        }));
    });
}

export function broadcastGameState(roomCode) {
    const room = rooms.get(roomCode);
    if (!room || !room.game) return;

    const fullGameState = room.game

    room.players.forEach(player => {
        const clientGameState = {
            myHand: [],
            players: [],
            dealerId: fullGameState.dealerId,
            bidding: fullGameState.bidding,
            trumpSuit: fullGameState.trumpSuit
        };

        const myPlayerState = fullGameState.players.find(p => p.id === player.id);
        if (myPlayerState) {
            clientGameState.myHand = myPlayerState.hand;
        }

        clientGameState.players = fullGameState.players.map(p => {
            return {
                id: p.id,
                name: p.name,
                team: p.team,
                handSize: p.hand.length
            };
        });

        player.ws.send(JSON.stringify({
            type: 'game_state_update',
            payload: clientGameState
        }));
    });
}

export function broadcastEndGame(roomCode) {
     const room = rooms.get(roomCode);
     if (!room) return;

     room.players.forEach(player => {
         player.ws.send(JSON.stringify({
             type: 'game_end',
             payload: {}
         }));
     });
}


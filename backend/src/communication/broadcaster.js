import { rooms } from '../state.js';

function broadcast(roomCode, message) {
    const room = rooms.get(roomCode);
    if (!room) return;

    room.players.forEach(player => {
        player.ws.send(JSON.stringify(message));
    });
}

export function broadcastRoomUpdate(roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return;

    const publicPlayers = room.players.map(p => ({ id: p.id, name: p.name, team: p.team }));
    const message = {
        type: 'room_update',
        payload: {
            players: publicPlayers,
            chat: room.chat
        }
    };
    broadcast(roomCode, message);
}

export function broadcastChatMsg(roomCode, messagePayload) {
    const message = { type: 'new_chat_msg', payload: messagePayload };
    broadcast(roomCode, message);
}

export function broadcastGameState(roomCode) {
    const room = rooms.get(roomCode)
    if (!room || !room.game) return;

    const fullGameState = room.game

    room.players.forEach(player => {
        const clientGameState = {
            myHand: [],
            players: fullGameState.players.map(p => ({
                id: p.id,
                name: p.name,
                team: p.team,
                handSize: p.hand.length
            })),
            dealerId: fullGameState.dealerId,
            bidding: fullGameState.bidding,
            trumpSuit: fullGameState.trumpSuit,
            currentPlayerId: fullGameState.currentPlayerId,
            tricks: fullGameState.tricks
        }

        const myPlayerState = fullGameState.players.find(p => p.id === player.id);
        if (myPlayerState) {
            clientGameState.myHand = myPlayerState.hand;
        }

        player.ws.send(JSON.stringify({
            type: 'game_state_update',
            payload: clientGameState
        }));
    });
}

export function broadcastEndGame(roomCode) {
    broadcast(roomCode, { type: 'game_end', payload: {} });
}

export function broadcastDealingAnimation(roomCode, cardCount) {
    const room = rooms.get(roomCode);
    if (!room || !room.game) return;
    broadcast(roomCode, {
        type: 'dealing_start',
        payload: { cardCount, dealerId: room.game.dealerId }
    });
}


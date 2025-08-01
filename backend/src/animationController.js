import { rooms } from './app.js';

export function broadcastDealingAnimation(roomCode, cardCount) {
    const room = rooms.get(roomCode);
    if (!room || !room.game) return;

    room.players.forEach(player => {
        player.ws.send(JSON.stringify({
            type: 'dealing_start',
            payload: {
                cardCount,
                dealerId: room.game.dealerId
            }
        }));
    });
}

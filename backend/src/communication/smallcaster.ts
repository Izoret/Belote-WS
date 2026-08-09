import WebSocket from 'ws'
import {rooms} from '../state.js'

export function castConnectionReady(ws: WebSocket) {
    ws.send(JSON.stringify({
        type: 'connection_ready',
        payload: {id: ws.id}
    }))
}

export function castError(ws: WebSocket, error: string) {
    ws.send(JSON.stringify({type: 'error', message: error}))
}

export function castInfoToReconnected(ws: WebSocket, roomCode: string, team: number) {
    ws.send(JSON.stringify({
        type: 'f_reconnect',
        payload: {roomCode, team},
    }))
}

export function castGameStateIndividually(roomCode: string) {
    const room = rooms.get(roomCode)
    if (!room || !room.game) return

    const fullGameState = room.game

    room.players.forEach(player => {
        const clientGameState = {
            myHand: [],
            players: fullGameState.players.map(p => ({
                id: p.id,
                name: p.name,
                team: p.team,
                handSize: p.hand.length,
            })),
            deckSize: fullGameState.deck.length,
            dealerId: fullGameState.dealerId,
            bidding: fullGameState.bidding,
            trumpSuit: fullGameState.trumpSuit,
            currentPlayerId: fullGameState.currentPlayerId,
            tricks: fullGameState.tricks,
        }

        const myPlayerState = fullGameState.players.find(p => p.id === player.id)
        if (myPlayerState) {
            clientGameState.myHand = myPlayerState.hand
        }

        player.ws.send(JSON.stringify({
            type: 'game_state_update',
            payload: clientGameState,
        }))
    })
}

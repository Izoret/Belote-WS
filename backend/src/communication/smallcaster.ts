import WebSocket from 'ws'
import {Room} from '../types/types.js'
import {getGameSafely} from '../logic/validationLogic.js'

export function castConnectionReady(ws: WebSocket) {
    ws.send(JSON.stringify({
        type: 'connection_ready',
        payload: {id: ws.id},
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

export function castGameStateIndividually(room: Room) {
    const fullGameState = getGameSafely(room)

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
            dealerId: fullGameState.dealer.id,
            bidding: fullGameState.bidding,
            trumpSuit: fullGameState.trumpSuit,
            currentPlayerId: fullGameState.currentPlayer.id,
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

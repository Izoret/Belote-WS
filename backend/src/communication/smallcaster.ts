import WebSocket from 'ws'
import {Card, Room} from '../types/types.js'
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
    const game = getGameSafely(room)

    room.members.forEach(player => {
        const reducedGameState = {
            myHand: [] as Card[],
            players: game.players.map(p => ({
                id: p.id,
                name: p.name,
                team: p.team,
                handSize: p.hand.length,
            })),
            deckSize: game.deck.length,
            dealerId: game.dealer.id,
            bidding: game.bidding,
            trumpSuit: game.trumpSuit,
            currentPlayerId: game.currentPlayer.id,
            tricks: {currentTrick: game.currentTrick},
        }

        const myPlayerState = game.players.find(p => p.id === player.id)
        if (myPlayerState) {
            reducedGameState.myHand = myPlayerState.hand
        }

        player.ws.send(JSON.stringify({
            type: 'game_state_update',
            payload: reducedGameState,
        }))
    })
}

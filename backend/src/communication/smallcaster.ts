import WebSocket from 'ws'
import {Room} from '../types/types.js'
import {getGameSafely} from '../logic/validationLogic.js'
import * as beloteLogic from '../logic/beloteLogic.js'

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
        payload: {roomCode, team}
    }))
}

export function castGameStateIndividually(room: Room) {
    const game = getGameSafely(room)

    room.members.forEach(member => {
        const reducedGameState = {
            myHand: [] as any[],
            players: game.players.map(p => ({
                id: p.id,
                name: p.name,
                team: p.team,
                handSize: p.hand.length
            })),
            deckSize: game.deck.length,
            dealerId: game.dealer.id,
            bidding: game.bidding,
            trumpSuit: game.trumpSuit,
            currentPlayerId: game.currentPlayer.id,
            tricks: {currentTrick: game.currentTrick}
        }

        const playerState = game.players.find(p => p.id === member.id)
        if (!playerState) throw new Error('Player not found in game')

        const allowedCards = new Set(
            (game.currentTrick.length > 0)
                ? beloteLogic.cardsAllowedInHandForTrick(playerState.hand, game.currentTrick, playerState.team, game.trumpSuit)
                : playerState.hand
        )
        reducedGameState.myHand = playerState.hand.map(card => ({
            ...card,
            playable: allowedCards.has(card)
        }))

        member.ws.send(JSON.stringify({
            type: 'game_state_update',
            payload: reducedGameState
        }))
    })
}

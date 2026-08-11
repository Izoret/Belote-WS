import WebSocket from 'ws'
import {Room} from '../types/types.js'
import {getGameSafely} from '../logic/validationLogic.js'
import * as beloteLogic from '../logic/beloteLogic.js'
import {cast} from './caster.js'

export function castConnectionReady(ws: WebSocket) {
    cast(ws, {
        type: 'connection_ready',
        payload: {id: ws.id}
    })
}

export function castError(ws: WebSocket, error: string) {
    cast(ws, {type: 'error', payload: {message: error}})
}

export function castGameStateIndividually(room: Room) {
    const game = getGameSafely(room)

    const lastTrick = game.tricks[game.tricks?.length - 1]

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
            currentTrick: lastTrick
        }

        const playerState = game.players.find(p => p.id === member.id)
        if (!playerState) throw new Error('Player not found in game')

        const allowedCards = new Set(
            (lastTrick.length > 0)
                ? beloteLogic.cardsAllowedInHandForTrick(playerState.hand, lastTrick, playerState.team, game.trumpSuit)
                : playerState.hand
        )
        reducedGameState.myHand = playerState.hand.map(card => ({
            ...card,
            playable: allowedCards.has(card)
        }))

        cast(member.ws, {
            type: 'game_state_update',
            payload: reducedGameState
        })
    })
}

import {rooms} from '../state.js'
import WebSocket from 'ws'
import {Game, Room} from '../types/types.js'

export function validateJoinRequestInfo(roomCode: string, playerName: string) {
    if (!playerName.trim() || !roomCode.trim()) throw new Error('Remplir le formulaire pour rejoindre.')
}

export function getRoomSafely(ws: WebSocket) {
    if (!ws.roomCode) throw new Error("Pas de room?")
    const room = rooms.get(ws.roomCode)
    if (!room) throw new Error("Room n'existe plus?")
    return room
}

export function getGameSafely(room: Room) {
    const game = room.game
    if (!game) throw new Error("Room sans game (pas commencé?)")
    return game
}

export function verifyTrumpCardExists(game: Game) {
    if (!game.bidding.trumpCard) throw new Error('Trump card is undefined??')
}
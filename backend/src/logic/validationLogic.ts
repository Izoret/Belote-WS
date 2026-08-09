import WebSocket from 'ws'
import {rooms} from '../state.js'

export function validateJoinRequestInfo(roomCode: string, playerName: string) {
    if (!playerName.trim() || !roomCode.trim()) throw new Error('Remplir le formulaire pour rejoindre.')
}

export function getRoomSafely(ws: WebSocket) {
    if (!ws.roomCode) throw new Error("Pas de room?")
    const room = rooms.get(ws.roomCode)
    if (!room) throw new Error("Room n'existe plus?")
    return room
}
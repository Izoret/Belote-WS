import * as broadcaster from '../communication/broadcaster.js'
import WebSocket from 'ws'
import {getRoomSafely} from '../logic/validationLogic.js'

export function sendChatMessage(ws: WebSocket, {text}) {
    const room = getRoomSafely(ws)

    const sender = room.players.find(p => p.id === ws.id)
    if (!sender) throw new Error('Joueur non trouvé dans la room')

    const now = new Date()
    const messagePayload = {
        author: sender.name,
        text,
        timestamp: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
    }

    room.chat.push(messagePayload)
    broadcaster.broadcastChatMsg(ws.roomCode, messagePayload)
}

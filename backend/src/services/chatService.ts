import * as broadcaster from '../communication/broadcaster.js'
import WebSocket from 'ws'
import {getRoomSafely} from '../logic/validationLogic.js'

export function sendChatMessage(ws: WebSocket, text: string) {
    const room = getRoomSafely(ws)

    const sender = room.members.find(p => p.id === ws.id)
    if (!sender) throw new Error('Joueur non trouvé dans la room')

    const now = new Date()
    const chatMessagePayload = {
        author: sender.name,
        text,
        timestamp: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
    }

    room.chat.push(chatMessagePayload)
    broadcaster.broadcastChatMsg(room, chatMessagePayload)
}

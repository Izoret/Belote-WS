import { rooms } from '../state.js'
import * as broadcaster from '../communication/broadcaster.js'

export function sendMessage(ws, { text }) {
    const room = rooms.get(ws.roomCode)
    if (!room) throw new Error('Room non trouvée')

    const sender = room.players.find(p => p.id === ws.id)
    if (!sender) throw new Error('Joueur non trouvé dans la room')

    const now = new Date()
    const messagePayload = {
        author: sender.name,
        text,
        timestamp: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    }

    room.chat.push(messagePayload)
    broadcaster.broadcastChatMsg(ws.roomCode, messagePayload)
}


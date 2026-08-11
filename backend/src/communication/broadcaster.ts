import {ChatMessage, Room, WSMessage} from '../types/types.js'
import {cast} from './caster.js'

function broadcast(room: Room, message: WSMessage) {
    room.members.forEach(player => {
        cast(player.ws, message)
    })
}

export function broadcastRoomUpdate(room: Room) {
    const publicInfoOfMembers = room.members.map(p => ({id: p.id, name: p.name, team: p.team}))
    const message = {
        type: 'room_update',
        payload: {
            members: publicInfoOfMembers,
            chat: room.chat
        }
    }
    broadcast(room, message)
}

export function broadcastChatMsg(room: Room, chatMsgPayload: ChatMessage) {
    const message = {type: 'new_chat_msg', payload: chatMsgPayload}
    broadcast(room, message)
}

export function broadcastEndGame(room: Room) {
    broadcast(room, {type: 'game_end', payload: {}})
}


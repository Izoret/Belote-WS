import {ChatMessage, Room} from '../types/types.js'

function broadcast(room: Room, message: any) {
    room.players.forEach(player => {
        player.ws.send(JSON.stringify(message))
    })
}

export function broadcastRoomUpdate(room: Room) {
    const publicPlayers = room.players.map(p => ({id: p.id, name: p.name, team: p.team}))
    const message = {
        type: 'room_update',
        payload: {
            players: publicPlayers,
            chat: room.chat,
        },
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

export function broadcastDealingAnimation(room: Room, cardCount: number) {
    if (!room.game) return
    broadcast(room, {
        type: 'dealing_start',
        payload: {cardCount, dealerId: room.game.dealer.id},
    })
}


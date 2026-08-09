import {rooms} from '../state.js'

function broadcast(room: any, message: any) {
    room.players.forEach(player => {
        player.ws.send(JSON.stringify(message))
    })
}

export function broadcastRoomUpdate(room: any) {
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

export function broadcastChatMsg(room: any, messagePayload) {
    const message = {type: 'new_chat_msg', payload: messagePayload}
    broadcast(room, message)
}

export function broadcastEndGame(room: any) {
    broadcast(room, {type: 'game_end', payload: {}})
}

export function broadcastDealingAnimation(roomCode, cardCount) {
    const room = rooms.get(roomCode)
    if (!room || !room.game) return
    broadcast(room, {
        type: 'dealing_start',
        payload: {cardCount, dealerId: room.game.dealerId},
    })
}


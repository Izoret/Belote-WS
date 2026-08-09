import {rooms} from '../state.js'
import * as playersLogic from '../logic/playersLogic.js'
import {getPlayerSafely} from '../logic/playersLogic.js'
import * as broadcaster from '../communication/broadcaster.js'
import * as smallcaster from '../communication/smallcaster.js'
import {getRoomSafely, validateJoinRequestInfo} from '../logic/validationLogic.js'
import WebSocket from 'ws'
import {Player, Room} from '../types/types.js'

export function joinOrCreateRoom(ws: WebSocket, roomCode: string, playerName: string) {
    validateJoinRequestInfo(roomCode, playerName)

    const player: Player = {id: ws.id, name: playerName, team: 0, hand: [], ws: ws}

    roomCode = roomCode.toUpperCase()
    ws.roomCode = roomCode

    let room: Room
    if (rooms.has(roomCode)) {
        room = rooms.get(roomCode)!
        playersLogic.validatePlayerInRoom(room, player)
    } else {
        console.log(`Création du lobby '${roomCode}' !`)
        room = {code: roomCode, members: [], chat: [], deadPlayers: []}
        rooms.set(roomCode, room)
    }

    room.members.push(player)

    console.log(`Le joueur ${playerName} (${ws.id}) a rejoint la room ${roomCode}`)
    broadcaster.broadcastRoomUpdate(room)
}

export function leaveRoom(ws: WebSocket) {
    const userId = ws.id

    const room = getRoomSafely(ws)
    const player = room.members.find(p => p.id === userId)

    if (player) room.deadPlayers.push(player)

    room.members = room.members.filter(p => p.id !== userId)
    console.log(`Client ${userId} déconnecté de la room ${room.code}.`)

    if (room.members.length === 0) {
        rooms.delete(room.code)
        console.log(`Room ${room.code} vide, supprimée.`)
    } else {
        broadcaster.broadcastRoomUpdate(room)
    }
}

export function changeTeam(ws: WebSocket, newTeam: number) {
    const room = getRoomSafely(ws)
    const player = getPlayerSafely(ws, room)

    player.team = newTeam
    broadcaster.broadcastRoomUpdate(room)
}

export function reconnect(ws: WebSocket, oldId: string) {
    if (rooms.size <= 0) smallcaster.castError(ws, "No room anymore so I can't reconnect you sry")

    for (const [roomCode, room] of rooms.entries()) {
        const index = room.deadPlayers.findIndex(p => p.id === oldId)
        if (index === -1) continue

        const [oldPlayer] = room.deadPlayers.splice(index, 1)

        const newPlayer: Player = {id: ws.id, name: oldPlayer.name, team: oldPlayer.team, hand: oldPlayer.hand, ws}

        ws.roomCode = roomCode
        room.members.push(newPlayer)

        console.log(`Joueur ${newPlayer.name} (${ws.id}) reconnecté à la room ${roomCode}`)

        broadcaster.broadcastRoomUpdate(room)
        if (room.game) {
            room.game.players.find(p => p.id === oldPlayer.id)!.id = newPlayer.id
            smallcaster.castGameStateIndividually(room)
        }

        break
    }
}

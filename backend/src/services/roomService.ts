import {rooms} from '../state.js'
import * as playersLogic from '../logic/playersLogic.js'
import * as broadcaster from '../communication/broadcaster.js'
import * as smallcaster from '../communication/smallcaster.js'
import {getRoomSafely, validateJoinRequestInfo} from '../logic/validationLogic.js'
import WebSocket from 'ws'
import {Player, Room} from '../types/types.js'

export function joinOrCreateRoom(ws: WebSocket, roomCode: string, playerName: string) {
    validateJoinRequestInfo(roomCode, playerName)

    roomCode = roomCode.toUpperCase()
    ws.roomCode = roomCode

    let room: Room
    if (rooms.has(roomCode)) {
        room = rooms.get(roomCode)!
    } else {
        console.log(`Création du lobby '${roomCode}' !`)
        room = {code: roomCode, players: [], chat: [], deadPlayers: []}
        rooms.set(roomCode, room)
    }

    const player: Player = {id: ws.id, name: playerName, team: 0, ws: ws}

    playersLogic.validatePlayerInRoom(room, player)
    room.players.push(player)

    console.log(`Le joueur ${playerName} (${ws.id}) a rejoint la room ${roomCode}`)
    broadcaster.broadcastRoomUpdate(room)
}

export function leaveRoom(ws: WebSocket) {
    const userId = ws.id

    const room = getRoomSafely(ws)
    const player = room.players.find(p => p.id === userId)

    if (player) room.deadPlayers.push(player)

    room.players = room.players.filter(p => p.id !== userId)
    console.log(`Client ${userId} déconnecté de la room ${room.code}.`)

    if (room.players.length === 0) {
        rooms.delete(room.code)
        console.log(`Room ${room.code} vide, supprimée.`)
    } else {
        broadcaster.broadcastRoomUpdate(room)
    }
}

export function changeTeam(ws: WebSocket, {team}) {
    const room = getRoomSafely(ws)

    const player = room.players.find(p => p.id === ws.id)
    if (!player) throw new Error('Joueur non trouvé')

    player.team = team === 1 || team === 2 ? team : null
    broadcaster.broadcastRoomUpdate(room)
}

export function reconnect(ws: WebSocket, oldId: string) {
    if (rooms.empty()) return

    for (const [roomCode, room] of rooms.entries()) {
        const index = room.deadPlayers.findIndex(p => p.id === oldId)
        if (index === -1) continue

        const [oldPlayer] = room.deadPlayers.splice(index, 1)

        const newPlayer: Player = {id: ws.id, name: oldPlayer.name, team: oldPlayer.team, ws}

        ws.roomCode = roomCode
        room.players.push(newPlayer)

        console.log(`Joueur ${newPlayer.name} (${ws.id}) reconnecté à la room ${roomCode}`)

        broadcaster.broadcastRoomUpdate(room)
        smallcaster.castInfoToReconnected(ws, roomCode, newPlayer.team)
        return
    }
}

import { rooms } from '../state.js'
import * as playersLogic from '../logic/playersLogic.js'
import * as broadcaster from '../communication/broadcaster.js'
import * as smallcaster from '../communication/smallcaster.js'

export function joinRoom(ws, { roomCode, playerName }) {
    ws.roomCode = roomCode

    if (!rooms.has(roomCode)) {
        console.log(`Création du lobby '${roomCode}' !`)
        rooms.set(roomCode, { players: [], chat: [], deadPlayers: [] })
    }

    const room = rooms.get(roomCode)
    const player = { id: ws.id, name: playerName, team: null, ws: ws }

    playersLogic.validatePlayerInRoom(room, player)
    room.players.push(player)

    console.log(`Le joueur ${playerName} (${ws.id}) a rejoint la room ${roomCode}`)
    broadcaster.broadcastRoomUpdate(roomCode)
}

export function leaveRoom(ws) {
    const { id, roomCode } = ws
    if (!roomCode || !rooms.has(roomCode)) return

    const room = rooms.get(roomCode)
    const player = room.players.find(p => p.id === id)

    if (player) {
        room.deadPlayers.push(player)
    }
    
    room.players = room.players.filter(p => p.id !== id)
    console.log(`Client ${id} déconnecté de la room ${roomCode}.`)

    if (room.players.length === 0) {
        rooms.delete(roomCode)
        console.log(`Room ${roomCode} vide, supprimée.`)
    } else {
        broadcaster.broadcastRoomUpdate(roomCode)
    }
}

export function changeTeam(ws, { team }) {
    const room = rooms.get(ws.roomCode)
    if (!room) throw new Error('Room non trouvée')

    const player = room.players.find(p => p.id === ws.id)
    if (!player) throw new Error('Joueur non trouvé')

    player.team = team === 1 || team === 2 ? team : null
    broadcaster.broadcastRoomUpdate(ws.roomCode)
}

export function reconnect(ws, { oldId }) {
    let room, oldPlayer, roomCode

    for (const [rc, r] of rooms.entries()) {
        const pl = r.deadPlayers.find(p => p.id === oldId)
        if (pl) {
            [room, oldPlayer, roomCode] = [r, pl, rc]
            break
        }
    }

    if (!room) return

    const newPlayer = { id: ws.id, name: oldPlayer.name, team: oldPlayer.team, ws: ws }
    ws.roomCode = roomCode

    room.players.push(newPlayer)
    room.deadPlayers = room.deadPlayers.filter(p => p.id !== oldId)

    console.log(`Joueur ${newPlayer.name} (${ws.id}) reconnecté à la room ${roomCode}`)

    broadcaster.broadcastRoomUpdate(roomCode)
    smallcaster.castInfoToReconnected(ws, roomCode, newPlayer.team)
}


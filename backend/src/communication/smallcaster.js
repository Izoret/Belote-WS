import { rooms } from '../state.js'

export function castInfoToReconnected(ws, roomCode, team) {
    ws.send(JSON.stringify({
        type: 'f_reconnect',
        payload: { roomCode, team }
    }))
}


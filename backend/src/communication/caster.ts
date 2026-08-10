import WebSocket from 'ws'
import {WSMessage} from '../types/types.js'

export function cast(ws: WebSocket, msg: WSMessage) {
    ws.send(JSON.stringify(msg))
}
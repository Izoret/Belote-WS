import {WebSocketServer} from 'ws'
import {v4 as uuidv4} from 'uuid'
import {castConnectionReady} from './communication/smallcaster.js'
import * as controller from './communication/controller.js'

const wss = new WebSocketServer({port: 8080})

console.log("🟢  Serveur WebSocket démarré sur le port 8080 !")

wss.on('connection', ws => {
    ws.id = uuidv4()

    castConnectionReady(ws)

    console.log(`Client ${ws.id} connecté.`)

    ws.on('message', message => controller.handleMessage(ws, message))
    ws.on('close', () => controller.handleDisconnect(ws))
})

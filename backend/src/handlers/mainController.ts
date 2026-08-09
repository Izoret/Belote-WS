import * as roomService from '../services/roomService.js'
import * as chatService from '../services/chatService.js'
import * as gameService from '../services/gameService.js'
import WebSocket from 'ws'
import {castError} from '../communication/smallcaster.js'

export async function handleMessage(ws: WebSocket, message: any) {
    try {
        const data = JSON.parse(message)
        const {type, payload} = data

        switch (type) {
            case "join_room":
                await roomService.joinOrCreateRoom(ws, payload)
                break
            case "send_message":
                await chatService.sendChatMessage(ws, payload)
                break
            case "start_game":
                await gameService.startGame(ws, payload)
                break
            case "bid_action":
                await gameService.handleBid(ws, payload)
                break
            case 'play_card':
                await gameService.playCard(ws, payload)
                break
            case "change_team":
                await roomService.changeTeam(ws, payload)
                break
            case "reconnect":
                await roomService.reconnect(ws, payload)
                break
            case "leave_room":
                roomService.leaveRoom(ws)
                break
            case "end_game":
                gameService.endGame(ws, payload)
                break
            default:
                castError(ws, 'Type de message non reconnu')
        }
    } catch (error: any) {
        console.error(`Erreur pour le client ${ws.id}:`, error.message)
        castError(ws, error.message)
    }
}

export function handleDisconnect(ws: WebSocket) {
    roomService.leaveRoom(ws)
}

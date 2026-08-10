import * as roomService from '../services/roomService.js'
import * as chatService from '../services/chatService.js'
import * as gameService from '../services/gameService.js'
import {endGameIfPanicked} from '../services/gameService.js'
import WebSocket from 'ws'
import {castError} from '../communication/smallcaster.js'
import {WSMessage} from '../types/types.js'

export async function handleMessage(ws: WebSocket, message: any) {
    try {
        const data: WSMessage = JSON.parse(message)
        const {type, payload} = data

        switch (type) {
            case "reconnect":
                roomService.reconnect(ws, payload.oldId)
                break
            case "join_room":
                roomService.joinOrCreateRoom(ws, payload.roomCode, payload.playerName)
                break
            case "send_message":
                chatService.sendChatMessage(ws, payload.text)
                break
            case "start_game":
                await gameService.startGame(ws)
                break
            case "bid_action":
                await gameService.handleBid(ws, payload.takeTrumpCard, payload.secondTurnChosenSuit)
                break
            case 'play_card':
                await gameService.playCard(ws, payload.card)
                break
            case "change_team":
                roomService.changeTeam(ws, payload.newTeam)
                break
            case "leave_room":
                roomService.leaveRoom(ws)
                break
            case "end_game":
                gameService.endGame(ws)
                break
            default:
                castError(ws, 'Type de message non reconnu')
        }
    } catch (error: any) {
        console.error(`Erreur pour le client ${ws.id}:`, error.message)
        endGameIfPanicked(ws)
        castError(ws, error.message)
    }
}

export function handleDisconnect(ws: WebSocket) {
    roomService.leaveRoom(ws)
}

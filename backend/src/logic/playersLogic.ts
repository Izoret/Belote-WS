import {Game, Player, Room} from '../types/types.js'
import WebSocket from 'ws'

export function getPlayerSafely(ws: WebSocket, room: Room): Player {
    const player = room.members.find(p => p.id === ws.id)
    if (!player) throw new Error('Joueur non trouvé')
    return player
}

export function verifyItsMyTurn(ws: WebSocket, game: Game) {
    if (ws.id !== game.currentPlayer.id) throw new Error("Not your turn.....")
}

export function validatePlayerInRoom(room: Room, newPlayer: Player) {
    if (room.members.length >= 4) throw new Error('Le lobby est déjà plein !')
    if (room.members.some(player => player.name === newPlayer.name)) throw new Error('Ce nom est déjà pris dans cette room !')
}

export function validateTeams(players: Player[]): { team1: Player[], team2: Player[] } {
    if (players.length !== 4) throw new Error('Il faut exactement 4 joueurs pour commencer')
    const team1 = players.filter(p => p.team === 1)
    const team2 = players.filter(p => p.team === 2)
    if (team1.length !== 2 || team2.length !== 2) throw new Error("Les équipes ne sont pas équilibrées (2 Bleu / 2 Rouge) !")
    return {team1, team2}
}

export function determinePlayerOrder(teams: { team1: Player[], team2: Player[] }): Player[] {
    const {team1, team2} = teams
    return [team1[0], team2[0], team1[1], team2[1]]
}

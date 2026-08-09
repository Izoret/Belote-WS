import WebSocket from 'ws'

export type Player = {
    id: string,
    name: string,
    team: number,
    ws: WebSocket
}

export type Room = {
    code: string,
    players: Player[],
    deadPlayers: Player[]
    chat: ChatMessage[],
    game?: Game
}

export type Game = {
    players: Player[],
    currentPlayer: Player,
    deck,
    dealer: Player,
    bidding: {
        phase: number,
        trumpCard: null,
        takerId: null
    },
    trumpSuit: null,
    tricks: {
        currentTrick: never[]
    }
}

export type ChatMessage = {
    author: string, // name of player is enough
    text: string,
    timestamp: string,
}

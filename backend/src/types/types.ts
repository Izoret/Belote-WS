import WebSocket from 'ws'

export type Player = {
    id: string
    name: string
    team: number
    hand: Card[]
    ws: WebSocket
}

export type Room = {
    code: string
    members: Player[]
    deadPlayers: Player[]
    chat: ChatMessage[]
    game?: Game
}

export type Game = {
    players: Player[]
    currentPlayer: Player
    deck: Card[]
    dealer: Player
    bidding: {
        phase: number
        trumpCard?: Card
        taker?: Player
    }
    trumpSuit?: Suit
    currentTrick: CardPlayed[]
}

export type Value = '7' | '8' | '9' | '10' | 'jack' | 'queen' | 'king' | 'ace'
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
export type Card = {
    suit: Suit
    value: Value
}
export type CardPlayed = {
    card: Card
    byPlayer: Player
}

export type ChatMessage = {
    author: string, // name of player is enough
    text: string
    timestamp: string
}

export type WSMessage = {
    type: string
    payload: unknown
}

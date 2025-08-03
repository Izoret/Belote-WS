import { rooms } from '../state.js'
import * as beloteLogic from '../logic/beloteLogic.js'
import * as broadcaster from '../communication/broadcaster.js'

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export async function startGame(ws) {
    const roomCode = ws.roomCode
    const room = rooms.get(roomCode)
    if (!room) throw new Error('Room non trouvée')
    if (room.game) throw new Error('La partie a déjà commencé')

    const teams = beloteLogic.validateTeams(room.players)
    const orderedPlayers = beloteLogic.determinePlayerOrder(room.players, teams)
    const deck = beloteLogic.shuffleDeck(beloteLogic.createDeck())

    console.log(`Début de partie dans la room ${roomCode} !!`)

    room.game = {
        deck,
        dealerId: ws.id,
        players: orderedPlayers.map(p => ({ id: p.id, name: p.name, team: p.team, hand: [] })),
        bidding: { phase: 0, trumpCard: null, currentBidderId: null, takerId: null },
        trumpSuit: null
    }

    broadcaster.broadcastGameState(roomCode)
    await sleep(1000)

    // First deal
    beloteLogic.dealCards(room.game.players, room.game.deck, 3)
    broadcaster.broadcastGameState(roomCode)
    await sleep(2000)

    // Second deal
    beloteLogic.dealCards(room.game.players, room.game.deck, 2)
    broadcaster.broadcastGameState(roomCode)
    await sleep(2000)
    
    // Reveal trump card
    room.game.bidding.trumpCard = room.game.deck.pop()
    broadcaster.broadcastGameState(roomCode)
    await sleep(2000)

    // Start bidding
    room.game.bidding.phase = 1
    const dealerIndex = room.game.players.findIndex(p => p.id === ws.id)
    const firstBidderIndex = (dealerIndex + 1) % 4
    room.game.bidding.currentBidderId = room.game.players[firstBidderIndex].id

    broadcaster.broadcastGameState(roomCode)
}

export async function handleBid(ws, { action }) {
    const roomCode = ws.roomCode
    const room = rooms.get(roomCode)
    const { game } = room
    if (!game) throw new Error('Game not found')
    if (ws.id !== game.bidding.currentBidderId) throw new Error("Not your turn to bid")

    const bidderIndex = game.players.findIndex(p => p.id === ws.id)
    const nextBidder = game.players[(bidderIndex + 1) % 4]

    if (game.bidding.phase === 1) {
        if (action === 'take') {
            takeTrumpCard(ws, game, game.bidding.trumpCard.suit)
        } else if (action === 'pass') {
            if (game.bidding.currentBidderId === game.dealerId) game.bidding.phase = 2
            game.bidding.currentBidderId = nextBidder.id
        }
    } else if (game.bidding.phase === 2) {
        if (action === 'pass') {
             if (game.bidding.currentBidderId === game.dealerId) {
                endGame(ws) // Everyone passed, end the game
                return
            }
            game.bidding.currentBidderId = nextBidder.id
        } else {
            takeTrumpCard(ws, game, action)
        }
    }

    broadcaster.broadcastGameState(roomCode)
}

async function takeTrumpCard(ws, game, newSuit) {
    const bidder = game.players.find(p => p.id === ws.id)
             bidder.hand.push(game.bidding.trumpCard)
             game.trumpSuit = newSuit
             game.bidding.trumpCard = null
    game.bidding.takerId = ws.id
    game.bidding.phase = 0
    broadcaster.broadcastGameState(ws.roomCode)
    await sleep(2000)
    await dealFinalCards(ws.roomCode)
}

async function dealFinalCards(roomCode) {
    const room = rooms.get(roomCode)
    if (!room || !room.game) return

    const taker = room.game.players.find(p => p.id === room.game.bidding.takerId)
    room.game.players.forEach(player => {
        const dealCount = (player.id === taker.id) ? 2 : 3
        beloteLogic.dealCards([player], room.game.deck, dealCount)
    })

    broadcaster.broadcastGameState(roomCode)
}

export function endGame(ws) {
    const roomCode = ws.roomCode
    const room = rooms.get(roomCode)
    if (!room) throw new Error('Room non trouvée.')
    if (!room.game) throw new Error("Il n'y a pas de partie en cours.")
    
    console.log(`Partie terminée dans la room ${roomCode}.`)
    room.game = null
    broadcaster.broadcastEndGame(roomCode)
}


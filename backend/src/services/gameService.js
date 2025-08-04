import { rooms } from '../state.js'
import * as beloteLogic from '../logic/beloteLogic.js'
import * as playersLogic from '../logic/playersLogic.js'
import * as broadcaster from '../communication/broadcaster.js'

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export async function startGame(ws) {
    const roomCode = ws.roomCode
    const room = rooms.get(roomCode)
    if (!room) throw new Error('Room non trouvée')
    if (room.game) throw new Error('La partie a déjà commencé')

    const teams = playersLogic.validateTeams(room.players)
    const orderedPlayers = playersLogic.determinePlayerOrder(room.players, teams)
    const deck = beloteLogic.shuffleDeck(beloteLogic.createDeck())

    console.log(`Début de partie dans la room ${roomCode} !!`)

    room.game = {
        deck,
        dealerId: ws.id,
        players: orderedPlayers.map(p => ({
            id: p.id, 
            name: p.name, 
            team: p.team, 
            hand: [] 
        })),
        bidding: {
            phase: 0,
            trumpCard: null, 
            takerId: null
        },
        trumpSuit: null,
        currentPlayerId: null,
        tricks: {
            currentTrick: [],
        }
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

    await startBidding(ws, room)
}

async function startBidding(ws, room) {
    room.game.bidding.phase = 1
    const dealerIndex = room.game.players.findIndex(p => p.id === ws.id)
    const firstBidderIndex = (dealerIndex + 1) % 4
    room.game.currentPlayerId = room.game.players[firstBidderIndex].id

    broadcaster.broadcastGameState(ws.roomCode)
}

export async function handleBid(ws, { action }) {
    const roomCode = ws.roomCode
    const room = rooms.get(roomCode)
    const { game } = room
    if (!game) throw new Error('Game not found')
    if (ws.id !== game.currentPlayerId) throw new Error("Not your turn to bid")

    const bidderIndex = game.players.findIndex(p => p.id === ws.id)
    const nextBidder = game.players[(bidderIndex + 1) % 4]

    if (game.bidding.phase === 1) {
        if (action === 'take') {
            takeTrumpCard(ws, game, game.bidding.trumpCard.suit)
        } else if (action === 'pass') {
            if (game.currentPlayerId === game.dealerId) game.bidding.phase = 2
            game.currentPlayerId = nextBidder.id
        }
    } else if (game.bidding.phase === 2) {
        if (action === 'pass') {
             if (game.currentPlayerId === game.dealerId) {
                endGame(ws) // Everyone passed, end the game
                return
            }
            game.currentPlayerId = nextBidder.id
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

    await sleep(1000)

    startTricking(room)
}

async function startTricking(ws) {
    const room = rooms.get(ws.roomCode)
    if (!room || !room.game) return

    const dealerIndex = room.game.players.findIndex(p => p.id === room.game.dealerId)
    const firstPlayerIndex = (dealerIndex + 1) % 4
    room.game.currentPlayerId = room.game.players[firstPlayerIndex].id

    broadcaster.broadcastGameState(ws.roomCode)
}

export async function playCard(ws, { card }) {
    const roomCode = ws.roomCode;
    const room = rooms.get(roomCode);
    const game = room.game;
    if (!game || ws.id !== game.currentPlayerId) return;

    const player = game.players.find(p => p.id === ws.id);
    const cardIndex = player.hand.findIndex(c => c.suit === card.suit && c.value === card.value);

    if (cardIndex === -1) throw new Error("Card not in hand.");

    // TODO Basic validation passed, for now we trust the client on rules
    // A complete implementation would validate the move here (e.g., beloteLogic.isMoveValid(...))

    player.hand.splice(cardIndex, 1);
    game.tricks.currentTrick.push({ card, playerId: ws.id });

    // If trick is not full, pass turn to next player
    if (game.tricks.currentTrick.length < 4) {
        const currentPlayerIndex = game.players.findIndex(p => p.id === ws.id);
        const nextPlayerIndex = (currentPlayerIndex + 1) % 4;
        game.currentPlayerId = game.players[nextPlayerIndex].id;
    } else {
        // Trick is complete, determine winner
        const winnerId = beloteLogic.determineTrickWinner(game.tricks.currentTrick, game.trumpSuit);
        const winner = game.players.find(p => p.id === winnerId);

        if (winner.team === 1) console.log("team 1 won the trick !!")
        else console.log("team 2 won the trick!!")

        game.currentPlayerId = winnerId; // Winner starts the next trick
        broadcaster.broadcastGameState(roomCode);

        await sleep(2500); // Wait for players to see the result
        game.tricks.currentTrick = [];

        // Check for end of game (8 tricks played)
        if (player.hand.length === 0) {
            console.log(`8 tricks played. Game over for room ${roomCode}`);
            endGame(ws);
            return;
        }
    }

    broadcaster.broadcastGameState(roomCode);
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


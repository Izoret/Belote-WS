import * as beloteLogic from '../logic/beloteLogic.js'
import * as playersLogic from '../logic/playersLogic.js'
import {castGameStateIndividually} from '../communication/smallcaster.js'
import {broadcastDealingAnimation, broadcastEndGame} from '../communication/broadcaster.js'
import {getGameSafely, getRoomSafely} from '../logic/validationLogic.js'
import WebSocket from 'ws'
import {Game, Player} from '../types/types.js'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function startGame(ws: WebSocket) {
    const room = getRoomSafely(ws)
    if (room.game) throw new Error('La partie a déjà commencé')

    const teams = playersLogic.validateTeams(room.players)
    const orderedPlayers = playersLogic.determinePlayerOrder(teams)
    const deck = beloteLogic.shuffleDeck(beloteLogic.createDeck())

    console.log(`Début de partie dans la room !!`)

    const players = orderedPlayers.map(p => ({
        id: p.id,
        name: p.name,
        team: p.team,
        hand: [],
        ws: p.ws,
    }))

    const dealerIndex = players.findIndex(p => p.id === ws.id)
    const dealer: Player = players[dealerIndex]
    const firstOneToPlay = (dealerIndex + 1) % 4

    const game: Game = {
        deck,
        dealer: dealer,
        players: players,
        currentPlayer: players[firstOneToPlay],
        bidding: {
            phase: 0,
            trumpCard: null,
            takerId: null,
        },
        trumpSuit: null,
        tricks: {
            currentTrick: [],
        },
    }
    room.game = game

    castGameStateIndividually(room)
    await sleep(1000)

    const nb_first_deal = 3
    beloteLogic.dealCards(room.game.players, room.game.deck, nb_first_deal)
    castGameStateIndividually(room)
    broadcastDealingAnimation(room, nb_first_deal)
    await sleep(2000)

    const nb_second_deal = 2
    beloteLogic.dealCards(room.game.players, room.game.deck, nb_second_deal)
    castGameStateIndividually(room)
    broadcastDealingAnimation(room, nb_second_deal)
    await sleep(2000)

    room.game.bidding.trumpCard = room.game.deck.pop()
    castGameStateIndividually(room)
    await sleep(2000)

    game.bidding.phase = 1
    castGameStateIndividually(room)
}

export async function handleBid(ws: WebSocket, takeTrumpCard: boolean, secondTurnChosenSuit) {
    const room = getRoomSafely(ws)
    const game = getGameSafely(room)
    if (ws.id !== game.currentPlayer.id) throw new Error("Not your turn to bid")

    const bidderIndex = game.players.findIndex(p => p.id === ws.id)
    const nextBidder = game.players[(bidderIndex + 1) % 4]

    if (game.bidding.phase === 1) {
        if (takeTrumpCard) {
            await giveTrumpCard(ws, game, game.bidding.trumpCard.suit)
        } else {
            if (game.currentPlayer.id === game.dealer.id) game.bidding.phase = 2
            game.currentPlayer = nextBidder
        }
    } else if (game.bidding.phase === 2) {
        if (takeTrumpCard) {
            await giveTrumpCard(ws, game, secondTurnChosenSuit)
        } else {
            if (game.currentPlayer.id === game.dealer.id) {
                endGame(ws) // Everyone passed, end the game
                return
            }
            game.currentPlayer = nextBidder
        }
    }

    castGameStateIndividually(room)
}

async function giveTrumpCard(ws: WebSocket, game: Game, newSuit) {
    const room = getRoomSafely(ws)

    const bidder = game.players.find(p => p.id === ws.id)
    bidder.hand.push(game.bidding.trumpCard)
    game.trumpSuit = newSuit
    game.bidding.trumpCard = null
    game.bidding.takerId = ws.id
    game.bidding.phase = 0
    castGameStateIndividually(room)
    await sleep(2000)
    await dealFinalCards(ws)
}

async function dealFinalCards(ws: WebSocket) {
    const room = getRoomSafely(ws)
    const game = getGameSafely(room)

    const taker = game.players.find(p => p.id === game.bidding.takerId)
    game.players.forEach(player => {
        const dealCount = (player.id === taker.id) ? 2 : 3
        beloteLogic.dealCards([player], game.deck, dealCount)
    })

    castGameStateIndividually(room)

    await sleep(1000)

    await startTricking(ws)
}

async function startTricking(ws: WebSocket) {
    const room = getRoomSafely(ws)
    const game = getGameSafely(room)

    const dealerIndex = game.players.findIndex(p => p.id === game.dealer.id)
    const firstPlayerIndex = (dealerIndex + 1) % 4
    game.currentPlayer = game.players[firstPlayerIndex]

    castGameStateIndividually(room)
}

export async function playCard(ws: WebSocket, {card}) {
    const room = getRoomSafely(ws)
    const game = getGameSafely(room)
    if (ws.id !== game.currentPlayer.id) return

    const player = game.players.find(p => p.id === ws.id)
    const cardServer = player.hand.find(c => c.suit === card.suit && c.value === card.value)

    if (!cardServer) throw new Error("Card not found in hand.")

    if (cardServer.unplayable) throw new Error("Card not allowed for current trick !")

    player.hand.splice(player.hand.indexOf(cardServer), 1)
    game.tricks.currentTrick.push({card, playerId: ws.id})

    // If trick is not full, pass turn to next player
    if (game.tricks.currentTrick.length < 4) {
        const currentPlayerIndex = game.players.findIndex(p => p.id === ws.id)
        const nextPlayerIndex = (currentPlayerIndex + 1) % 4
        game.currentPlayer = game.players[nextPlayerIndex]
    } else {
        // Trick is complete, determine winner
        const winnerId = beloteLogic.trickMaster(game.tricks.currentTrick, game.trumpSuit).playerId
        const winner = game.players.find(p => p.id === winnerId)

        if (winner.team === 1) console.log("team 1 won the trick !!")
        else console.log("team 2 won the trick!!")

        game.currentPlayer = winnerId; // Winner starts the next trick
        castGameStateIndividually(room)

        await sleep(2500); // Wait for players to see the result
        game.tricks.currentTrick = []

        // Check for end of game (8 tricks played)
        if (player.hand.length === 0) {
            console.log(`8 tricks played. Game over for room.`)
            endGame(ws)
            return
        }
    }

    game.players.forEach(player => {
        if (game.tricks.currentTrick.some(play => play.playerId === player.id))
            player.hand.forEach(card => {
                card.unplayable = false
            })
        else {
            const cardsAllowed = beloteLogic.cardsAllowedInHandForTrick(
                player.hand, game.tricks.currentTrick, game.players, game.trumpSuit, player.team,
            )

            player.hand.forEach(card => {
                card.unplayable = !cardsAllowed.includes(card)
            })
        }
    })

    castGameStateIndividually(room)
}

export function endGame(ws: WebSocket) {
    const room = getRoomSafely(ws)
    if (!room.game) throw new Error("Il n'y a pas de partie en cours.")

    room.game = undefined
    console.log(`Partie terminée dans la room ${room.code}.`)
    broadcastEndGame(room)
}


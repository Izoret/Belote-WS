import * as beloteLogic from '../logic/beloteLogic.js'
import * as playersLogic from '../logic/playersLogic.js'
import {verifyItsMyTurn} from '../logic/playersLogic.js'
import {castGameStateIndividually} from '../communication/smallcaster.js'
import {broadcastDealingAnimation, broadcastEndGame} from '../communication/broadcaster.js'
import {getGameSafely, getRoomSafely, verifyTrumpCardExists} from '../logic/validationLogic.js'
import WebSocket from 'ws'
import {Card, Game, Player, Suit} from '../types/types.js'
import {rooms} from '../state.js'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function startGame(ws: WebSocket) {
    const room = getRoomSafely(ws)
    if (room.game) throw new Error('La partie a déjà commencé')

    const teams = playersLogic.validateTeams(room.members)
    const players = playersLogic.determinePlayerOrder(teams)
    const deck = beloteLogic.shuffleDeck(beloteLogic.createDeck())

    console.log(`Début de partie dans la room !!`)

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
            trumpCard: undefined,
            taker: undefined,
        },
        trumpSuit: undefined,
        currentTrick: [],
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

export async function handleBid(ws: WebSocket, takeTrumpCard: boolean, secondTurnChosenSuit: Suit) {
    const room = getRoomSafely(ws)
    const game = getGameSafely(room)
    verifyItsMyTurn(ws, game)

    const bidderIndex = game.players.findIndex(p => p.id === ws.id)
    const nextBidder = game.players[(bidderIndex + 1) % 4]

    if (game.bidding.phase === 1) {
        if (takeTrumpCard) {
            verifyTrumpCardExists(game)
            await giveTrumpCard(ws, game, game.bidding.trumpCard!.suit)
        } else {
            if (game.currentPlayer.id === game.dealer.id) game.bidding.phase = 2
            game.currentPlayer = nextBidder
        }
    } else if (game.bidding.phase === 2) {
        if (takeTrumpCard) {
            await giveTrumpCard(ws, game, secondTurnChosenSuit)
        } else {
            if (game.currentPlayer.id === game.dealer.id) {
                endGame(ws)
                return
            }
            game.currentPlayer = nextBidder
        }
    }

    castGameStateIndividually(room)
}

async function giveTrumpCard(ws: WebSocket, game: Game, newSuit: Suit) {
    const room = getRoomSafely(ws)
    verifyTrumpCardExists(game)

    game.currentPlayer.hand.push(game.bidding.trumpCard!)
    game.trumpSuit = newSuit
    game.bidding.trumpCard = undefined
    game.bidding.taker = game.currentPlayer
    game.bidding.phase = 0
    castGameStateIndividually(room)
    await sleep(2000)
    await dealFinalCards(ws)
}

async function dealFinalCards(ws: WebSocket) {
    const room = getRoomSafely(ws)
    const game = getGameSafely(room)

    game.players.forEach(player => {
        const dealCount = (player.id === game.bidding.taker!.id) ? 2 : 3
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

export async function playCard(ws: WebSocket, cardData: Card) {
    const room = getRoomSafely(ws)
    const game = getGameSafely(room)
    verifyItsMyTurn(ws, game)

    const player = game.currentPlayer
    const card = player.hand.find(c => c.suit === cardData.suit && c.value === cardData.value)

    if (!card) throw new Error("Card not found in hand.")

    const cardsAllowedInHand = beloteLogic.cardsAllowedInHandForTrick(
        player.hand, game.currentTrick, player.team, game.trumpSuit,
    )
    if (!cardsAllowedInHand.includes(card)) throw new Error("Card not allowed bro.......")

    player.hand.splice(player.hand.indexOf(card), 1)
    game.currentTrick.push({card: card, byPlayer: game.currentPlayer})

    // If trick is not full, pass turn to next player
    if (game.currentTrick.length < 4) {
        const currentPlayerIndex = game.players.findIndex(p => p.id === ws.id)
        const nextPlayerIndex = (currentPlayerIndex + 1) % 4
        game.currentPlayer = game.players[nextPlayerIndex]
    } else {
        // Trick is complete, determine winner
        const winner = beloteLogic.trickMaster(game.currentTrick, game.trumpSuit).byPlayer

        if (winner.team === 1) console.log("team 1 won the trick !!")
        else console.log("team 2 won the trick!!")

        game.currentPlayer = winner // Winner starts the next trick
        castGameStateIndividually(room)

        await sleep(2500) // Wait for players to see the result
        game.currentTrick = []

        // Check for end of game (8 tricks played)
        if (player.hand.length === 0) {
            console.log(`8 tricks played. Game over for room.`)
            endGame(ws)
            return
        }
    }

    castGameStateIndividually(room)
}

export function endGame(ws: WebSocket) {
    const room = getRoomSafely(ws)
    if (!room.game) throw new Error("Il n'y a pas de partie en cours.")

    room.game = undefined
    room.members.forEach(p => p.hand = [])
    console.log(`Partie terminée dans la room ${room.code}.`)
    broadcastEndGame(room)
}

export function endGameIfPanicked(ws: WebSocket) {
    if (!ws.roomCode) return
    const room = rooms.get(ws.roomCode)
    if (!room || !room.game) return

    room.game = undefined
    console.log(`fatal -> Partie achevée dans ${room.code}`)
    broadcastEndGame(room)
}

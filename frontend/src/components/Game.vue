<script setup>
import {computed} from 'vue'
import {store} from '../store.js'
import {showError, useWebSocket} from '../composables/useWebSocket.js'

const {sendMessage} = useWebSocket()

// Le but est de toujours nous afficher en bas
const orderedPlayers = computed(() => {
    const players = store.game.players
    const myIndex = players.findIndex(p => p.id === store.myId)

    const reordered = []
    for (let i = 0; i < 4; i++) {
        reordered.push(players[(myIndex + i) % 4])
    }
    return reordered
})

const getCardImage = (card) => {
    if (card) return `img/cards/${card.value}_of_${card.suit}.png`
    else return 'img/cards/hidden.png'
}

function endGame() {
    sendMessage('end_game', {})
}

const dealerPosition = computed(() => {
    if (!store.game.dealerId || !orderedPlayers.value.length) return null
    return orderedPlayers.value.findIndex(p => p.id === store.game.dealerId)
})

const suitEmojis = {hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠'}

function isRedSuit(suit) {
    return suit === 'hearts' || suit === 'diamonds'
}

function takeTrump() {
    sendMessage('bid_action', {takeTrumpCard: true})
}

function passTrump() {
    sendMessage('bid_action', {takeTrumpCard: false})
}

const currentPlayerName = computed(() => {
    const player = store.game.players.find(
        p => p.id === store.game.currentPlayerId
    )
    return player ? player.name : ''
})

const isMyBidTurn = computed(() =>
    store.game.bidding.phase && store.game.currentPlayerId === store.myId
)
const isMyTurn = computed(() =>
    !store.game.bidding.phase && store.game.currentPlayerId === store.myId
)

const suits = ['hearts', 'diamonds', 'clubs', 'spades']

const playedCardsByPosition = computed(() => {
    const slots = {south: null, west: null, north: null, east: null}
    if (!orderedPlayers.value.length) return slots

    const positionMap = {
        [orderedPlayers.value[0].id]: 'south',
        [orderedPlayers.value[1].id]: 'west',
        [orderedPlayers.value[2].id]: 'north',
        [orderedPlayers.value[3].id]: 'east'
    }

    store.game.tricks.currentTrick.forEach(playedCard => {
        const position = positionMap[playedCard.playerId]
        if (position) {
            slots[position] = playedCard.card
        }
    })
    return slots
})

function chooseSuit(suit) {
    sendMessage('bid_action', {takeTrumpCard: true, secondTurnChosenSuit: suit})
}

function playCard(card) {
    if (!isMyTurn.value) showError("Not your turn!")
    else if (!card.playable) showError("Cette carte ne peut pas être jouée dans cette situation")
    else sendMessage('play_card', {card})
}
</script>

<template>
    <div v-if="store.game.currentPlayerId && !store.game.bidding.phase" class="turn-indicator">
        <span v-if="isMyTurn">C'est votre tour !</span>
        <span v-else>Au tour de {{ currentPlayerName }}...</span>
    </div>

    <div v-if="store.game.bidding.phase" class="bidding-overlay">
        <div class="bidding-panel">
            <h3 v-if="isMyBidTurn">
                <span v-if="store.game.bidding.phase === 1">Voulez-vous prendre l'atout ?</span>
                <span v-else>Voulez-vous choisir un autre atout ?</span>
            </h3>
            <h3 v-else>En attente de {{ currentPlayerName }}...</h3>

            <div v-if="isMyBidTurn">
                <div v-if="store.game.bidding.phase === 1" class="bid-actions">
                    <button class="bid-btn take-btn" @click="takeTrump">Prendre</button>
                </div>
                <div v-else class="suit-selection">
                    <div class="suit-buttons">
                        <button
                            v-for="suit in suits"
                            :key="suit"
                            :class="{
                            'suit-red': isRedSuit(suit),
                            'suit-black': !isRedSuit(suit)
                            }"
                            class="suit-btn"
                            @click="chooseSuit(suit)"
                        >
                            {{ suitEmojis[suit] }}
                        </button>
                    </div>
                </div>
                <button class="bid-btn pass-btn" @click="passTrump">Passer</button>
            </div>
        </div>
    </div>

    <button class="leave-btn" @click="endGame">Quitter la partie</button>

    <div class="game-board">
        <div
            v-if="store.game.trumpSuit"
            :class="{
            'suit-red': isRedSuit(store.game.trumpSuit),
            'suit-black': !isRedSuit(store.game.trumpSuit)
            }"
            class="trump-bg-symbol">
            {{ suitEmojis[store.game.trumpSuit] }}
        </div>

        <div class="game-table">
            <div class="player-area player-north">
                <div class="player-info">
                    <div :class="'team-' + orderedPlayers[2].team" class="team-indicator"></div>
                    <div class="player-name">{{ orderedPlayers[2].name }} (Équipier)</div>
                </div>
                <div class="opponent-hand opponent-hand-north">
                    <img v-for="n in orderedPlayers[2].handSize" :key="`north-card-${n}`" :src="getCardImage()"
                         :style="{ marginLeft: n > 1 ? '-40px' : '0' }" class="card-hidden card-north"/>
                </div>
            </div>

            <div class="player-area player-west">
                <div class="player-info">
                    <div :class="'team-' + orderedPlayers[1].team" class="team-indicator"></div>
                    <div class="player-name">{{ orderedPlayers[1].name }}</div>
                </div>
                <div class="opponent-hand opponent-hand-west">
                    <img v-for="n in orderedPlayers[1].handSize" :key="`west-card-${n}`" :src="getCardImage()"
                         :style="{ marginTop: n > 1 ? '-50px' : '0' }" class="card-hidden card-west"/>
                </div>
            </div>

            <div class="player-area player-east">
                <div class="player-info">
                    <div :class="'team-' + orderedPlayers[3].team" class="team-indicator"></div>
                    <div class="player-name">{{ orderedPlayers[3].name }}</div>
                </div>
                <div class="opponent-hand opponent-hand-east">
                    <img v-for="n in orderedPlayers[3].handSize" :key="`east-card-${n}`" :src="getCardImage()"
                         :style="{ marginTop: n > 1 ? '-50px' : '0' }" class="card-hidden card-east"/>
                </div>
            </div>

            <div class="player-area player-south">
                <div class="player-info">
                    <div :class="'team-' + orderedPlayers[0].team" class="team-indicator"></div>
                    <div class="player-name player-name-me">
                        <strong>{{ orderedPlayers[0].name }} (Vous)</strong>
                    </div>
                </div>
                <div class="my-hand">
                    <img v-for="(card, index) in store.game.myHand"
                         :key="index"
                         :alt="`${card.value} of ${card.suit}`"
                         :src="getCardImage(card)"
                         :style="{
                             marginLeft: index > 0 ? '-30px' : '0',
                             zIndex: index,
                             filter: card.playable ? '' : 'brightness(85%)',
                         }"
                         class="card-in-hand"
                         @click="playCard(card)"
                    />
                </div>
            </div>

            <!-- Centre de la table -->
            <div class="table-center">
                <div class="center-content">
                    <div v-if="store.game.bidding.trumpCard" class="atout-section">
                        <img :src="getCardImage(store.game.bidding.trumpCard)" alt="Carte atout" class="atout-card"/>
                        <div class="atout-info">
                            <p class="atout-text">Atout proposé</p>
                            <div
                                :class="{
                                'suit-red': isRedSuit(store.game.bidding.trumpCard?.suit),
                                'suit-black': !isRedSuit(store.game.bidding.trumpCard?.suit)
                                }"
                                class="atout-suit"
                            >
                                {{ suitEmojis[store.game.bidding.trumpCard?.suit] }}
                            </div>
                        </div>
                    </div>
                    <div class="played-cards">
                        <div v-if="playedCardsByPosition.south" class="played-card-slot slot-south">
                            <img :src="getCardImage(playedCardsByPosition.south)" class="played-card"/>
                        </div>
                        <div v-if="playedCardsByPosition.west" class="played-card-slot slot-west">
                            <img :src="getCardImage(playedCardsByPosition.west)" class="played-card"/>
                        </div>
                        <div v-if="playedCardsByPosition.north" class="played-card-slot slot-north">
                            <img :src="getCardImage(playedCardsByPosition.north)" class="played-card"/>
                        </div>
                        <div v-if="playedCardsByPosition.east" class="played-card-slot slot-east">
                            <img :src="getCardImage(playedCardsByPosition.east)" class="played-card"/>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div
        v-if="store.game.deckSize > 0"
        :class="['player-' + ['south', 'west', 'north', 'east'][dealerPosition]]"
        class="dealer-deck"
    >
        <div class="deck-cards">
            <img
                v-for="n in Math.min(store.game.deckSize, 5)"
                :key="n"
                :src="getCardImage()"
                :style="{ zIndex: n, left: (n * 5) + 'px' }"
                class="deck-card"
            />
            <div class="deck-count">
                {{ store.game.deckSize }}
            </div>
        </div>
    </div>
</template>

<style scoped src="../assets/game.css"></style>

<script setup>
import { ref, computed, watch } from 'vue';
import { store } from '../store.js';
import { useWebSocket } from '../composables/useWebSocket.js';
const { sendMessage } = useWebSocket();

const dealingCards = ref([]);

// Le but est de toujours nous afficher en bas
const orderedPlayers = computed(() => {
    const players = store.game.players;
    const myIndex = players.findIndex(p => p.id === store.myId);

    const reordered = []
    for (let i = 0; i < 4; i++) {
        reordered.push(players[(myIndex + i) % 4])
    }
    return reordered
})

const getCardImage = (card) => {
    if (!card) return 'img/cards/hidden.png';
    else return `img/cards/${card.value}_of_${card.suit}.png`;
}

function endGame() {
    sendMessage('end_game', {});
}

const dealerPosition = computed(() => {
    if (!store.game.dealerId || !orderedPlayers.value.length) return null;
    return orderedPlayers.value.findIndex(p => p.id === store.game.dealerId);
});

watch(() => store.game.dealingAnimation, (newVal) => {
    if (newVal.active) {
        startDealingAnimation(newVal.cardCount, newVal.dealerPosition);
    }
});

function startDealingAnimation(cardCount, dealerPos) {
    dealingCards.value = [];

    const positions = [
        { x: 50, y: 85 },  // Nord
        { x: 85, y: 50 },  // Est
        { x: 50, y: 15 },  // Sud
        { x: 15, y: 50 }   // Ouest
    ];

    const cardSizes = ['85px', '50px', '65px', '50px']; // Sud, Ouest, Nord, Est

    // Créer les cartes volantes
    for (let i = 0; i < cardCount * 4; i++) {
        const playerIndex = (dealerPos + Math.floor(i / cardCount) + 1) % 4;

        dealingCards.value.push({
            id: `card-${Date.now()}-${i}`,
            start: positions[dealerPos],
            end: positions[playerIndex],
            progress: 0,
            targetSize: cardSizes[playerIndex]
        });
    }

    // Animer progressivement
    let progress = 0;
    const interval = setInterval(() => {
        progress += 0.02;
        dealingCards.value = dealingCards.value.map(card => ({
            ...card,
            progress: Math.min(progress, 1)
        }));

        if (progress >= 1) {
            clearInterval(interval);
            setTimeout(() => {
                dealingCards.value = [];
            }, 500);
        }
    }, 20);
}

function getSuitSymbol(suit) {
    if (!suit) return '';
    const symbols = {
        hearts: '♥',
        diamonds: '♦',
        clubs: '♣',
        spades: '♠'
    };
    return symbols[suit];
}

function isRedSuit(suit) {
    return suit === 'hearts' || suit === 'diamonds';
}

function takeTrump() {
    sendMessage('bid_action', { action: 'take' });
}

function passTrump() {
    sendMessage('bid_action', { action: 'pass' });
}

const currentBidderName = computed(() => {
    if (!store.game.bidding.currentBidderId) return '';
    const bidder = store.game.players.find(
        p => p.id === store.game.bidding.currentBidderId
    );
    return bidder ? bidder.name : '';
});

const isMyBidTurn = computed(() => {
    return store.game.bidding.phase &&
           store.game.bidding.currentBidderId === store.myId;
});

const suits = ['hearts', 'diamonds', 'clubs', 'spades'];

function chooseSuit(suit) {
    sendMessage('bid_action', { action: suit });
}
</script>

<template>
    <div v-if="store.game.bidding.phase" class="bidding-overlay">
        <div class="bidding-panel">
            <h3 v-if="isMyBidTurn">
                <span v-if="store.game.bidding.phase === 1">Voulez-vous prendre l'atout ?</span>
                <span v-else>Voulez-vous choisir un autre atout ?</span>
            </h3>
            <h3 v-else>En attente de {{ currentBidderName }}...</h3>
    
            <div v-if="isMyBidTurn">
            <div v-if="store.game.bidding.phase === 1" class="bid-actions">
                <button @click="takeTrump" class="bid-btn take-btn">Prendre</button>
            </div>
            <div v-else class="suit-selection">
                <div class="suit-buttons">
                    <button 
                        v-for="suit in suits" 
                        :key="suit"
                        @click="chooseSuit(suit)"
                        class="suit-btn"
                        :class="{
                            'suit-red': isRedSuit(suit),
                            'suit-black': !isRedSuit(suit)
                        }"
                    >
                        {{ getSuitSymbol(suit) }}
                    </button>
                </div>
            </div>
            <button @click="passTrump" class="bid-btn pass-btn">Passer</button>
        </div>
    </div>
    </div>

    <button @click="endGame" class="leave-btn">Quitter la partie</button>

    <div class="game-board">
        <div
          v-if="store.game.trumpSuit"
          class="trump-bg-symbol"
          :class="{
            'suit-red': isRedSuit(store.game.trumpSuit),
            'suit-black': !isRedSuit(store.game.trumpSuit)
          }"
          >
          {{ getSuitSymbol(store.game.trumpSuit) }}
        </div>

        <div class="game-table">
            <!-- Joueur du haut (cartes inversées) -->
            <div v-if="orderedPlayers.length === 4" class="player-area player-north">
                <div class="player-info">
                  <div class="team-indicator" :class="'team-' + orderedPlayers[2].team"></div>
                  <div class="player-name">{{ orderedPlayers[2].name }}</div>
                </div>
                <div class="opponent-hand opponent-hand-north">
                  <img 
                    v-for="n in orderedPlayers[2].handSize" 
                    :key="`north-card-${n}`" 
                    :src="getCardImage()" 
                    class="card-hidden card-north"
                    :style="{ marginLeft: n > 1 ? '-40px' : '0' }"
                  />
                </div>
            </div>

              <!-- Joueur de gauche (cartes verticales) -->
              <div v-if="orderedPlayers.length === 4" class="player-area player-west">
                <div class="player-info">
                  <div class="team-indicator" :class="'team-' + orderedPlayers[1].team"></div>
                  <div class="player-name">{{ orderedPlayers[1].name }}</div>
                </div>
                <div class="opponent-hand opponent-hand-west">
                  <img 
                    v-for="n in orderedPlayers[1].handSize" 
                    :key="`west-card-${n}`" 
                    :src="getCardImage()" 
                    class="card-hidden card-west"
                    :style="{ marginTop: n > 1 ? '-50px' : '0' }"
                  />
                </div>
              </div>

              <!-- Joueur de droite (cartes verticales) -->
              <div v-if="orderedPlayers.length === 4" class="player-area player-east">
                <div class="player-info">
                  <div class="team-indicator" :class="'team-' + orderedPlayers[3].team"></div>
                  <div class="player-name">{{ orderedPlayers[3].name }}</div>
                </div>
                <div class="opponent-hand opponent-hand-east">
                  <img 
                    v-for="n in orderedPlayers[3].handSize" 
                    :key="`east-card-${n}`" 
                    :src="getCardImage()" 
                    class="card-hidden card-east"
                    :style="{ marginTop: n > 1 ? '-50px' : '0' }"
                  />
                </div>
              </div>
              
              <!-- Joueur du bas (nous) -->
              <div v-if="orderedPlayers.length === 4" class="player-area player-south">
                <div class="my-hand">
                  <img 
                    v-for="(card, index) in store.game.myHand" 
                    :key="index" 
                    :src="getCardImage(card)" 
                    class="card-in-hand"
                    :style="{ marginLeft: index > 0 ? '-30px' : '0', zIndex: index }"
                    :alt="`${card.value} of ${card.suit}`" 
                  />
                </div>

                <div class="player-info">
                  <div class="team-indicator" :class="'team-' + orderedPlayers[0].team"></div>
                  <div class="player-name player-name-me">
                    <strong>{{ orderedPlayers[0].name }} (Vous)</strong>
                  </div>
                </div>
              </div>

      <!-- Centre de la table -->
      <div class="table-center">
        <div class="center-content">
          <div class="atout-section" v-if="store.game.bidding.trumpCard">
            <img :src="getCardImage(store.game.bidding.trumpCard)" alt="Carte atout" class="atout-card" />
            <div class="atout-info">
              <p class="atout-text">Atout proposé</p>
                <div 
    class="atout-suit" 
    :class="{
        'suit-red': isRedSuit(store.game.bidding.trumpCard?.suit),
        'suit-black': !isRedSuit(store.game.bidding.trumpCard?.suit)
    }"
>
    {{ getSuitSymbol(store.game.bidding.trumpCard?.suit) }}
</div>        
    </div>
          </div>
          
          <!-- Zone pour les cartes jouées -->
          <div class="played-cards">
            <div class="played-card-slot"></div>
            <div class="played-card-slot"></div>
            <div class="played-card-slot"></div>
            <div class="played-card-slot"></div>
          </div>
        </div>
      </div>
    </div>
  </div>

    <div class="flying-cards">
    <div
      v-for="card in dealingCards"
      :key="card.id"
      class="flying-card"
      :style="{
        left: `${card.start.x + (card.end.x - card.start.x) * card.progress}%`,
        top: `${card.start.y + (card.end.y - card.start.y) * card.progress}%`,
        opacity: card.progress < 0.9 ? 1 : 1 - ((card.progress - 0.9) * 10),
        width: card.targetSize
      }"
    >
      <img :src="getCardImage()" class="card-hidden" />
    </div>
  </div>

<div 
    v-if="dealerPosition !== null" 
    class="dealer-deck"
    :class="[
      'player-' + ['south', 'west', 'north', 'east'][dealerPosition]
    ]"
  >
    <div class="deck-cards">
      <img 
        v-for="n in 5" 
        :key="n" 
        :src="getCardImage()" 
        class="deck-card" 
        :style="{ zIndex: n }"
      />
    </div>
  </div>
</template>

<style scoped src="../assets/game.css"></style>

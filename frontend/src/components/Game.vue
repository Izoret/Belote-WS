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
            <span v-if="biddingRound === 1">Voulez-vous prendre l'atout ?</span>
            <span v-else>Voulez-vous choisir un autre atout ?</span>
        </h3>
        <h3 v-else>En attente de {{ currentBidderName }}...</h3>
    
        <div v-if="isMyBidTurn">
            <div v-if="biddingRound === 1" class="bid-actions">
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

<style scoped>
.game-board {
  width: 100%;
  max-width: 1000px;
  aspect-ratio: 1.4;
  background: radial-gradient(ellipse at center, #228B22 0%, #006400 70%, #004000 100%);
  border-radius: 25px;
  padding: 25px;
  box-shadow: 
    inset 0 0 30px rgba(0,0,0,0.4),
    0 8px 25px rgba(0,0,0,0.3);
  border: 3px solid #8B4513;
  position: relative;
}

.game-board::before {
  content: '';
  position: absolute;
  top: 15px;
  left: 15px;
  right: 15px;
  bottom: 15px;
  border: 2px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  pointer-events: none;
}

.game-table {
  position: relative;
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: 180px 1fr 180px;
  grid-template-rows: 120px 1fr 120px;
  grid-template-areas:
    ". north ."
    "west center east"
    ". south .";
  gap: 10px;
}

.player-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.player-info {
    display: flex;
    align-items: center;
    gap: 10px;
}

.team-indicator {
    width: 15px;
    height: 15px;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 0 5px rgba(0,0,0,0.5);
}

.team-1 {
    background-color: #3b82f6; /* Blue */
}

.team-2 {
    background-color: #ef4444; /* Red */
}

/* Update existing team classes to use same colors */
.team-1-bg { background-color: rgba(59, 130, 246, 0.4); }
.team-2-bg { background-color: rgba(239, 68, 68, 0.4); }

.player-name {
  background: linear-gradient(135deg, rgba(0,0,0,0.6), rgba(0,0,0,0.4));
  color: #FFD700;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.9em;
  font-weight: 600;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
  border: 1px solid rgba(255,215,0,0.3);
  backdrop-filter: blur(5px);
}

.player-name-me {
  background: linear-gradient(135deg, rgba(255,215,0,0.3), rgba(255,215,0,0.1));
  border: 1px solid rgba(255,215,0,0.6);
}

/* Styles pour les mains des joueurs */
.my-hand {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  padding: 10px;
}

.card-in-hand {
  width: 85px;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  transition: all 0.3s ease;
  cursor: pointer;
  border: 2px solid rgba(255,255,255,0.1);
}

.card-in-hand:hover {
  transform: translateY(-20px) scale(1.05);
  box-shadow: 0 8px 20px rgba(0,0,0,0.6);
  border-color: rgba(255,215,0,0.5);
  z-index: 1000 !important;
}

/* Styles pour les cartes cachées */
.card-hidden {
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  border: 1px solid rgba(255,255,255,0.1);
  transition: all 0.2s ease;
  width: 100%;
  height: auto;
}

.atout-suit {
    font-size: 2em;
    text-shadow: 1px 1px 3px rgba(0,0,0,0.8);
}

.suit-red {
    color: #ff4d4d;
}

.suit-black {
    color: #333;
}

/* Cartes du joueur du haut (inversées) */
.opponent-hand-north {
  display: flex;
  justify-content: center;
  align-items: center;
}

.card-north {
  width: 65px;
  height: auto;
  transform: rotate(180deg);
}

/* Cartes des joueurs latéraux (verticales) */
.opponent-hand-west,
.opponent-hand-east {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.card-west {
  width: 50px;
  height: auto;
  transform: rotate(-90deg);
}

.card-east {
  width: 50px;
  height: auto;
  transform: rotate(90deg);
}

/* Joueurs positionnés */
.player-north { 
  grid-area: north;
  flex-direction: column-reverse;
}

.player-south { 
  grid-area: south; 
}

.player-west { 
  grid-area: west;
  flex-direction: row;
}

.player-east { 
  grid-area: east;
  flex-direction: row-reverse;
}

/* Centre de la table */
.table-center {
  grid-area: center;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.center-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.atout-section {
  display: flex;
  align-items: center;
  gap: 15px;
  background: rgba(0,0,0,0.3);
  padding: 15px 20px;
  border-radius: 15px;
  border: 2px solid rgba(255,215,0,0.3);
  backdrop-filter: blur(10px);
}

.atout-card {
  width: 70px;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  transform: rotate(-15deg);
}

.atout-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.atout-text {
  font-weight: bold;
  color: #FFD700;
  font-size: 0.85em;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
  margin: 0;
}

.atout-suit {
  font-size: 1.5em;
  color: #FFD700;
  text-shadow: 1px 1px 3px rgba(0,0,0,0.8);
}

/* Zone pour les cartes jouées */
.played-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 10px;
  width: 180px;
  height: 120px;
}

.played-card-slot {
  border: 2px dashed rgba(255,255,255,0.2);
  border-radius: 8px;
  background: rgba(255,255,255,0.05);
  transition: all 0.3s ease;
}

.played-card-slot:hover {
  border-color: rgba(255,215,0,0.4);
  background: rgba(255,215,0,0.1);
}

/* Effets de survol pour les cartes cachées */
.card-hidden:hover {
  transform: scale(1.05);
}

.card-north:hover {
  transform: rotate(180deg) scale(1.05);
}

.card-west:hover {
  transform: rotate(-90deg) scale(1.05);
}

.card-east:hover {
  transform: rotate(90deg) scale(1.05);
}

/* Responsive */
@media (max-width: 768px) {
  .game-table {
    grid-template-columns: 120px 1fr 120px;
    grid-template-rows: 80px 1fr 100px;
  }
  
  .card-in-hand {
    width: 70px;
  }
  
  .card-north {
    width: 50px;
  }
  
  .card-west,
  .card-east {
    width: 40px;
  }
  
  .atout-card {
    width: 60px;
  }
}

/* Animation des cartes volantes */
.flying-cards {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
}

.flying-card {
  position: absolute;
  transform: translate(-50%, -50%);
  transition: all 0.1s linear;
  z-index: 1001;
}

/* Style du deck */
.dealer-deck {
  position: absolute;
  z-index: 50;
}

.deck-cards {
  position: relative;
  width: 100%;
  height: 100%;
}

.deck-card {
  position: absolute;
  width: 50px;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}

/* Positionnement selon la position du donneur */
.player-south .dealer-deck {
  bottom: 10%;
  left: 50%;
  transform: translateX(-50%);
  width: 10%;
}

.player-north .dealer-deck {
  top: 10%;
  left: 50%;
  transform: translateX(-50%);
  width: 10%;
}

.player-west .dealer-deck {
  top: 50%;
  left: 10%;
  transform: translateY(-50%);
  width: 7%;
}

.player-east .dealer-deck {
  top: 50%;
  right: 10%;
  transform: translateY(-50%);
  width: 7%;
}

.bidding-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
}

.bidding-panel {
    background: linear-gradient(135deg, #2c3e50, #1a1a2e);
    padding: 30px 40px;
    border-radius: 15px;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    border: 2px solid #3498db;
    max-width: 400px;
    width: 90%;
}

.bidding-panel h3 {
    color: #ecf0f1;
    margin-bottom: 20px;
    font-size: 1.4rem;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.bid-actions {
    display: flex;
    gap: 20px;
    justify-content: center;
}

.bid-btn {
    padding: 12px 25px;
    border: none;
    border-radius: 8px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
}

.take-btn {
    background: linear-gradient(to bottom, #2ecc71, #27ae60);
    color: white;
}

.take-btn:hover {
    background: linear-gradient(to bottom, #27ae60, #219653);
    transform: translateY(-3px);
}

.pass-btn {
    background: linear-gradient(to bottom, #e74c3c, #c0392b);
    color: white;
}

.pass-btn:hover {
    background: linear-gradient(to bottom, #c0392b, #a23526);
    transform: translateY(-3px);
}

.suit-selection {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
}

.suit-buttons {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    width: 100%;
}

.suit-btn {
    width: 60px;
    height: 80px;
    font-size: 2.5em;
    border-radius: 8px;
    border: 2px solid white;
    background: rgba(255, 255, 255, 0.1);
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
}

.suit-btn:hover {
    transform: scale(1.1);
    box-shadow: 0 0 15px rgba(255, 255, 255, 0.5);
}

.suit-red {
    color: #ff4d4d;
    text-shadow: 0 0 5px rgba(255, 77, 77, 0.7);
}

.suit-black {
    color: #333;
    text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
}
</style>

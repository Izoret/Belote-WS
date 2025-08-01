<script setup>
import { ref, computed, watch } from 'vue';
import { store } from '../store.js';
import { useWebSocket } from '../composables/useWebSocket.js';
const { sendMessage } = useWebSocket();

const dealingCards = ref([]);

// Le but est de toujours nous afficher en bas
const orderedPlayers = computed(() => {
    const players = store.gameState.players;
    const myIndex = players.findIndex(p => p.id === store.myId);

    const reordered = []
    for (let i = 0; i < 4; i++) {
        reordered.push(players[(myIndex + i) % 4])
    }
    return reordered;
})

const getCardImage = (card) => {
    if (!card) return 'img/cards/hidden.png';
    else return `img/cards/${card.value}_of_${card.suit}.png`;
}

function endGame() {
    sendMessage('end_game', {});
}

const dealerPosition = computed(() => {
    if (!store.gameState.dealerId || !orderedPlayers.value.length) return null;
    return orderedPlayers.value.findIndex(p => p.id === store.gameState.dealerId);
});

watch(() => store.gameState.dealingAnimation, (newVal) => {
    if (newVal.active) {
        startDealingAnimation(newVal.cardCount, newVal.dealerPosition);
    }
});

function startDealingAnimation(cardCount, dealerPos) {
    dealingCards.value = [];

    // Positions des joueurs (nord, est, sud, ouest)
    const positions = [
        { x: 50, y: 85 },  // Nord
        { x: 85, y: 50 },  // Est
        { x: 50, y: 15 },  // Sud
        { x: 15, y: 50 }   // Ouest
    ];

    // Créer les cartes volantes
    for (let i = 0; i < cardCount * 4; i++) {
        const playerIndex = (dealerPos + Math.floor(i / cardCount) + 1) % 4;

        dealingCards.value.push({
            id: `card-${Date.now()}-${i}`,
            start: positions[dealerPos],
            end: positions[playerIndex],
            progress: 0
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
</script>

<template>
<button @click="endGame" class="leave-btn">Quitter la partie</button>
  <div class="game-board">
    <div class="game-table">
      <!-- Joueur du haut (cartes inversées) -->
      <div v-if="orderedPlayers.length === 4" class="player-area player-north">
        <div class="player-name">{{ orderedPlayers[2].name }}</div>
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
        <div class="player-name">{{ orderedPlayers[1].name }}</div>
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
        <div class="player-name">{{ orderedPlayers[3].name }}</div>
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
            v-for="(card, index) in store.gameState.myHand" 
            :key="index" 
            :src="getCardImage(card)" 
            class="card-in-hand"
            :style="{ marginLeft: index > 0 ? '-30px' : '0', zIndex: index }"
            :alt="`${card.value} of ${card.suit}`" 
          />
        </div>
        <div class="player-name player-name-me">
          <strong>{{ orderedPlayers[0].name }} (Vous)</strong>
        </div>
      </div>

      <!-- Centre de la table -->
      <div class="table-center">
        <div class="center-content">
          <div class="atout-section">
            <img :src="getCardImage()" alt="Carte atout" class="atout-card" />
            <div class="atout-info">
              <p class="atout-text">Atout</p>
              <div class="atout-suit">♠</div>
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
        opacity: card.progress < 0.9 ? 1 : 1 - ((card.progress - 0.9) * 10)
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
  width: 8%;
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
  width: 100%;
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
</style>

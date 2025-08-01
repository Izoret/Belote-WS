<script setup>
import { computed } from 'vue';
import { store } from '../store.js';

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
    if (!card) return '/img/cards/hidden.png';
    else return `img/cards/${card.value}_of_${card.suit}.png`;
};
</script>

<template>
  <div class="game-board">
    <div class="game-table">
      <div v-if="orderedPlayers.length === 4" class="player-area player-north">
        <div class="player-name">{{ orderedPlayers[2].name }}</div>
        <div class="opponent-hand">
          <img v-for="n in orderedPlayers[2].handSize" :key="`north-card-${n}`" :src="getCardImage('hidden')" class="card-hidden" />
        </div>
      </div>

      <div v-if="orderedPlayers.length === 4" class="player-area player-west">
        <div class="player-name">{{ orderedPlayers[1].name }}</div>
        <div class="opponent-hand">
          <img v-for="n in orderedPlayers[1].handSize" :key="`west-card-${n}`" :src="getCardImage('hidden')" class="card-hidden" />
        </div>
      </div>

      <div v-if="orderedPlayers.length === 4" class="player-area player-east">
        <div class="player-name">{{ orderedPlayers[3].name }}</div>
        <div class="opponent-hand">
          <img v-for="n in orderedPlayers[3].handSize" :key="`east-card-${n}`" :src="getCardImage('hidden')" class="card-hidden" />
        </div>
      </div>
      
      <div v-if="orderedPlayers.length === 4" class="player-area player-south">
        <div class="player-name"><strong>{{ orderedPlayers[0].name }} (Vous)</strong></div>
        <div class="my-hand">
            <img v-for="(card, index) in store.gameState.myHand" :key="index" :src="getCardImage(card)" class="card-in-hand" :alt="`${card.value} of ${card.suit}`" />
        </div>
      </div>

      <div class="table-center">
        <img :src="getCardImage()" alt="placeholder milieu" class="atout-card" />
        <p class="atout-text">carte jsp</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.player-area {
  gap: 10px;
}
.my-hand {
    display: flex;
    justify-content: center;
    gap: -20px; /* Les cartes se chevauchent un peu */
}
.card-in-hand {
    width: 80px;
    height: auto;
    border-radius: 6px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    transition: transform 0.2s ease;
}
.card-in-hand:hover {
    transform: translateY(-15px);
    cursor: pointer;
}
.opponent-hand {
    display: flex;
    gap: -40px; /* Les cartes cachées se chevauchent beaucoup */
}
.card-hidden {
    width: 60px; /* Un peu plus petites */
    height: auto;
    border-radius: 5px;
}
/* Ajustement pour les mains latérales */
.player-west .opponent-hand, .player-east .opponent-hand {
    /* Si vous voulez une disposition verticale pour les joueurs sur les côtés */
    /* flex-direction: column; gap: -60px; */
}

.game-board {
  width: 100%;
  aspect-ratio: 1.5; /* Ratio pour une table rectangulaire */
  background-color: #006400; /* Vert tapis de jeu */
  border-radius: 20px;
  padding: 20px;
  box-shadow: inset 0 0 15px rgba(0,0,0,0.5);
}

.game-table {
  position: relative;
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: 150px 1fr 150px;
  grid-template-rows: 100px 1fr 100px;
  grid-template-areas:
    ". north ."
    "west center east"
    ". south .";
}

.player-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  text-shadow: 1px 1px 2px black;
}

.player-name {
  background-color: rgba(0,0,0,0.3);
  padding: 5px 10px;
  border-radius: 5px;
}

.player-north { grid-area: north; }
.player-south { grid-area: south; }
.player-west { grid-area: west; }
.player-east { grid-area: east; }

.table-center {
  grid-area: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.atout-card {
  width: 90px;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.4);
}

.atout-text {
  font-weight: bold;
  color: white;
  font-size: 0.9em;
  text-shadow: 1px 1px 2px black;
}
</style>

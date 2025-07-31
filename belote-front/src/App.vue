<script setup>
import { ref, computed } from 'vue';

const playerName = ref('');
const roomCode = ref('');
const playersInRoom = ref([]);
const errorMessage = ref('');
const isInLobby = ref(false);

let socket = null;

// computed props  
const isLobbyFull = computed(() => playersInRoom.value.length === 4);
const canJoin = computed(() => playerName.value.trim() !== '' && roomCode.value.trim() !== '');

const connectWebSocket = () => {
  return new Promise((resolve, reject) => {
    socket = new WebSocket('ws://localhost:8080');

    socket.onopen = () => {
      console.log('🔗 Connecté au serveur WebSocket !');
      errorMessage.value = '';
      resolve();
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'room_update':
          playersInRoom.value = data.players;
          break;
        case 'error':
          errorMessage.value = data.message;
          isInLobby.value = false;
          break;
      }
    };

    socket.onclose = () => {
      console.log('🔌 Déconnecté du serveur WebSocket.');
      errorMessage.value = 'Déconnecté du serveur. Veuillez rafraîchir la page.';
      isInLobby.value = false;
    };

    socket.onerror = (error) => {
      console.error('WebSocket Error:', error);
      errorMessage.value = 'Erreur de connexion avec le serveur.';
      isInLobby.value = false;
      reject(error);
    };
  });
};

const sendJoinMessage = () => {
  const message = {
    type: 'join_room',
    payload: {
      playerName: playerName.value,
      roomCode: roomCode.value.toUpperCase()
    }
  };
  socket.send(JSON.stringify(message));
  isInLobby.value = true;
  errorMessage.value = ''; 
};

const joinRoom = async () => {
    if (!canJoin.value) return;

    try {
        if (!socket || socket.readyState !== WebSocket.OPEN) await connectWebSocket();
        sendJoinMessage();
    } catch (err) {
        errorMessage.value = 'Impossible de se connecter au serveur.';
    }
};

const startGame = () => {
  alert('La partie commence ! (Logique de jeu à implémenter)');
  // socket.send(JSON.stringify({ type: 'start_game', payload: { roomCode: roomCode.value } }));
};

</script>

<template>
  <div class="container">
    <h1>Lobby Belote 🃏</h1>

    <div v-if="!isInLobby" class="join-form">
      <input type="text" v-model="playerName" placeholder="Votre nom" />
      <input type="text" v-model="roomCode" placeholder="Code du salon" @keyup.enter="joinRoom"/>
      <button @click="joinRoom" :disabled="!canJoin">Rejoindre le salon</button>
    </div>

    <div v-if="isInLobby" class="lobby">
      <h2>Salon : {{ roomCode.toUpperCase() }}</h2>
      <p>En attente de joueurs...</p>
      
      <ul class="player-list">
        <li v-for="player in playersInRoom" :key="player.id">
          ✔️  {{ player.name }}
        </li>
        <li v-for="n in (4 - playersInRoom.length)" :key="n" class="waiting">
          ⌛ En attente...
        </li>
      </ul>

      <button v-if="isLobbyFull" @click="startGame" class="start-button">
        Lancer la partie !
      </button>
      <div v-else class="waiting-message">
        Partie complète à 4 joueurs.
      </div>
    </div>
    
    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
  </div>
</template>

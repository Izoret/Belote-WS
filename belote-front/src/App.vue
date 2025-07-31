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

<style>
:root {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  --primary-color: #42b983;
  --dark-color: #2c3e50;
  --grey-color: #f0f0f0;
}

.container {
  max-width: 500px;
  margin: 40px auto;
  padding: 20px;
  text-align: center;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}

.join-form, .lobby {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

input[type="text"] {
  padding: 12px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

button {
  padding: 12px 20px;
  font-size: 1rem;
  color: white;
  background-color: var(--primary-color);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover {
  background-color: #36a473;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.player-list {
  list-style: none;
  padding: 0;
  text-align: left;
  background: var(--grey-color);
  padding: 15px;
  border-radius: 4px;
}

.player-list li {
  padding: 8px;
  font-size: 1.1rem;
  border-bottom: 1px solid #ddd;
}
.player-list li:last-child {
  border-bottom: none;
}
.player-list li.waiting {
  color: #888;
  font-style: italic;
}

.start-button {
  background-color: #e67e22;
  padding: 15px;
  font-size: 1.2rem;
  animation: pulse 1.5s infinite;
}

.start-button:hover {
  background-color: #d35400;
}

.error-message {
  color: #e74c3c;
  margin-top: 15px;
  font-weight: bold;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}
</style>

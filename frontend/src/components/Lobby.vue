<script setup>
import { ref } from 'vue';
import { store, computedStore } from '../store.js';
import { useWebSocket } from '../composables/useWebSocket.js';

const { sendMessage } = useWebSocket();
const newMessage = ref('');

const postMessage = () => {
  const text = newMessage.value.trim();
  if (!text) return;

  sendMessage('send_message', { text });
  newMessage.value = '';
};

const startGame = () => {
  alert('La partie commence ! (Logique de jeu à implémenter)');
};
</script>

<template>
  <div class="lobby-container">
    <div class="lobby-info">
        <h2>Salon : {{ store.roomCode.toUpperCase() }}</h2>
        <p>En attente de joueurs...</p>
        
        <ul class="player-list">
            <li v-for="player in store.playersInRoom" :key="player.id">
            ✔️ {{ player.name }}
            </li>
            <li v-for="n in (4 - store.playersInRoom.length)" :key="n" class="waiting">
            ⌛ En attente...
            </li>
        </ul>

        <button v-if="computedStore.isLobbyFull.value" @click="startGame" class="start-button">
            Lancer la partie !
        </button>
        <div v-else class="waiting-message">
            Partie complète à 4 joueurs.
        </div>
    </div>

    <div class="chat-area">
        <h3>Chat du salon</h3>
        <div class="chat-box">
            <div v-for="(msg, index) in store.chatMessages" :key="index" class="chat-message">
                <strong>{{ msg.author }}:</strong> {{ msg.text }}
            </div>
             <p v-if="store.chatMessages.length === 0" class="no-messages">
                Soyez le premier à envoyer un message !
            </p>
        </div>
        <div class="chat-input">
            <input type="text" v-model="newMessage" @keyup.enter="postMessage" placeholder="Écrire un message..." />
            <button @click="postMessage">Envoyer</button>
        </div>
    </div>
  </div>
</template>

<style scoped>
.lobby-container {
    display: flex;
    gap: 30px;
    align-items: flex-start;
}
.lobby-info, .chat-area {
    flex: 1;
}
.chat-area {
    border-left: 1px solid #eee;
    padding-left: 30px;
    height: 400px;
    display: flex;
    flex-direction: column;
}
.chat-box {
    flex-grow: 1;
    overflow-y: auto;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 10px;
    background: #f9f9f9;
    margin-bottom: 10px;
}
.chat-message {
    margin-bottom: 8px;
    word-wrap: break-word;
}
.chat-message strong {
    color: var(--primary-color);
}
.no-messages {
    color: #999;
    font-style: italic;
}
.chat-input {
    display: flex;
    gap: 10px;
}
.chat-input input {
    flex-grow: 1;
}
</style>

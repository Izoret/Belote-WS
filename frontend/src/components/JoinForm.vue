<script setup>
import { store, computedStore } from '../store.js';
import { useWebSocket } from '../composables/useWebSocket.js';
const { connect, sendMessage } = useWebSocket();

const joinRoom = async () => {
    if (!computedStore.canJoin.value) return;
    try {
        await connect();
        sendMessage('join_room', {
            playerName: store.playerName,
            roomCode: store.roomCode.toUpperCase(),
        });
    } catch (err) {
        store.errorMessage = 'Impossible de se connecter au serveur.';
    }
};
</script>

<template>
  <div class="join-form">
    <input type="text" v-model="store.playerName" placeholder="Votre nom" />
    <input type="text" v-model="store.roomCode" placeholder="Code du salon" @keyup.enter="joinRoom" />
    <button @click="joinRoom" :disabled="!computedStore.canJoin.value">Rejoindre le salon</button>
  </div>
</template>

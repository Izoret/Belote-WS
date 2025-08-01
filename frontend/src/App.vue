<script setup>
import { onMounted } from 'vue';
import { store } from './store.js';
import { useWebSocket } from './composables/useWebSocket.js';
import JoinForm from './components/JoinForm.vue';
import Lobby from './components/Lobby.vue';
import Game from './components/Game.vue';

const { connect, sendMessage } = useWebSocket();

// si données de session, on réutilise les infos reconnecter
onMounted(async () => {
    const session = localStorage.getItem('belote_session');
    if (!session) {
        console.log("No session found !!");
        return;
    }

    const { myId } = JSON.parse(session);
    if (!myId) {
        console.log("Empty session error!!!");
        return;
    }
    const myOldId = myId;

    console.log("Tentative de reconnexion... de la part de l'ancien " + myOldId);
    try {
        await connect();
        sendMessage('reconnect', { oldId: myOldId });
    } catch (err) {
        localStorage.removeItem('belote_session');
        store.errorMessage = "La reconnexion a échoué.";
    }
});
</script>

<template>
  <div class="container">
    <h1>Lobby Belote 🗿</h1>
    
    <Game v-if="store.isInGame" />
    <Lobby v-else-if="store.isInLobby" />
    <JoinForm v-else />

    <p v-if="store.errorMessage" class="error-message">{{ store.errorMessage }}</p>
  </div>
</template>

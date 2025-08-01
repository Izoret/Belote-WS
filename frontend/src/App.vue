<script setup>
import { store } from './store.js';
import JoinForm from './components/JoinForm.vue';
import Lobby from './components/Lobby.vue';
import Game from './components/Game.vue';
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

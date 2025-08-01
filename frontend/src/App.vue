<script setup>
import { store } from './store.js';
import JoinForm from './components/JoinForm.vue';
import LobbyView from './components/Lobby.vue';
</script>

<template>
  <div class="container">
    <h1>Lobby Belote 🃏</h1>
    
    <LobbyView v-if="store.isInLobby" />
    <JoinForm v-else />

    <p v-if="store.errorMessage" class="error-message">{{ store.errorMessage }}</p>
  </div>
</template>

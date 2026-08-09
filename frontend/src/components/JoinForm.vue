<script setup>
import {computedStore, store} from '../store.js'
import {useWebSocket} from '../composables/useWebSocket.js'

const {connect, sendMessage} = useWebSocket();

const joinRoom = async () => {
    try {
        await connect()
        sendMessage('join_room', {
            playerName: store.playerName,
            roomCode: store.roomCode
        })
    } catch (err) {
        store.errorMessage = 'Impossible de se connecter au serveur : ' + err
    }
}
</script>

<template>
    <div id="join-form">
        <input v-model="store.playerName" placeholder="Pseudo" type="text"/>
        <input id="room-code" v-model="store.roomCode" placeholder="Code du salon" type="text" @keyup.enter="joinRoom"/>
        <button :disabled="!computedStore.joinFormFilled.value" @click="joinRoom">Rejoindre/Créer salon</button>
    </div>
</template>

<style scoped>
#room-code {
    text-transform: uppercase;

    &::placeholder {
        text-transform: none;
    }
}
</style>
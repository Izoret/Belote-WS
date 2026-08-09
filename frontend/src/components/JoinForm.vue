<script setup>
import {store, computedStore} from '../store.js'
import {useWebSocket} from '../composables/useWebSocket.js'

const {connect, sendMessage} = useWebSocket();

const joinRoom = async () => {
    if (!computedStore.canJoin.value) return
    try {
        await connect()
        sendMessage('join_room', {
            playerName: store.playerName,
            roomCode: store.roomCode.toUpperCase(),
        })
    } catch (err) {
        store.errorMessage = 'Impossible de se connecter au serveur.'
    }
}
</script>

<template>
    <div id="join-form">
        <input type="text" v-model="store.playerName" placeholder="Pseudo"/>
        <input type="text" v-model="store.roomCode" placeholder="Code du salon" @keyup.enter="joinRoom" id="room-code"/>
        <button @click="joinRoom" :disabled="!computedStore.canJoin.value">Rejoindre/Créer salon</button>
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
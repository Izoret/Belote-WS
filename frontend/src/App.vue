<script setup>
import {onMounted} from 'vue'
import {store} from './store.js'
import {showError, useWebSocket} from './composables/useWebSocket.js'
import JoinForm from './components/JoinForm.vue'
import Lobby from './components/Lobby.vue'
import Game from './components/Game.vue'

const {connect, sendMessage} = useWebSocket()

// si données de session, on réutilise les infos pour reconnecter
onMounted(async () => {
    const session = localStorage.getItem('belote_session')
    if (!session) return

    const {myId} = JSON.parse(session)
    if (!myId) {
        showError("Empty session error!!!");
        return
    }
    const myOldId = myId

    console.log("Tentative de reconnexion... de la part de l'ancien " + myOldId)
    try {
        await connect()
        sendMessage('reconnect', {oldId: myOldId})
    } catch (err) {
        localStorage.removeItem('belote_session')
        showError("La reconnexion a échoué.")
    }
})
</script>

<template>
    <div class="container">
        <Game v-if="store.isInGame"/>
        <Lobby v-else-if="store.isInLobby"/>
        <JoinForm v-else/>

        <p v-if="store.errorMessage" class="error-message">{{ store.errorMessage }}</p>
    </div>
</template>

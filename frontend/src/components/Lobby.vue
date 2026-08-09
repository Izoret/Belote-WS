<script setup>
import {nextTick, ref, watch} from 'vue'
import {computedStore, store} from '../store.js'
import {useWebSocket} from '../composables/useWebSocket.js'

const {sendMessage} = useWebSocket()

const newMessage = ref('')
const chatBoxRef = ref(null)

const postMessage = () => {
    const text = newMessage.value
    newMessage.value = ''

    if (!text.trim()) return
    sendMessage('send_message', {text})
}

const startGame = () => {
    sendMessage('start_game', {})
}

function selectTeam(teamId) {
    sendMessage('change_team', {newTeam: teamId})
}

function leaveRoom() {
    sendMessage('leave_room', {})

    localStorage.removeItem('belote_session')
    store.isInLobby = false
    store.playersInRoom = []
    store.chatMessages = []
    store.roomCode = ''
}

watch(
    () => store.chatMessages,
    async () => {
        await nextTick()
        if (chatBoxRef.value) chatBoxRef.value.scrollTop = chatBoxRef.value.scrollHeight
    },
    {deep: true}
)
</script>

<template>
    <h1>☀️ Lobby {{ store.roomCode.toUpperCase() }} ☀️</h1>

    <div class="lobby-container">
        <div class="lobby-info">
            <h2>&lt;h2&gt;&lt;/h2&gt;</h2>

            <ul class="player-list">
                <li v-for="player in store.playersInRoom" :key="player.id"
                    :class="['player-item', { 'team-1': player.team === 1, 'team-2': player.team === 2 }]">
                    <span class="player-name">✔️ {{ player.name }}</span>

                    <div v-if="player.id === store.myId" class="team-selector">
                        <button :class="{ active: player.team === 1 }" class="team-btn team-1-btn"
                                @click="selectTeam(1)">Bleu
                        </button>
                        <button :class="{ active: player.team === 2 }" class="team-btn team-2-btn"
                                @click="selectTeam(2)">Rouge
                        </button>
                    </div>
                </li>
                <li v-for="n in (4 - store.playersInRoom.length)" :key="n" class="waiting player-item">
                    ⌛ En attente...
                </li>
            </ul>

            <button v-if="computedStore.gameReadyToStart.value" class="start-button" @click="startGame">
                Lancer la partie !
            </button>
            <div v-else class="waiting-message">
                Il faut 4 joueurs (2 équipes de 2) pour commencer.
            </div>
        </div>

        <div class="chat-area">
            <h3>Chat du salon</h3>
            <div ref="chatBoxRef" class="chat-box">
                <div v-for="(msg, index) in store.chatMessages" :key="index" class="chat-message">
                    <i>{{ msg.timestamp }} -</i> <strong>{{ msg.author }}:</strong> {{ msg.text }}
                </div>
                <p v-if="store.chatMessages.length === 0" class="no-messages">
                    Soyez le premier à envoyer un message !
                </p>
            </div>
            <div class="chat-input">
                <input v-model="newMessage" placeholder="Écrire un message..." type="text" @keyup.enter="postMessage"/>
                <button @click="postMessage">Envoyer</button>
            </div>
            <button class="leave-btn" @click="leaveRoom">Quitter</button>
        </div>
    </div>
</template>

<style scoped>
.lobby-container {
    display: flex;
    flex-direction: row;
    gap: 30px;
    align-items: stretch;
}

.lobby-info, .chat-area {
    flex: 1;
}

.leave-btn {
    position: absolute;
    top: 20px;
    right: 20px;
    background-color: #7f8c8d;
    font-size: 0.9em;
    padding: 6px 12px;
}

.lobby-info {
    position: relative;
}

.chat-area {
    border-left: none;
    border-top: 1px solid #eee;
    padding-left: 0;
    padding-top: 30px;
    height: auto;
    display: flex;
    flex-direction: column;
}

.chat-box {
    flex-grow: 1;
    overflow-y: auto;
    max-height: 400px;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 10px;
    background: #f9f9f9;
    margin-bottom: 10px;
    text-align: left;
}

.chat-message {
    margin-bottom: 8px;
    word-wrap: break-word;
    overflow-wrap: break-word;
    word-break: break-word;
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

.player-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px;
    border-radius: 4px;
    transition: background-color 0.3s;
}

.player-name {
    font-weight: 500;
}

.team-1 {
    background-color: rgba(59, 130, 246, 0.4);
}

.team-2 {
    background-color: rgba(239, 68, 68, 0.4);
}

.team-selector .team-btn {
    padding: 4px 8px;
    font-size: 0.8em;
    border: 2px solid transparent;
    cursor: pointer;
}

.team-selector .team-btn.active {
    border-color: #000;
    font-weight: bold;
}

.team-1-btn {
    background-color: rgb(59, 130, 246);
    color: white;
}

.team-2-btn {
    background-color: rgb(239, 68, 68);
    color: white;
}
</style>

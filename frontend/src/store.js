import { reactive, computed } from 'vue'

export const store = reactive(
{
    playerName: '',
    roomCode: '',
    playersInRoom: [],
    chatMessages: [],
    errorMessage: '',
    isInLobby: false,
})

export const computedStore =
{
    isLobbyFull: computed(() => store.playersInRoom.length === 4),
    canJoin: computed(() => store.playerName.trim() !== '' && store.roomCode.trim() !== ''),
}


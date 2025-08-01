import { reactive, computed } from 'vue'

export const store = reactive(
{
    myId: null,
    playerName: '',
    
    roomCode: '',
    playersInRoom: [],
    
    chatMessages: [],
    
    errorMessage: '',
    
    isInLobby: false,
    isInGame: false,
    
    gameData: {
        players: [],
        atoutPropose: null,
    },
})

export const computedStore =
{
    isLobbyFull: computed(() => store.playersInRoom.length === 4),
    canJoin: computed(() => store.playerName.trim() !== '' && store.roomCode.trim() !== ''),
}


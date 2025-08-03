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
    
    gameState: {
        myHand: [],
        players: [],
        dealerId: null,
        trumpCard: null,
        dealingAnimation: {
            active: false,
            cardCount: 0,
            dealerPosition: null
        }
    },
})

export const computedStore =
{
    isLobbyFull: computed(() => store.playersInRoom.length === 4),
    canJoin: computed(() => store.playerName.trim() !== '' && store.roomCode.trim() !== ''),
}


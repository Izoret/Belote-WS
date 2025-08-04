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
    
    game: {
        myHand: [],
        players: [],
        dealerId: null,
        dealingAnimation: {
            active: false,
            cardCount: 0,
            dealerPosition: null
        },
        bidding: {
            phase: 0,
            trumpCard: null,
            takerId: null
        },
        currentPlayerId: null,
        trumpSuit: null,
        tricks: {
            currentTrick: []
        }
    },
})

export const computedStore =
{
    isLobbyFull: computed(() => store.playersInRoom.length === 4),
    canJoin: computed(() => store.playerName.trim() !== '' && store.roomCode.trim() !== ''),
}


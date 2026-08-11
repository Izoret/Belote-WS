import {computed, reactive} from 'vue'

export const store = reactive({
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
        deckSize: 0,
        bidding: {
            phase: 0,
            trumpCard: null,
            takerId: null
        },
        currentPlayerId: null,
        trumpSuit: null,
        currentTrick: []
    },
})

export const computedStore = {
    gameReadyToStart: computed(() =>
        store.playersInRoom.filter(p => p.team === 1).length === 2 &&
        store.playersInRoom.filter(p => p.team === 2).length === 2
    ),
    joinFormFilled: computed(() => store.playerName.trim() != '' && store.roomCode.trim() != ''),
}


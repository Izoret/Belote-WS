import { store } from '../store.js'

let socket = null
let errorTimeout = null

function setErrorMessage(message) {
  store.errorMessage = message
  if (errorTimeout) clearTimeout(errorTimeout)
  errorTimeout = setTimeout(() => {
    store.errorMessage = ''
  }, 5000)
}

export function useWebSocket() {
  const connect = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      socket = new WebSocket(import.meta.env.VITE_SERVER_WS_URL)

      socket.onopen = () => {
        console.log('🔗 Connecté au serveur WebSocket !')
        store.errorMessage = ''
        resolve()
      }

      socket.onmessage = event => {
        const data = JSON.parse(event.data)
        const { type, payload, message } = data

        switch (type) {
          case 'connection_ready':
            store.myId = payload.id
            break
          case 'room_update':
            store.playersInRoom = payload.players
            store.chatMessages = payload.chat
            store.isInLobby = true
            localStorage.setItem('belote_session', JSON.stringify({
              myId: store.myId
            }))
            break
          case 'new_chat_msg':
            store.chatMessages.push(payload)
            break
          case 'game_state_update':
            if (!store.isInGame) {
              store.isInGame = true
              store.isInLobby = false
            }
            store.game.myHand = payload.myHand
            store.game.players = payload.players
            store.game.bidding = payload.bidding
            break
          case 'dealing_start':
              store.game.dealingAnimation = {
                active: true,
                cardCount: payload.cardCount,
                dealerPosition: payload.dealerId === store.myId ? 0 : 
                  store.game.players.findIndex(p => p.id === payload.dealerId)
              }
              break
          case 'game_end':
            store.game = {
              myHand: [],
              players: []
            }
            store.isInGame = false
            store.isInLobby = true
            break
          case 'f_reconnect':
            store.roomCode = payload.roomCode
            break
          case 'error':
            setErrorMessage(message)
            break
        }
      }

      socket.onclose = () => {
        console.log('🔌 Déconnecté du serveur WebSocket.')
        setErrorMessage('Déconnecté du serveur.')
        store.isInLobby = false
      }

      socket.onerror = error => {
        console.error('WebSocket Error:', error)
        setErrorMessage('Erreur de connexion avec le serveur.')
        reject(error)
      }
    })
  }

  const sendMessage = (type, payload) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type, payload }))
    }
  }

  return { connect, sendMessage }
}


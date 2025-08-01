import { store } from '../store.js';

let socket = null;

export function useWebSocket() {
  const connect = () => {
    // Évite les connexions multiples
    if (socket && socket.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
        socket = new WebSocket(import.meta.env.VITE_SERVER_WS_URL);

        socket.onopen = () => {
            console.log('🔗 Connecté au serveur WebSocket !');
            store.errorMessage = '';
            resolve();
        };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const { type, payload, message } = data; // message pour les erreurs

        switch (type) {
            case 'room_update':
                store.playersInRoom = payload.players;
                store.chatMessages = payload.chat;
                store.isInLobby = true;
                break;
            case 'new_message':
                store.chatMessages.push(payload);
                break;
            case 'error':
                store.errorMessage = message;
                break;
            case 'connection_ready':
                store.myId = payload.id;
                break;
            case 'game_started':
                store.gameData.players = payload.players;
                store.gameData.atoutPropose = payload.atoutPropose;
                store.isInGame = true;
                store.isInLobby = false;
                break;
        }
      };

      socket.onclose = () => {
        console.log('🔌 Déconnecté du serveur WebSocket.');
        store.errorMessage = 'Déconnecté du serveur.';
        store.isInLobby = false;
      };

      socket.onerror = (error) => {
        console.error('WebSocket Error:', error);
        store.errorMessage = 'Erreur de connexion avec le serveur.';
        reject(error);
      };
    });
  };

  const sendMessage = (type, payload) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type, payload }));
    }
  };

  return { connect, sendMessage };
}


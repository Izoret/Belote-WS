import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid'; // Pour donner un ID unique à chaque joueur

const wss = new WebSocketServer({ port: 8080 });

const rooms = new Map();

console.log("🟢  Serveur WebSocket démarré sur le port 8080 !");

wss.on('connection', ws => {
    ws.id = uuidv4();
    ws.send(JSON.stringify({ type: 'connection_ready', payload: { id: ws.id } }));
    console.log(`Client ${ws.id} connecté.`);

    ws.on('message', message => {
        const data = JSON.parse(message);
        const { type, payload } = data;

        switch (type) {
            case "join_room": {
                const { roomCode, playerName } = payload;
                ws.roomCode = roomCode; // On attache le code de la room au WebSocket pour le retrouver plus tard

                if (!rooms.has(roomCode)) {
                    console.log(`Création du lobby '${roomCode}' !`);
                    rooms.set(roomCode, { players: [], chat: [] });
                }

                const room = rooms.get(roomCode);

                if (room.players.length >= 4) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Le lobby est déjà plein !' }));
                    return;
                }

                for (const player of room.players) {
                    if (player.name == playerName) {
                        ws.send(JSON.stringify({ type: 'error', message: 'Ce nom est déjà pris dans cette room !' }));
                        return;
                    }
                }

                room.players.push({
                    id: ws.id,
                    name: playerName,
                    ws: ws
                });

                console.log(`Le joueur ${playerName} (${ws.id}) a rejoint la room ${roomCode}`);
                
                broadcastRoomUpdate(roomCode);

                break;
            }
            case "send_message": {
                const roomCode = ws.roomCode;
                const room = rooms.get(roomCode);
                if (!room) return;

                const sender = room.players.find(p => p.id === ws.id);
                if (!sender) return;

                const now = new Date();
                const hours = now.getHours().toString().padStart(2, '0');
                const minutes = now.getMinutes().toString().padStart(2, '0');

                const messagePayload = {
                    author: sender.name,
                    text: payload.text,
                    timestamp: `${hours}:${minutes}`
                };

                room.chat.push(messagePayload);

                broadcastChatMessage(roomCode, messagePayload);

                break;
            }
            case "start_game": {
                const roomCode = ws.roomCode;
                const room = rooms.get(roomCode);

                if (!room || room.players.length !== 4 || room.game) return;

                console.log(`Début de partie dans la room ${roomCode} !!`);

                const deck = shuffleDeck(createDeck());

                // On prend la première carte du paquet pour la "retourne"
                const atoutPropose = deck.pop();

                room.game = {
                    deck: deck, // Le reste du paquet
                    atoutPropose: atoutPropose,
                    players: room.players.map(p => ({ id: p.id, name: p.name })) // On fige l'ordre des joueurs
                };

                broadcastGameStart(roomCode);
                break;
            }
        }
    });

    ws.on('close', () => {
        console.log(`Client ${ws.id} déconnecté.`);
        const roomCode = ws.roomCode;
        if (roomCode && rooms.has(roomCode)) {
            const room = rooms.get(roomCode);
            // On retire le joueur de la liste
            room.players = room.players.filter(player => player.id !== ws.id);

            if (room.players.length === 0) {
                rooms.delete(roomCode);
                console.log(`Room ${roomCode} vide, supprimée.`);
            } else {
                broadcastRoomUpdate(roomCode);
            }
        }
    });
});

const broadcastRoomUpdate = (roomCode) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    const publicPlayers = room.players.map(p => ({ id: p.id, name: p.name }));

    room.players.forEach(player => {
        player.ws.send(JSON.stringify({
            type: 'room_update',
            payload: {
                players: publicPlayers,
                chat: room.chat
            }
        }));
    });
};

const broadcastChatMessage = (roomCode, messagePayload) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    room.players.forEach(player => {
        player.ws.send(JSON.stringify({
            type: 'new_message',
            payload: messagePayload
        }));
    });
};

const broadcastGameStart = (roomCode) => {
    const room = rooms.get(roomCode);
    if (!room || !room.game) return;

    room.players.forEach(player => {
        player.ws.send(JSON.stringify({
            type: 'game_started',
            payload: {
                players: room.game.players, // Liste des joueurs dans l'ordre de jeu
                atoutPropose: room.game.atoutPropose // La carte retournée
            }
        }));
    });
};



function createDeck() {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values = ['7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    const deck = [];
    for (const suit of suits) {
        for (const value of values) {
            deck.push({ suit, value });
        }
    }
    return deck;
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

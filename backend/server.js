import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid'; // Pour donner un ID unique à chaque joueur

const wss = new WebSocketServer({ port: 8080 });

const rooms = new Map();

console.log("🟢  Serveur WebSocket démarré sur le port 8080 !");

wss.on('connection', ws => {
    // On assigne un ID unique à chaque connexion
    ws.id = uuidv4();
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

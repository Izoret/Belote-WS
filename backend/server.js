// server.js
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid'; // Pour donner un ID unique à chaque joueur

const wss = new WebSocketServer({ port: 8080 });

// Pas de base de données ! On stocke tout en mémoire.
// La structure sera : { 'roomCode': { players: [{id, name, ws}] } }
const rooms = new Map();

console.log("🟢  Serveur WebSocket démarré sur le port 8080 !");

// Gère la mise à jour et l'envoi de l'état d'une room à tous ses membres
const broadcastRoomUpdate = (roomCode) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    // On ne veut envoyer que les infos publiques (pas l'objet WebSocket entier)
    const publicPlayers = room.players.map(p => ({ id: p.id, name: p.name }));

    // On envoie la liste à jour à chaque joueur dans la room
    room.players.forEach(player => {
        player.ws.send(JSON.stringify({
            type: 'room_update',
            players: publicPlayers
        }));
    });
};

wss.on('connection', ws => {
    // On assigne un ID unique à chaque connexion
    ws.id = uuidv4();
    console.log(`Client ${ws.id} connecté.`);

    ws.on('message', message => {
        const data = JSON.parse(message);
        const { type, payload } = data;

        if (type === 'join_room') {
            const { roomCode, playerName } = payload;
            ws.roomCode = roomCode; // On attache le code de la room au WebSocket pour le retrouver plus tard

            if (!rooms.has(roomCode)) {
                console.log(`Création du lobby '${roomCode}' !`);
                rooms.set(roomCode, { players: [] });
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
        }
    });

    ws.on('close', () => {
        console.log(`Client ${ws.id} déconnecté.`);
        const roomCode = ws.roomCode;
        if (roomCode && rooms.has(roomCode)) {
            const room = rooms.get(roomCode);
            // On retire le joueur de la liste
            room.players = room.players.filter(player => player.id !== ws.id);

            // Si la room est vide, on la supprime
            if (room.players.length === 0) {
                rooms.delete(roomCode);
                console.log(`Room ${roomCode} vide, supprimée.`);
            } else {
                // Sinon, on notifie les joueurs restants
                broadcastRoomUpdate(roomCode);
            }
        }
    });
});

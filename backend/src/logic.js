export function createDeck() {
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

export function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

export function newPlayerInRoom(room, newPlayer) {
    if (room.players.length >= 4) throw new Error('Le lobby est déjà plein !');

    if (room.players.some(player => player.name === newPlayer.name)) throw new Error('Ce nom est déjà pris dans cette room !');

    room.players.push(newPlayer);
}


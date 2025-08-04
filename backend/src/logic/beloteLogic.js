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

export function dealCards(players, deck, count) {
    for (const player of players) {
        for (let i = 0; i < count; i++) {
            if (deck.length > 0) {
                player.hand.push(deck.pop());
            }
        }
    }
}

function getCardPower(card, trumpSuit) {
    const isTrump = card.suit === trumpSuit;
    const valueMap = {
        '7': 1,
        '8': 2,
        '9': isTrump ? 9 : 3,
        'jack': isTrump ? 10 : 4,
        'queen': 5,
        'king': 6, 
        '10': 7,
        'ace': 8
    };
    let power = valueMap[card.value];
    return power;
}

export function determineTrickWinner(trick, trumpSuit) {
    if (!trick || trick.length === 0) return null;

    let winningCard = trick[0];
    for (let i = 1; i < trick.length; i++) {
        const currentCard = trick[i];
        const winningPower = getCardPower(winningCard.card, trumpSuit);
        const currentPower = getCardPower(currentCard.card, trumpSuit);

        // A trump card beats a non-trump card
        if (currentCard.card.suit === trumpSuit && winningCard.card.suit !== trumpSuit) {
            winningCard = currentCard;
        }
        // If both are the same suit, the higher power wins
        else if (currentCard.card.suit === winningCard.card.suit) {
            if (currentPower > winningPower) {
                winningCard = currentCard;
            }
        }
    }
    return winningCard.playerId;
}


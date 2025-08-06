export function createDeck() {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values = ['7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    const deck = [];
    for (const suit of suits) {
        for (const value of values) {
            deck.push({suit, value});
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
        '7': 0,
        '8': 0,
        '9': 0,
        'jack': 1,
        'queen': 2,
        'king': 3,
        '10': 4,
        'ace': 5
    }
    const trumpMap = {
        '7': 6,
        '8': 7,
        'queen': 8,
        'king': 9,
        '10': 10,
        'ace': 11,
        '9': 12,
        'jack': 13
    }
    return isTrump ? valueMap[card.value] : trumpMap[card.value]
}

export function cardsAllowedInHandForTrick(cards, trick, players, trumpSuit, team) {
    // code en français pour que je m'y retrouve

    if (trick.length === 0) return cards

    const couleurDemandee = trick[0].card.suit
    const atoutDemande = couleurDemandee === trumpSuit
    const cartesCouleurDemandee = cards.filter(card => card.suit === couleurDemandee)
    const atouts = cards.filter(card => card.suit === trumpSuit)
    const playMaitre = trickMaster(trick, trumpSuit)
    const partenaireEstMaitre = players.find(p => p.id === playMaitre.playerId).team === team
    const surcoupes = atouts.filter(card => getCardPower(card, trumpSuit) > getCardPower(playMaitre.card, trumpSuit))

    if (cartesCouleurDemandee.length > 0) {
        if (atoutDemande) {
            if (partenaireEstMaitre)
                return atouts
            else {
                if (surcoupes.length > 0) {
                    return surcoupes
                } else {
                    return atouts
                }
            }
        } else {
            return cartesCouleurDemandee
        }
    } else {
        if (atoutDemande) {
            return cards
        } else {
            if (partenaireEstMaitre) {
                return cards
            } else {
                if (atouts.length > 0) {
                    if (surcoupes.length > 0) {
                        return surcoupes
                    } else {
                        return atouts
                    }
                } else {
                    return cards
                }
            }
        }
    }
}

export function trickMaster(trick, trumpSuit) {
    if (!trick || trick.length === 0) return null;

    let playMaitre = trick[0];
    for (let i = 1; i < trick.length; i++) {
        const currentPlay = trick[i];
        const winningPower = getCardPower(playMaitre.card, trumpSuit);
        const currentPower = getCardPower(currentPlay.card, trumpSuit);

        // A trump card beats a non-trump card
        if (currentPlay.card.suit === trumpSuit && playMaitre.card.suit !== trumpSuit) {
            playMaitre = currentPlay;
        }
        // If both are the same suit, the higher power wins
        else if (currentPlay.card.suit === playMaitre.card.suit) {
            if (currentPower > winningPower) {
                playMaitre = currentPlay;
            }
        }
    }
    return playMaitre
}


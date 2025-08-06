export function validatePlayerInRoom(room, newPlayer) {
    if (room.players.length >= 4) throw new Error('Le lobby est déjà plein !');
    if (room.players.some(player => player.name === newPlayer.name)) throw new Error('Ce nom est déjà pris dans cette room !');
}

export function validateTeams(players) {
    if (players.length !== 4) throw new Error('Il faut exactement 4 joueurs pour commencer');
    const team1 = players.filter(p => p.team === 1);
    const team2 = players.filter(p => p.team === 2);
    if (team1.length !== 2 || team2.length !== 2) throw new Error("Les équipes ne sont pas équilibrées (2 Bleu / 2 Rouge) !");
    return { team1, team2 };
}

export function determinePlayerOrder(players, teams) {
    const { team1, team2 } = teams;
    return [team1[0], team2[0], team1[1], team2[1]];
}


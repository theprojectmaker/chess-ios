// Standard opening names, keyed by their main move order in SAN. The longest match wins.
const OPENINGS: [string, string][] = [
  ['e4', "King's Pawn Opening"],
  ['e4 e5', 'Open Game'],
  ['e4 e5 Nf3', "King's Knight Opening"],
  ['e4 e5 Nf3 Nc6', "King's Knight Opening"],
  ['e4 e5 Nf3 Nc6 Bb5', 'Ruy Lopez'],
  ['e4 e5 Nf3 Nc6 Bb5 a6', 'Ruy Lopez: Morphy Defense'],
  ['e4 e5 Nf3 Nc6 Bb5 Nf6', 'Ruy Lopez: Berlin Defense'],
  ['e4 e5 Nf3 Nc6 Bc4', 'Italian Game'],
  ['e4 e5 Nf3 Nc6 Bc4 Bc5', 'Italian Game: Giuoco Piano'],
  ['e4 e5 Nf3 Nc6 Bc4 Nf6', 'Italian Game: Two Knights Defense'],
  ['e4 e5 Nf3 Nc6 d4', 'Scotch Game'],
  ['e4 e5 Nf3 Nc6 Nc3', 'Three Knights Game'],
  ['e4 e5 Nf3 Nc6 Nc3 Nf6', 'Four Knights Game'],
  ['e4 e5 Nf3 Nf6', 'Petrov Defense'],
  ['e4 e5 Nf3 d6', 'Philidor Defense'],
  ['e4 e5 f4', "King's Gambit"],
  ['e4 e5 Nc3', 'Vienna Game'],
  ['e4 e5 Bc4', "Bishop's Opening"],
  ['e4 e5 Qh5', 'Wayward Queen Attack'],
  ['e4 c5', 'Sicilian Defense'],
  ['e4 c5 Nf3 d6', 'Sicilian Defense: Modern Variations'],
  ['e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6', 'Sicilian Defense: Najdorf'],
  ['e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6', 'Sicilian Defense: Dragon'],
  ['e4 c5 Nf3 Nc6', 'Sicilian Defense: Old Sicilian'],
  ['e4 c5 Nf3 e6', 'Sicilian Defense: French Variation'],
  ['e4 c5 c3', 'Sicilian Defense: Alapin'],
  ['e4 c5 Nc3', 'Sicilian Defense: Closed'],
  ['e4 e6', 'French Defense'],
  ['e4 e6 d4 d5 e5', 'French Defense: Advance'],
  ['e4 e6 d4 d5 Nc3', 'French Defense: Classical'],
  ['e4 e6 d4 d5 exd5', 'French Defense: Exchange'],
  ['e4 c6', 'Caro-Kann Defense'],
  ['e4 c6 d4 d5 e5', 'Caro-Kann Defense: Advance'],
  ['e4 c6 d4 d5 Nc3', 'Caro-Kann Defense: Main Line'],
  ['e4 d5', 'Scandinavian Defense'],
  ['e4 d6', 'Pirc Defense'],
  ['e4 g6', 'Modern Defense'],
  ['e4 Nf6', 'Alekhine Defense'],
  ['d4', "Queen's Pawn Opening"],
  ['d4 d5', "Queen's Pawn Game"],
  ['d4 d5 c4', "Queen's Gambit"],
  ['d4 d5 c4 e6', "Queen's Gambit Declined"],
  ['d4 d5 c4 c6', 'Slav Defense'],
  ['d4 d5 c4 dxc4', "Queen's Gambit Accepted"],
  ['d4 d5 Bf4', 'London System'],
  ['d4 d5 Nf3 Nf6 Bf4', 'London System'],
  ['d4 Nf6', 'Indian Defense'],
  ['d4 Nf6 Bf4', 'London System'],
  ['d4 Nf6 c4 g6', "King's Indian Defense"],
  ['d4 Nf6 c4 g6 Nc3 d5', 'Grunfeld Defense'],
  ['d4 Nf6 c4 e6 Nc3 Bb4', 'Nimzo-Indian Defense'],
  ['d4 Nf6 c4 e6 Nf3 b6', "Queen's Indian Defense"],
  ['d4 Nf6 c4 c5 d5 b5', 'Benko Gambit'],
  ['d4 f5', 'Dutch Defense'],
  ['c4', 'English Opening'],
  ['c4 e5', 'English Opening: Reversed Sicilian'],
  ['c4 c5', 'English Opening: Symmetrical'],
  ['Nf3', 'Reti Opening'],
  ['Nf3 d5 c4', 'Reti Opening'],
  ['g3', "King's Fianchetto Opening"],
  ['b3', 'Nimzo-Larsen Attack'],
  ['f4', "Bird's Opening"],
];

const LOOKUP = new Map(OPENINGS);

/** Standard chess only: a shuffled or handicap start has no opening name. */
export function openingName(history: string[]): string | null {
  for (let n = Math.min(history.length, 14); n > 0; n--) {
    const hit = LOOKUP.get(history.slice(0, n).join(' '));
    if (hit) return hit;
  }
  return null;
}

export const OPENING_LINES = OPENINGS;

import data from './puzzles.json';

export type Theme = 'mate1' | 'mate2' | 'mate3' | 'backRank' | 'hanging' | 'fork' | 'pin' | 'skewer' | 'discovered' | 'promotion' | 'material';

export interface Puzzle {
  id: string;
  fen: string;
  last: [string, string];
  line: string[]; // our move, the reply, our next move, ... in from-to form
  theme: Theme;
  mate: number | null;
  gain: 'q' | 'r' | 'n' | 'p' | null;
  rating: number; // estimated difficulty, from how deep a search needs to go to see the answer
}

export const PUZZLES = data as unknown as Puzzle[];

const GAIN_WORD = { q: 'the queen', r: 'a rook', n: 'a piece', p: 'a pawn' };

export const THEME_INFO: Record<Theme, { prompt: string; learn: string }> = {
  mate1: { prompt: 'Find checkmate', learn: 'One move ends the game. Look for the check with no escape.' },
  mate2: { prompt: 'Checkmate in 2', learn: 'Force the reply with your first move, then finish.' },
  mate3: { prompt: 'Checkmate in 3', learn: 'Three forcing moves in a row. Checks first.' },
  backRank: { prompt: 'Mate on the back rank', learn: 'A king boxed in by its own pawns falls to a rook or queen on the last rank.' },
  hanging: { prompt: 'Take the free piece', learn: 'Spot the piece nothing is protecting.' },
  fork: { prompt: 'Fork two targets', learn: 'One piece attacks two things at once. Only one can be saved.' },
  pin: { prompt: 'Exploit the pin', learn: 'A pinned piece cannot move without exposing something bigger behind it.' },
  skewer: { prompt: 'Find the skewer', learn: 'Attack the big piece. When it moves, take what stood behind it.' },
  discovered: { prompt: 'Discover an attack', learn: 'Move one piece out of the way and another one strikes.' },
  promotion: { prompt: 'Make a new queen', learn: 'Clear the way for a pawn to reach the last rank.' },
  material: { prompt: 'Win material', learn: 'Mixed tactics: find the one move that wins something.' },
};

export function successLine(p: Puzzle): string {
  if (p.mate) return 'Checkmate.';
  if (p.theme === 'promotion') return 'That pawn becomes a queen.';
  return p.gain ? `You win ${GAIN_WORD[p.gain]}.` : 'That wins material.';
}

export function puzzlesFor(theme: Theme): Puzzle[] {
  return PUZZLES.filter((p) => p.theme === theme);
}

/** The unseen puzzle nearest your puzzle rating, with a little variety. */
export function nextRatedPuzzle(rating: number, seen: Set<string>): Puzzle {
  const open = PUZZLES.filter((p) => !seen.has(p.id));
  const pool = (open.length ? open : PUZZLES).slice().sort((a, b) => Math.abs(a.rating - rating) - Math.abs(b.rating - rating));
  return pool[Math.floor(Math.random() * Math.min(6, pool.length))];
}

export interface FinishedGame {
  result: 'win' | 'loss' | 'draw'; // for a two-player game, win means White won
  twoPlayer?: boolean;
  reason: string;
  level: number;
  playerColor: 'w' | 'b';
  fens: string[]; // start position plus one entry per move
  san: string[];
  moves: { from: string; to: string }[];
}

let last: FinishedGame | null = null;

export function setLastGame(game: FinishedGame) {
  last = game;
}
export function getLastGame(): FinishedGame | null {
  return last;
}

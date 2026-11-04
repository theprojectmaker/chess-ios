export interface FinishedGame {
  result: 'win' | 'loss' | 'draw';
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

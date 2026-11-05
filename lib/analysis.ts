import { MATE } from './engine';
import { think } from './engineClient';

export interface PositionEval {
  score: number; // the side to move's view, capped so a mate does not swamp every average
  bestUci: string | null;
  secondScore: number | null;
}

// Wide enough that every root move gets a true score, even when the best move is a forced mate.
const EXACT = 100000;
const cap = (cp: number) => Math.max(-1000, Math.min(1000, cp));

export async function evaluatePosition(fen: string, previous: string[], timeMs: number): Promise<PositionEval> {
  const r = await think(fen, previous, { maxDepth: 12, timeMs, blunderMargin: EXACT });
  if (!r.best) return { score: r.score === -MATE ? -1000 : 0, bestUci: null, secondScore: null };
  const b = r.best;
  return {
    score: cap(r.score),
    bestUci: b.from + b.to + (b.promotion ?? ''),
    secondScore: r.lines[1] ? cap(r.lines[1].score) : null,
  };
}

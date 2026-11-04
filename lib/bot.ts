import { Chess, type Move } from 'chess.js';

export type BotLevel = 1 | 2 | 3 | 4 | 5;

export interface BotProfile {
  level: BotLevel;
  name: string;
  blurb: string;
  maxDepth: number;
  timeBudgetMs: number;
  blunderChance: number; // 0..1 chance to play a random legal move instead of the best one
  noise: number; // centipawn noise added to eval so the bot doesn't always pick the single top move
}

export const BOT_LADDER: BotProfile[] = [
  { level: 1, name: 'Pip the Pawn', blurb: 'Just learning the rules — expect blunders.', maxDepth: 1, timeBudgetMs: 150, blunderChance: 0.45, noise: 120 },
  { level: 2, name: 'Rosie the Rook', blurb: 'Knows the basics, still shaky.', maxDepth: 2, timeBudgetMs: 400, blunderChance: 0.18, noise: 60 },
  { level: 3, name: 'Bishop Bram', blurb: 'Solid club-level tactics.', maxDepth: 3, timeBudgetMs: 1200, blunderChance: 0.06, noise: 30 },
  { level: 4, name: 'Queen Vex', blurb: 'Sharp and hard to trick.', maxDepth: 4, timeBudgetMs: 2200, blunderChance: 0.0, noise: 12 },
  { level: 5, name: 'King Magnus Jr.', blurb: 'Plays near-perfect tactics.', maxDepth: 5, timeBudgetMs: 3200, blunderChance: 0.0, noise: 4 },
];

const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};

// Simple piece-square tables (white's perspective, rank 8 -> rank 1 top to bottom).
const PAWN_TABLE = [
  0, 0, 0, 0, 0, 0, 0, 0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5, 5, 10, 25, 25, 10, 5, 5,
  0, 0, 0, 20, 20, 0, 0, 0,
  5, -5, -10, 0, 0, -10, -5, 5,
  5, 10, 10, -20, -20, 10, 10, 5,
  0, 0, 0, 0, 0, 0, 0, 0,
];

const KNIGHT_TABLE = [
  -50, -40, -30, -30, -30, -30, -40, -50,
  -40, -20, 0, 0, 0, 0, -20, -40,
  -30, 0, 10, 15, 15, 10, 0, -30,
  -30, 5, 15, 20, 20, 15, 5, -30,
  -30, 0, 15, 20, 20, 15, 0, -30,
  -30, 5, 10, 15, 15, 10, 5, -30,
  -40, -20, 0, 5, 5, 0, -20, -40,
  -50, -40, -30, -30, -30, -30, -40, -50,
];

const BISHOP_TABLE = [
  -20, -10, -10, -10, -10, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 10, 10, 10, 10, 0, -10,
  -10, 5, 5, 10, 10, 5, 5, -10,
  -10, 0, 5, 10, 10, 5, 0, -10,
  -10, 5, 5, 5, 5, 5, 5, -10,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -20, -10, -10, -10, -10, -10, -10, -20,
];

const ROOK_TABLE = [
  0, 0, 0, 0, 0, 0, 0, 0,
  5, 10, 10, 10, 10, 10, 10, 5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  0, 0, 0, 5, 5, 0, 0, 0,
];

const QUEEN_TABLE = [
  -20, -10, -10, -5, -5, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 5, 5, 5, 0, -10,
  -5, 0, 5, 5, 5, 5, 0, -5,
  0, 0, 5, 5, 5, 5, 0, -5,
  -10, 5, 5, 5, 5, 5, 0, -10,
  -10, 0, 5, 0, 0, 0, 0, -10,
  -20, -10, -10, -5, -5, -10, -10, -20,
];

const KING_TABLE = [
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -20, -30, -30, -40, -40, -30, -30, -20,
  -10, -20, -20, -20, -20, -20, -20, -10,
  20, 20, 0, 0, 0, 0, 20, 20,
  20, 30, 10, 0, 0, 10, 30, 20,
];

const TABLES: Record<string, number[]> = {
  p: PAWN_TABLE,
  n: KNIGHT_TABLE,
  b: BISHOP_TABLE,
  r: ROOK_TABLE,
  q: QUEEN_TABLE,
  k: KING_TABLE,
};

function evaluateBoard(chess: Chess): number {
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? -100000 : 100000;
  }
  if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) {
    return 0;
  }

  let score = 0;
  const board = chess.board();
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const cell = board[row][col];
      if (!cell) continue;
      const idx = row * 8 + col;
      const table = TABLES[cell.type] ?? [];
      const positional = cell.color === 'w' ? table[idx] ?? 0 : table[63 - idx] ?? 0;
      const material = PIECE_VALUES[cell.type] ?? 0;
      const value = material + positional;
      score += cell.color === 'w' ? value : -value;
    }
  }
  return score;
}

function orderMoves(moves: Move[]): Move[] {
  return [...moves].sort((a, b) => {
    const aScore = (a.captured ? PIECE_VALUES[a.captured] ?? 0 : 0) + (a.promotion ? 800 : 0);
    const bScore = (b.captured ? PIECE_VALUES[b.captured] ?? 0 : 0) + (b.promotion ? 800 : 0);
    return bScore - aScore;
  });
}

class SearchTimeout extends Error {}

function checkDeadline(deadline: number) {
  if (Date.now() > deadline) throw new SearchTimeout();
}

function minimax(chess: Chess, depth: number, alpha: number, beta: number, maximizing: boolean, deadline: number): number {
  checkDeadline(deadline);
  if (depth === 0 || chess.isGameOver()) {
    return evaluateBoard(chess);
  }

  const moves = orderMoves(chess.moves({ verbose: true }) as Move[]);
  if (moves.length === 0) {
    return evaluateBoard(chess);
  }

  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      chess.move(move.san);
      const score = minimax(chess, depth - 1, alpha, beta, false, deadline);
      chess.undo();
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of moves) {
      chess.move(move.san);
      const score = minimax(chess, depth - 1, alpha, beta, true, deadline);
      chess.undo();
      best = Math.min(best, score);
      beta = Math.min(beta, score);
      if (alpha >= beta) break;
    }
    return best;
  }
}

/** Searches root moves at a fixed depth, returning each move's score. Throws SearchTimeout if the deadline passes. */
function searchAtDepth(chess: Chess, rootMoves: Move[], depth: number, maximizing: boolean, deadline: number) {
  const scored: { move: Move; score: number }[] = [];
  for (const move of rootMoves) {
    chess.move(move.san);
    const score = minimax(chess, depth - 1, -Infinity, Infinity, !maximizing, deadline);
    chess.undo();
    scored.push({ move, score });
  }
  return scored;
}

/** Picks a move for `chess.turn()` according to the given bot profile, using time-boxed iterative deepening. */
export function pickBotMove(fen: string, profile: BotProfile): Move | null {
  const chess = new Chess(fen);
  const legalMoves = chess.moves({ verbose: true }) as Move[];
  if (legalMoves.length === 0) return null;
  if (legalMoves.length === 1) return legalMoves[0];

  if (Math.random() < profile.blunderChance) {
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }

  const maximizing = chess.turn() === 'w';
  const deadline = Date.now() + profile.timeBudgetMs;
  const rootMoves = orderMoves(legalMoves);

  let lastCompleted: { move: Move; score: number }[] | null = null;
  for (let depth = 1; depth <= profile.maxDepth; depth++) {
    try {
      const scored = searchAtDepth(chess, rootMoves, depth, maximizing, deadline);
      lastCompleted = scored;
      // Re-order root moves by this depth's scores so deeper iterations search the
      // most promising lines first, improving alpha-beta cutoffs and the quality of
      // whatever partial result a timeout leaves us with.
      scored.sort((a, b) => (maximizing ? b.score - a.score : a.score - b.score));
      rootMoves.length = 0;
      rootMoves.push(...scored.map((s) => s.move));
      if (Date.now() > deadline) break;
    } catch (e) {
      if (e instanceof SearchTimeout) break;
      throw e;
    }
  }

  if (!lastCompleted) {
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }

  const noisy = lastCompleted.map((s) => ({ ...s, score: s.score + (Math.random() * 2 - 1) * profile.noise }));
  noisy.sort((a, b) => (maximizing ? b.score - a.score : a.score - b.score));
  return noisy[0].move;
}

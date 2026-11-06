import { Chess, type Square } from 'chess.js';

// Modelled on chess.com's published Game Review rules: most labels come from expected points lost,
// Brilliant, Great and Miss from extra rules. The sacrifice and "only move" tests are our own.
export type Label = 'brilliant' | 'great' | 'best' | 'excellent' | 'good' | 'book' | 'inaccuracy' | 'mistake' | 'miss' | 'blunder';

export const LABELS: Record<Label, { name: string; symbol: string; color: string; wash: string }> = {
  brilliant: { name: 'Brilliant', symbol: '!!', color: '#16B8B0', wash: '#DDF7F5' },
  great: { name: 'Great', symbol: '!', color: '#3F7FE0', wash: '#E2ECFC' },
  best: { name: 'Best', symbol: '★', color: '#58B92E', wash: '#E8F7DE' },
  excellent: { name: 'Excellent', symbol: '✓', color: '#6FBF3F', wash: '#EEF8E4' },
  good: { name: 'Good', symbol: '✓', color: '#6E9450', wash: '#F1F5E8' },
  book: { name: 'Book', symbol: 'B', color: '#A88865', wash: '#F4EEE6' },
  inaccuracy: { name: 'Inaccuracy', symbol: '?!', color: '#E8A800', wash: '#FFF5D6' },
  mistake: { name: 'Mistake', symbol: '?', color: '#FF8A1F', wash: '#FFEEDD' },
  miss: { name: 'Miss', symbol: '×', color: '#FF6B6B', wash: '#FFEAEA' },
  blunder: { name: 'Blunder', symbol: '??', color: '#E5383B', wash: '#FFE4E4' },
};

export const LABEL_ORDER: Label[] = ['brilliant', 'great', 'best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'miss', 'blunder'];

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

/** Chance of scoring from this evaluation: 1 is a certain win, 0 a certain loss. */
export const expectedPoints = (cp: number, scale = 170) => 1 / (1 + Math.exp(-cp / scale));

/** The same evaluation swing costs a newer player less, so grading gets stricter as ratings climb. */
export const ratingScale = (rating: number) => (rating < 600 ? 240 : rating < 1200 ? 195 : rating < 1800 ? 170 : 145);

export interface MoveFacts {
  fen: string;
  move: { from: string; to: string; promotion?: string };
  bestUci: string | null;
  bestScore: number; // the mover's view, before moving
  secondScore: number | null; // next best move, null when only one move was legal
  afterScore: number; // the mover's view, after moving
  isBook?: boolean;
  previous?: Label | null; // the opponent's label for the move just before this one
  rating?: number; // the mover's rating, which sets how strict the grading is
}

function isSacrifice(fen: string, m: MoveFacts['move']): boolean {
  const c = new Chess(fen);
  const me = c.turn();
  const them = me === 'w' ? 'b' : 'w';
  const made = c.move({ from: m.from, to: m.to, promotion: m.promotion });
  if (made.piece === 'p' || made.piece === 'k') return false;
  const gave = VALUE[made.piece];
  const took = made.captured ? VALUE[made.captured] : 0;
  if (gave - took < 2) return false;
  const attackers = c.attackers(made.to as Square, them);
  if (attackers.length === 0) return false;
  const defended = c.attackers(made.to as Square, me).length > 0;
  const cheapest = Math.min(...attackers.map((s) => VALUE[c.get(s as Square)!.type]));
  return !defended || cheapest < gave;
}

function isRecapture(fen: string, to: string, previousLast?: string): boolean {
  return !!previousLast && previousLast === to && !!new Chess(fen).get(to as Square);
}

export function classify(f: MoveFacts, previousTo?: string): Label {
  if (f.isBook) return 'book';
  const uci = f.move.from + f.move.to + (f.move.promotion ?? '');
  const isBest = f.bestUci === uci || f.bestUci === f.move.from + f.move.to;
  const scale = f.rating ? ratingScale(f.rating) : 170;
  const before = expectedPoints(f.bestScore, scale);
  const after = expectedPoints(f.afterScore, scale);
  const loss = isBest ? 0 : Math.max(0, before - after);

  // Near-best, a real sacrifice, and still fine afterwards. "Already winning" is judged by the next
  // best move: a sacrifice that is itself the winning idea must not disqualify itself.
  const withoutThisMove = expectedPoints(f.secondScore ?? f.bestScore, scale);
  if (loss <= 0.02 && withoutThisMove < 0.95 && after > 0.4 && isSacrifice(f.fen, f.move)) return 'brilliant';

  if (isBest && f.secondScore !== null) {
    const gap = before - expectedPoints(f.secondScore, scale);
    if (gap >= 0.15 && !isRecapture(f.fen, f.move.to, previousTo)) return 'great';
  }

  // The opponent just slipped and left a win on the board, and this move lets it go.
  const opponentSlipped = f.previous === 'mistake' || f.previous === 'blunder' || f.previous === 'miss';
  if (opponentSlipped && before >= 0.75 && loss >= 0.1 && after < 0.7) return 'miss';

  if (isBest) return 'best';
  if (loss <= 0.02) return 'excellent';
  if (loss <= 0.05) return 'good';
  if (loss <= 0.1) return 'inaccuracy';
  if (loss <= 0.2) return 'mistake';
  return 'blunder';
}

const CAPTURE_WORD: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };

/** A specific reason for a weak move, from what the opponent's best reply actually does. */
export function explainWeakMove(fenAfter: string, replyUci: string | null, betterSan: string | null): string {
  if (replyUci) {
    try {
      const c = new Chess(fenAfter);
      const reply = c.move({ from: replyUci.slice(0, 2), to: replyUci.slice(2, 4), promotion: replyUci[4] });
      if (c.isCheckmate()) return `That allows ${reply.san}, which is checkmate.`;
      if (reply.captured) return `That lets them take your ${CAPTURE_WORD[reply.captured]} with ${reply.san}.`;
    } catch {
      // Fall through to the generic advice below.
    }
  }
  return betterSan ? `${betterSan} was stronger here.` : 'There was a stronger move here.';
}

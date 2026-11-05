import { Chess } from 'chess.js';
import type { Label } from './classify';
import type { Teacher } from './teachers';

// Tutors change what they say with your rating: plain safety habits at the bottom, concrete
// evaluation swings and candidate moves at the top.
export type CoachTier = 'starter' | 'developing' | 'advanced';

export function tierFor(rating: number): CoachTier {
  if (rating < 700) return 'starter';
  if (rating < 1500) return 'developing';
  return 'advanced';
}

const TIPS: { from: number; tips: string[] }[] = [
  { from: 0, tips: ['Before every move, ask: is the square I am moving to safe?', 'Pieces move in set ways. Take your time, there is no rush.', 'Look at what your opponent just moved. What does it attack?'] },
  { from: 400, tips: ['Check every capture on the board before you move.', 'Get your knights and bishops out before moving the queen.', 'Castle early to keep your king safe.'] },
  { from: 700, tips: ['Look for forks: one piece hitting two targets.', 'Do not leave pieces undefended. Loose pieces drop off.', 'When you are ahead in material, trade pieces.'] },
  { from: 1000, tips: ['Checks, captures, threats: look at them in that order.', 'Find your worst piece and improve it.', 'Do not rush your attack. Bring one more piece first.'] },
  { from: 1300, tips: ['Ask what your opponent wants to do next, then stop it.', 'Pawn moves cannot be undone. Make sure you can live with them.', 'Learn which trades help you, and which only help them.'] },
  { from: 1600, tips: ['Calculate forcing lines to the end, then evaluate the final position.', 'Before you commit, compare at least two candidate moves.', 'Think about which endgame your trades lead to.'] },
  { from: 1900, tips: ['Look for quiet moves in sharp positions.', 'Play on the side where you have more pawns and more space.', 'Fix a weakness in place first, then attack it.'] },
];

export function tipFor(rating: number): string {
  let list = TIPS[0].tips;
  for (const t of TIPS) if (rating >= t.from) list = t.tips;
  return list[Math.floor(Math.random() * list.length)];
}

const PIECE: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };
const WEAK: Label[] = ['mistake', 'blunder', 'miss'];
const fmt = (cp: number) => {
  if (Math.abs(cp) >= 900) return cp > 0 ? 'winning' : 'losing';
  return `${cp >= 0 ? '+' : ''}${(cp / 100).toFixed(1)}`;
};

export interface CoachFacts {
  rating: number;
  teacher: Teacher;
  label: Label;
  fenAfter: string;
  replyUci: string | null; // the opponent's best answer to the move
  betterSan: string | null;
  scoreBefore?: number; // the mover's view
  scoreAfter?: number;
}

export function coachLine(f: CoachFacts): string {
  const voice = f.teacher.say[f.label][Math.floor(Math.random() * f.teacher.say[f.label].length)];
  const tier = tierFor(f.rating);
  const swing = f.scoreBefore !== undefined && f.scoreAfter !== undefined ? ` Eval ${fmt(f.scoreBefore)} to ${fmt(f.scoreAfter)}.` : '';

  if (!WEAK.includes(f.label)) {
    if (tier === 'advanced' && f.label !== 'book' && f.scoreAfter !== undefined) return `${voice} Eval ${fmt(f.scoreAfter)}.`;
    return voice;
  }

  let reply = null;
  if (f.replyUci) {
    try {
      const c = new Chess(f.fenAfter);
      const m = c.move({ from: f.replyUci.slice(0, 2), to: f.replyUci.slice(2, 4), promotion: f.replyUci[4] });
      reply = { san: m.san, captured: m.captured, mate: c.isCheckmate() };
    } catch {
      reply = null;
    }
  }

  if (tier === 'starter') {
    if (reply?.mate) return 'Careful! That lets them checkmate you.';
    if (reply?.captured) return `Careful! They can take your ${PIECE[reply.captured]} now.`;
    return `${voice} Check if your pieces are safe before you move.`;
  }
  if (tier === 'developing') {
    if (reply?.mate) return `That allows ${reply.san}, which is checkmate.`;
    if (reply?.captured) return `That lets them take your ${PIECE[reply.captured]} with ${reply.san}.`;
    return f.betterSan ? `${f.betterSan} was stronger here.` : voice;
  }
  if (reply?.mate) return `${reply.san} is mate.${f.betterSan ? ` ${f.betterSan} held on.` : ''}`;
  const threat = reply ? `${reply.san} is the problem.` : '';
  return `${threat}${f.betterSan ? ` Better was ${f.betterSan}.` : ''}${swing}`.trim() || voice;
}

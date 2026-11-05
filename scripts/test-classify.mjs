// Run: node --no-warnings scripts/test-classify.mjs   Exercises the real lib/classify.ts with the real engine.
import { createRequire } from 'node:module';
import { Engine } from '../lib/engine.ts';
const require = createRequire(import.meta.url);
const { Chess } = require('chess.js');

// classify.ts imports chess.js by bare name, which Node resolves through node_modules.
const { classify, explainWeakMove } = await import('../lib/classify.ts');

const e = new Engine();
const cap = (x) => Math.max(-1000, Math.min(1000, x));
async function ev(fen, ms) {
  e.setPosition(fen);
  const r = await e.think({ maxDepth: 14, timeMs: ms, blunderMargin: 100000 });
  if (!r.best) return { score: r.score === -30000 ? -1000 : 0, bestUci: null, secondScore: null };
  return { score: cap(r.score), bestUci: r.best.from + r.best.to + (r.best.promotion ?? ''), secondScore: r.lines[1] ? cap(r.lines[1].score) : null };
}
async function label(fen, uci, extra = {}, ms = 700) {
  const c = new Chess(fen);
  const move = { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] };
  c.move(move);
  const A = await ev(fen, ms);
  const B = await ev(c.fen(), ms);
  return { label: classify({ fen, move, bestUci: A.bestUci, bestScore: A.score, secondScore: A.secondScore, afterScore: -B.score, ...extra }), A, B, after: c.fen() };
}

let failed = 0;
const expect = async (name, fen, uci, want, extra) => {
  const r = await label(fen, uci, extra);
  const ok = [].concat(want).includes(r.label);
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${uci} -> ${r.label} (want ${want}; ${r.A.score} -> ${-r.B.score}, best ${r.A.bestUci})`);
  return r;
};

const START_E4 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
await expect('book flag wins', START_E4, 'g1f3', 'book', { isBook: true });
await expect('losing a knight for a pawn', 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', 'f3e5', 'blunder');
await expect('queen walks onto a knight', 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', 'd8g5', 'blunder');
await expect('mate in one, the only winning move', '6k1/5ppp/8/8/8/8/8/K3R3 w - - 0 1', 'e1e8', 'great');
await expect('walking past mate in one', '6k1/5ppp/8/8/8/8/8/K3R3 w - - 0 1', 'a1a2', ['blunder', 'mistake']);
await expect('queen sacrifice forcing smothered mate', '5r1k/6pp/7N/8/8/1Q6/6K1/r7 w - - 0 1', 'b3g8', 'brilliant');
await expect('taking a free queen is great, not brilliant', '4k3/8/8/3n4/8/2Q5/8/4K3 b - - 0 1', 'd5c3', 'great');
await expect('missing a free queen after a blunder', '7k/8/8/8/8/1Qr5/8/K7 b - - 0 1', 'h8h7', 'miss', { previous: 'blunder' });
await expect('same move with no slip before it', '7k/8/8/8/8/1Qr5/8/K7 b - - 0 1', 'h8h7', 'blunder');
await expect('a normal developing move is not punished', START_E4, 'b1c3', ['best', 'excellent', 'good']);
await expect('a pawn push that gives up a little', 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', 'a2a4', ['good', 'inaccuracy', 'excellent', 'mistake']);

console.log('explain:', explainWeakMove('r1bqkbnr/pppp1ppp/2n5/3Qp3/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 3 3', 'c6b4', 'Nf3'));
console.log('explain:', explainWeakMove('6k1/5ppp/8/8/8/8/4r3/K7 b - - 0 1', 'e2e1', null));
console.log(failed ? `${failed} FAILED` : 'all passed');
process.exit(failed ? 1 : 0);

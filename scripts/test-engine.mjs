// Run: node scripts/test-engine.mjs   Exercises the real lib/engine.ts, not a copy of it.
import { createRequire } from 'node:module';
import { Engine, mateIn } from '../lib/engine.ts';

const { Chess } = createRequire(import.meta.url)('chess.js');
let failed = 0;
const check = (ok, label) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
  if (!ok) failed++;
};

// Published perft counts: any move generation bug changes these numbers.
const PERFT = [
  ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 5, 4865609],
  ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', 4, 4085603],
  ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', 5, 674624],
  ['r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', 4, 422333],
  ['rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', 4, 2103487],
  ['r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10', 4, 3894594],
];
const e = new Engine();
for (const [fen, depth, expected] of PERFT) {
  e.setPosition(fen);
  const t = Date.now();
  const got = e.perft(depth);
  check(got === expected, `perft ${depth} = ${got} (expected ${expected}) ${Date.now() - t}ms`);
}

// Random games: the engine's legal moves must match chess.js exactly in every position.
let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
let positions = 0;
let mismatches = 0;
for (let g = 0; g < 25; g++) {
  const c = new Chess();
  for (let ply = 0; ply < 160 && !c.isGameOver(); ply++) {
    e.setPosition(c.fen());
    const mine = e.legalMoves().map((m) => m.from + m.to + (m.promotion ?? '')).sort();
    const theirs = c.moves({ verbose: true }).map((m) => m.from + m.to + (m.promotion ?? '')).sort();
    positions++;
    if (mine.join() !== theirs.join()) {
      mismatches++;
      console.log('mismatch', c.fen());
    }
    const list = c.moves({ verbose: true });
    c.move(list[Math.floor(rnd() * list.length)]);
  }
}
check(mismatches === 0, `legal moves match chess.js across ${positions} random positions`);

const think = async (fen, timeMs = 1500, maxDepth = 30) => {
  e.setPosition(fen);
  return e.think({ maxDepth, timeMs });
};
const name = (m) => m.from + m.to + (m.promotion ?? '');

const m1 = await think('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
check(name(m1.best) === 'a1a8' && mateIn(m1.score) === 1, `finds back rank mate in 1 (${name(m1.best)})`);
const m2 = await think('r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4');
check(name(m2.best) === 'h5f7' && mateIn(m2.score) === 1, `finds scholar's mate (${name(m2.best)})`);
const m3 = await think('4k3/8/8/3n4/8/2Q5/8/4K3 b - - 0 1');
check(name(m3.best) === 'd5c3', `takes the free queen (${name(m3.best)})`);
const m4 = await think('2bqkbn1/2pppp2/np2N3/r3P1p1/p2N2B1/5Q2/PPPPKPP1/RNB2r2 w - - 0 1', 3000);
check(mateIn(m4.score) !== null && mateIn(m4.score) > 0, `finds a forced mate in a sharp position (mate in ${mateIn(m4.score)})`);
const stale = await think('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
check(stale.move === null && stale.score === 0, 'recognises stalemate');

// No moves wasted: a time budget must be respected to within one yield slice.
const t0 = Date.now();
await think('r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 7', 400);
const took = Date.now() - t0;
check(took < 480, `400ms budget took ${took}ms`);

// Repetition: when winning, the engine must not walk back into a position already seen twice.
const fens = ['6k1/8/8/8/8/8/5Q2/6K1 w - - 0 1', '6k1/8/8/8/8/8/5Q2/6K1 w - - 2 2'];
e.setPosition('6k1/8/8/8/8/8/5Q2/6K1 w - - 4 3', fens);
const rep = await e.think({ maxDepth: 8, timeMs: 500 });
check(rep.score > 300, `keeps a won ending winning with repetition history (score ${rep.score})`);

const speed = new Engine();
speed.setPosition('r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 7');
const s = await speed.think({ maxDepth: 40, timeMs: 2000 });
console.log(`info: middlegame in 2s reached depth ${s.depth}, ${s.nodes} nodes`);

console.log(failed ? `${failed} FAILED` : 'all passed');
process.exit(failed ? 1 : 0);

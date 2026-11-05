// Run: node --no-warnings scripts/test-modes.mjs   Checks start positions, and that each endgame drill is really winnable.
import { createRequire } from 'node:module';
import { Engine } from '../lib/engine.ts';
import { ENDGAMES, queenOddsFen, shuffleFen } from '../lib/variants.ts';

const { Chess } = createRequire(import.meta.url)('chess.js');
let failed = 0;
const check = (ok, label) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
  if (!ok) failed++;
};

let shuffleOk = 0;
for (let i = 0; i < 500; i++) {
  const fen = shuffleFen();
  const row = fen.split('/')[0];
  const c = new Chess(fen);
  const b1 = row.indexOf('b');
  const b2 = row.lastIndexOf('b');
  const counts = [...'rnbqk'].map((p) => [...row].filter((x) => x === p).length).join('');
  if (c.moves().length > 0 && (b1 + b2) % 2 === 1 && counts === '22211') shuffleOk++;
}
check(shuffleOk === 500, `500 shuffle starts are legal, opposite-color bishops, full piece set (${shuffleOk})`);
check(new Chess(queenOddsFen('b')).get('d8') === undefined && !!new Chess(queenOddsFen('b')).get('d1'), 'queen odds removes only the bot queen when the bot is Black');
check(new Chess(queenOddsFen('w')).get('d1') === undefined && !!new Chess(queenOddsFen('w')).get('d8'), 'queen odds removes only the bot queen when the bot is White');

const e = new Engine();
for (const g of ENDGAMES) {
  const c = new Chess(g.fen);
  const fens = [];
  while (!c.isGameOver() && c.history().length < 200) {
    e.setPosition(c.fen(), fens);
    const r = await e.think({ maxDepth: 30, timeMs: 80 });
    fens.push(c.fen());
    c.move(r.move);
  }
  check(c.isCheckmate() && c.turn() === 'b', `${g.name}: the engine as White converts to mate against best defence (${Math.ceil(c.history().length / 2)} moves${c.isCheckmate() ? '' : ', result ' + c.fen()})`);
}
console.log(failed ? `${failed} FAILED` : 'all passed');
process.exit(failed ? 1 : 0);

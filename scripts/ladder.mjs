// Usage: node scripts/ladder.mjs   Plays each bot against the next level up with the real settings.
// Time budgets are divided by 12 to approximate a phone's slower JavaScript engine on this PC.
import { createRequire } from 'node:module';
import { Engine } from '../lib/engine.ts';
import { BOTS } from '../lib/bots.ts';
import { BOOK_LINES, bookMove } from '../lib/book.ts';

const { Chess } = createRequire(import.meta.url)('chess.js');
const GAMES = Number(process.argv[2] ?? 20);
const a = new Engine();
const b = new Engine();

async function play(white, black, openLine) {
  const c = new Chess();
  const fens = [];
  for (const san of openLine.slice(0, 4)) {
    fens.push(c.fen());
    c.move(san);
  }
  while (!c.isGameOver() && c.history().length < 240) {
    const bot = c.turn() === 'w' ? white : black;
    const engine = c.turn() === 'w' ? a : b;
    const book = bot.useBook ? bookMove(c.history()) : null;
    let move = book;
    if (!move) {
      engine.setPosition(c.fen(), fens);
      const r = await engine.think({ ...bot.think, timeMs: Math.max(10, bot.think.timeMs / 12) });
      move = r.move;
    }
    fens.push(c.fen());
    c.move(move);
  }
  if (c.isCheckmate()) return c.turn() === 'w' ? -1 : 1;
  return 0;
}

for (let i = Number(process.argv[3] ?? 0); i + 1 < BOTS.length; i++) {
  const low = BOTS[i];
  const high = BOTS[i + 1];
  let hi = 0, lo = 0, draw = 0;
  for (let g = 0; g < GAMES; g++) {
    const open = BOOK_LINES[g % BOOK_LINES.length];
    const res = g % 2 === 0 ? await play(high, low, open) : -(await play(low, high, open));
    if (res > 0) hi++;
    else if (res < 0) lo++;
    else draw++;
  }
  console.log(`${high.name} (L${high.level}) vs ${low.name} (L${low.level}): +${hi} -${lo} =${draw}`);
}
process.exit(0);

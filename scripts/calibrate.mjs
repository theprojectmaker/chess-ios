// Measures bot ratings. Stockfish is a dev-only reference and is never shipped in the app.
//   node scripts/calibrate.mjs sf <path to stockfish js> <games> <level:elo,level:elo,...> <outFile>
//   node scripts/calibrate.mjs chain <games> <low-high,low-high,...> <outFile>
// Bot time budgets are divided by 12 to approximate a phone's slower JavaScript engine on this PC.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { Engine } from '../lib/engine.ts';
import { BOTS } from '../lib/bots.ts';
import { BOOK_LINES } from '../lib/book.ts';

const { Chess } = createRequire(import.meta.url)('chess.js');
const SF_MOVETIME = 100;
const uci = (m) => m.from + m.to + (m.promotion ?? '');
const openings = BOOK_LINES.map((l) => l.slice(0, 4));

function startStockfish(file) {
  const proc = spawn(process.execPath, [file], { stdio: ['pipe', 'pipe', 'ignore'] });
  let buffer = '';
  const waiters = [];
  proc.stdout.on('data', (chunk) => {
    buffer += chunk;
    let i;
    while ((i = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, i).trim();
      buffer = buffer.slice(i + 1);
      const at = waiters.findIndex((w) => line.startsWith(w.prefix));
      if (at >= 0) waiters.splice(at, 1)[0].resolve(line);
    }
  });
  const send = (s) => proc.stdin.write(s + '\n');
  const until = (prefix) => new Promise((resolve) => waiters.push({ prefix, resolve }));
  return { send, until, stop: () => proc.kill() };
}

async function botMove(engine, bot, c, fens) {
  engine.setPosition(c.fen(), fens);
  const r = await engine.think({ ...bot.think, timeMs: Math.max(10, bot.think.timeMs / 12) });
  return r.move;
}

function outcome(c) {
  if (c.isCheckmate()) return c.turn() === 'w' ? -1 : 1;
  return 0;
}

async function playVsStockfish(sf, engine, bot, botIsWhite, opening) {
  const c = new Chess();
  const fens = [];
  for (const san of opening) {
    fens.push(c.fen());
    c.move(san);
  }
  sf.send('ucinewgame');
  while (!c.isGameOver() && c.history().length < 260) {
    let move;
    if ((c.turn() === 'w') === botIsWhite) {
      move = await botMove(engine, bot, c, fens);
    } else {
      sf.send(`position fen ${c.fen()}`);
      const wait = sf.until('bestmove');
      sf.send(`go movetime ${SF_MOVETIME}`);
      const best = (await wait).split(/\s+/)[1];
      move = { from: best.slice(0, 2), to: best.slice(2, 4), promotion: best[4] };
    }
    fens.push(c.fen());
    c.move(move);
  }
  return outcome(c) * (botIsWhite ? 1 : -1);
}

async function playBots(a, b, ea, eb, aIsWhite, opening) {
  const c = new Chess();
  const fens = [];
  for (const san of opening) {
    fens.push(c.fen());
    c.move(san);
  }
  while (!c.isGameOver() && c.history().length < 260) {
    const aToMove = (c.turn() === 'w') === aIsWhite;
    const move = await botMove(aToMove ? ea : eb, aToMove ? a : b, c, fens);
    fens.push(c.fen());
    c.move(move);
  }
  return outcome(c) * (aIsWhite ? 1 : -1);
}

const [cmd] = process.argv.slice(2);
const results = [];
const save = (out) => fs.writeFileSync(out, JSON.stringify(results));

if (cmd === 'sf') {
  const [, file, gamesArg, tasksArg, out] = process.argv.slice(2);
  const sf = startStockfish(file);
  sf.send('uci');
  await sf.until('uciok');
  sf.send('setoption name UCI_LimitStrength value true');
  const engine = new Engine();
  for (const task of tasksArg.split(',')) {
    const [level, elo] = task.split(':').map(Number);
    const bot = BOTS.find((b) => b.level === level);
    sf.send(`setoption name UCI_Elo value ${elo}`);
    sf.send('isready');
    await sf.until('readyok');
    let w = 0, l = 0, d = 0;
    for (let g = 0; g < Number(gamesArg); g++) {
      const r = await playVsStockfish(sf, engine, bot, g % 2 === 0, openings[g % openings.length]);
      if (r > 0) w++; else if (r < 0) l++; else d++;
      results[results.findIndex((x) => x.level === level && x.elo === elo) >= 0 ? results.findIndex((x) => x.level === level && x.elo === elo) : results.length] = { level, elo, w, l, d };
      save(out);
    }
    console.log(`L${level} ${bot.name} vs Stockfish ${elo}: +${w} -${l} =${d}`);
  }
  sf.stop();
} else {
  const [, gamesArg, pairsArg, out] = process.argv.slice(2);
  const ea = new Engine();
  const eb = new Engine();
  for (const pair of pairsArg.split(',')) {
    const [low, high] = pair.split('-').map(Number);
    const a = BOTS.find((b) => b.level === high);
    const b = BOTS.find((x) => x.level === low);
    let w = 0, l = 0, d = 0;
    for (let g = 0; g < Number(gamesArg); g++) {
      const r = await playBots(a, b, ea, eb, g % 2 === 0, openings[g % openings.length]);
      if (r > 0) w++; else if (r < 0) l++; else d++;
    }
    results.push({ high, low, w, l, d });
    save(out);
    console.log(`L${high} ${a.name} vs L${low} ${b.name}: +${w} -${l} =${d}`);
  }
}
process.exit(0);

// Run: node --no-warnings scripts/rate-puzzles.mjs
// Estimates each puzzle's difficulty from how deep a search must go before the solution becomes,
// and stays, the top move, plus how many moves the player must find. These are estimates, not
// ratings earned from real solvers, which an offline app has no way to collect.
import fs from 'node:fs';
import path from 'node:path';
import { Engine } from '../lib/engine.ts';

const file = path.join(import.meta.dirname, '..', 'lib', 'puzzles.json');
const P = JSON.parse(fs.readFileSync(file, 'utf8'));
const e = new Engine();
// An engine sees a short mate instantly but a person has to work for it, so themes add human difficulty.
const THEME_BONUS = {"mate2":450,"mate3":750,"fork":150,"pin":200,"skewer":200,"discovered":250,"material":100,"backRank":100,"hanging":0,"mate1":0,"promotion":50};
const uci = (m) => m.from + m.to + (m.promotion ?? '');

for (const p of P) {
  let needed = 12;
  for (let depth = 12; depth >= 1; depth--) {
    e.setPosition(p.fen);
    const r = await e.think({ maxDepth: depth, timeMs: 3000 });
    if (r.depth === depth && uci(r.best) !== p.line[0]) break;
    if (r.depth < depth) continue;
    needed = depth;
  }
  const playerMoves = (p.line.length + 1) / 2;
  const base = 220 + (needed - 1) * 150 + (playerMoves - 1) * 220;
  const pieces = p.fen.split(' ')[0].replace(/[^a-zA-Z]/g, '').length;
  p.depth = needed;
  p.rating = Math.max(150, Math.min(2400, Math.round((base + pieces * 9 + (THEME_BONUS[p.theme] ?? 0)) / 25) * 25));
}
P.sort((a, b) => a.rating - b.rating);
fs.writeFileSync(file, JSON.stringify(P));
const r = P.map((p) => p.rating);
console.log(`rated ${P.length}: min ${r[0]}, median ${r[r.length >> 1]}, max ${r[r.length - 1]}`);
const byTheme = {};
for (const p of P) (byTheme[p.theme] ??= []).push(p.rating);
for (const [t, l] of Object.entries(byTheme)) console.log(t.padEnd(11), l.length, `${l[0]}-${l[l.length - 1]}`);
process.exit(0);

// Usage: node scripts/audit-puzzles.mjs [msPerPosition]
// Checks every step of every puzzle, not just the first: a line that rejects an equally good move
// tells the player they are wrong when they are right.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { Engine, mateIn } from '../lib/engine.ts';

const { Chess } = createRequire(import.meta.url)('chess.js');
const ms = Number(process.argv[2] ?? 300);
const P = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '..', 'lib', 'puzzles.json'), 'utf8'));
const e = new Engine();
const parse = (u) => ({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
const uci = (m) => m.from + m.to + (m.promotion ?? '');
const issues = {};
const note = (kind, p, detail) => (issues[kind] ??= []).push(`${p.id} ${detail}`);
const kinds = { promotionLines: 0, castling: 0, enPassant: 0, black: 0, multiMove: 0 };

for (const p of P) {
  const c = new Chess(p.fen);
  if (p.fen.split(' ')[1] === 'b') kinds.black++;
  if (p.line.length > 1) kinds.multiMove++;
  for (let i = 0; i < p.line.length; i++) {
    const mine = i % 2 === 0;
    let made;
    try {
      if (mine) {
        e.setPosition(c.fen());
        const r = await e.think({ maxDepth: 30, timeMs: ms, blunderMargin: 600 });
        const expected = p.line[i];
        const alt = r.lines.filter((l) => uci(l) !== expected);
        const expScore = r.lines.find((l) => uci(l) === expected)?.score;
        if (expScore === undefined || expScore < r.score - 120) note('solution not near best', p, `step ${i}: ${expected} ${expScore} vs best ${uci(r.best)} ${r.score}`);
        const remaining = (p.line.length - i + 1) / 2;
        for (const l of alt) {
          const m = mateIn(l.score);
          if (p.mate ? m !== null && m > 0 && m <= remaining : expScore !== undefined && l.score >= expScore - 100) {
            note('good alternative rejected', p, `step ${i}: expected ${expected} (${expScore}), also ${uci(l)} (${l.score})`);
          }
        }
      }
      made = c.move(parse(p.line[i]));
    } catch (err) {
      note('illegal step', p, `step ${i} ${p.line[i]}`);
      break;
    }
    if (made.promotion) kinds.promotionLines++;
    if (made.flags.includes('k') || made.flags.includes('q')) kinds.castling++;
    if (made.flags.includes('e')) kinds.enPassant++;
  }
  if (p.mate && !c.isCheckmate()) note('no mate at end', p, c.fen());
  const lastMover = new Chess(p.fen);
  try {
    lastMover.move({ from: p.last[0], to: p.last[1] });
    note('last move still legal for side to move', p, p.last.join('-'));
  } catch {
    // Expected: the highlighted last move belongs to the opponent.
  }
}
console.log(P.length, 'puzzles', JSON.stringify(kinds));
for (const [k, list] of Object.entries(issues)) {
  console.log(`\n${k}: ${list.length}`);
  for (const line of list.slice(0, 40)) console.log('  ' + line);
}
process.exit(0);

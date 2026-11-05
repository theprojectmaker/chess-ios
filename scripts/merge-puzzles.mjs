// Usage: node scripts/merge-puzzles.mjs <msPerPosition> <part.json> [part.json ...]
// Merges generator output into lib/puzzles.json. Every puzzle is re-searched from scratch and is
// dropped unless its solution is legal, ends as claimed, and its first move is clearly the only one.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { Engine, mateIn } from '../lib/engine.ts';

const { Chess } = createRequire(import.meta.url)('chess.js');
const ms = Number(process.argv[2] ?? 1500);
const parts = process.argv.slice(3);
const e = new Engine();
const parse = (u) => ({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
const uci = (m) => m.from + m.to + (m.promotion ?? '');
const CAP = {};

const seen = new Set();
const all = [];
for (const file of parts) {
  if (!fs.existsSync(file)) continue;
  for (const p of JSON.parse(fs.readFileSync(file, 'utf8'))) {
    const key = p.fen.split(' ').slice(0, 2).join(' ');
    if (!seen.has(key)) {
      seen.add(key);
      all.push(p);
    }
  }
}

const kept = [];
const dropped = {};
const drop = (why) => { dropped[why] = (dropped[why] ?? 0) + 1; };
for (const p of all) {
  const c = new Chess(p.fen);
  const me = c.turn();
  let legal = true;
  try {
    for (const u of p.line) c.move(parse(u));
  } catch {
    legal = false;
  }
  if (!legal) { drop('illegal'); continue; }
  if (p.line.length % 2 === 0) { drop('even line'); continue; }
  if (p.mate && !c.isCheckmate()) { drop('no mate at end'); continue; }

  e.setPosition(p.fen);
  const r = await e.think({ maxDepth: 40, timeMs: ms, blunderMargin: 2000 });
  if (uci(r.best) !== p.line[0]) { drop('first move not best'); continue; }
  const second = r.lines[1];
  if (p.mate) {
    if (mateIn(r.score) !== p.mate) { drop('mate length differs'); continue; }
    const secondMate = second ? mateIn(second.score) : null;
    if (secondMate !== null && secondMate > 0 && secondMate <= p.mate) { drop('equally fast mate exists'); continue; }
  } else if (second) {
    if (r.score - second.score < 180 || r.score < 180) { drop('not clearly unique'); continue; }
  }
  // After the last move of the line, the opponent must be clearly worse.
  if (!p.mate) {
    e.setPosition(c.fen());
    const after = await e.think({ maxDepth: 40, timeMs: ms / 2 });
    if (after.score > -120) { drop('line does not hold'); continue; }
  }
  if (me !== p.fen.split(' ')[1]) { drop('wrong side'); continue; }
  kept.push(p);
}

// Name a "win material" puzzle by what its first move actually does, when that is clear-cut.
const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
function sharperTheme(p) {
  const c = new Chess(p.fen);
  const me = c.turn();
  const them = me === 'w' ? 'b' : 'w';
  const first = c.move(parse(p.line[0]));
  const targets = [];
  for (const row of c.board()) {
    for (const piece of row) {
      if (!piece || piece.color !== them || VALUE[piece.type] < 3) continue;
      if (!c.attackers(piece.square, me).includes(first.to)) continue;
      const defended = c.attackers(piece.square, them).length > 0;
      if (piece.type === 'k' || VALUE[piece.type] > VALUE[first.piece] || !defended) targets.push(piece);
    }
  }
  const movedTo = c.get(first.to);
  const stillSafe = c.attackers(first.to, them).length === 0 || targets.some((t) => t.type === 'k');
  if (['b', 'r', 'q'].includes(first.piece)) {
    for (const t of targets) {
      const dx = Math.sign(t.square.charCodeAt(0) - first.to.charCodeAt(0));
      const dy = Math.sign(Number(t.square[1]) - Number(first.to[1]));
      let x = t.square.charCodeAt(0) + dx;
      let y = Number(t.square[1]) + dy;
      while (x >= 97 && x <= 104 && y >= 1 && y <= 8) {
        const behind = c.get(String.fromCharCode(x) + y);
        if (behind) {
          if (behind.color === them && VALUE[behind.type] > VALUE[t.type] && (behind.type === 'k' || behind.type === 'q')) return 'pin';
          if (behind.color === them && VALUE[t.type] > VALUE[behind.type] && VALUE[behind.type] >= 3) return 'skewer';
          break;
        }
        x += dx;
        y += dy;
      }
    }
  }
  if (targets.length >= 2 && stillSafe && movedTo) return 'fork';
  return 'material';
}
for (const p of kept) if (p.theme === 'material') p.theme = sharperTheme(p);

const byTheme = {};
for (const p of kept) (byTheme[p.theme] ??= []).push(p);
const out = [];
for (const theme of Object.keys(byTheme)) {
  const list = byTheme[theme].sort((a, b) => a.line.length - b.line.length).slice(0, CAP[theme] ?? 999);
  list.forEach((p, i) => out.push({ id: `${theme}-${i + 1}`, ...p }));
}
const target = path.join(import.meta.dirname, '..', 'lib', 'puzzles.json');
fs.writeFileSync(target, JSON.stringify(out));
const counts = Object.fromEntries(Object.entries(byTheme).map(([k, v]) => [k, v.length]));
console.log(`checked ${all.length}, kept ${kept.length}, wrote ${out.length}`);
console.log('kept by theme', JSON.stringify(counts));
console.log('dropped', JSON.stringify(dropped));
process.exit(0);

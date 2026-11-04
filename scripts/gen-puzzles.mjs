// Usage: node scripts/gen-puzzles.mjs <seed> <minutes> <outFile>
// Plays engine games, then keeps positions where exactly one move wins. Theme labels come from
// inspecting the winning line, so a "fork" really is one piece attacking two valuable targets.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { Engine, mateIn } from '../lib/engine.ts';
import { BOOK_LINES } from '../lib/book.ts';

const { Chess } = createRequire(import.meta.url)('chess.js');
const seedArg = Number(process.argv[2] ?? 1);
const minutes = Number(process.argv[3] ?? 10);
const outFile = process.argv[4] ?? `puzzles-${seedArg}.json`;

let seed = seedArg * 7919 + 13;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
  return seed / 0x7fffffff;
};

const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const TARGET = { mate1: 15, mate2: 45, mate3: 25, backRank: 25, hanging: 15, fork: 40, pin: 25, skewer: 25, discovered: 25, promotion: 25, material: 20 };
const e = new Engine();
const found = [];
const seen = new Set();
const counts = {};

const uci = (m) => m.from + m.to + (m.promotion ?? '');
const parse = (u) => ({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });

async function analyse(fen, ms, depth, wide = 2000) {
  e.setPosition(fen);
  return e.think({ maxDepth: depth, timeMs: ms, margin: 0, blunderChance: 0, blunderMargin: wide });
}

function material(c, color) {
  let total = 0;
  for (const row of c.board()) for (const p of row) if (p && p.color === color && p.type !== 'k') total += VALUE[p.type];
  return total;
}
const balance = (c, color) => material(c, color) - material(c, color === 'w' ? 'b' : 'w');

function raySquares(from, to) {
  const fx = from.charCodeAt(0), fy = Number(from[1]), tx = to.charCodeAt(0), ty = Number(to[1]);
  const dx = Math.sign(tx - fx), dy = Math.sign(ty - fy);
  if (!(fx === tx || fy === ty || Math.abs(tx - fx) === Math.abs(ty - fy))) return null;
  const out = [];
  let x = fx + dx, y = fy + dy;
  while (x >= 97 && x <= 104 && y >= 1 && y <= 8) {
    out.push(String.fromCharCode(x) + y);
    x += dx;
    y += dy;
  }
  return out;
}

function classifyTactic(fen, line) {
  const c = new Chess(fen);
  const me = c.turn();
  const them = me === 'w' ? 'b' : 'w';
  const first = c.move(parse(line[0]));
  if (first.promotion || line.some((u) => u.length === 5)) return 'promotion';
  const before = new Chess(fen);

  if (line.length === 1 && first.captured && VALUE[first.captured] >= 3) {
    if (before.attackers(first.to, them).length === 0) return 'hanging';
  }

  if (line.length >= 3) {
    const reply = parse(line[1]);
    const follow = parse(line[2]);
    const movedType = first.piece;
    const targets = [];
    for (const row of c.board()) {
      for (const p of row) {
        if (!p || p.color !== them) continue;
        if (c.attackers(p.square, me).includes(first.to)) {
          const defended = c.attackers(p.square, them).length > 0;
          if (p.type === 'k' || VALUE[p.type] > VALUE[movedType] || (!defended && VALUE[p.type] >= 3)) targets.push(p.square);
        }
      }
    }
    if (targets.length >= 2 && follow.from === first.to && targets.includes(follow.to)) return 'fork';

    if (['b', 'r', 'q'].includes(movedType)) {
      const beforeReply = new Chess(c.fen());
      for (const row of beforeReply.board()) {
        for (const p of row) {
          if (!p || p.color !== them || p.type === 'p') continue;
          const ray = raySquares(first.to, p.square);
          if (!ray || !beforeReply.attackers(p.square, me).includes(first.to)) continue;
          const idx = ray.indexOf(p.square);
          const behindSq = ray.slice(idx + 1).find((s) => beforeReply.get(s));
          const behind = behindSq && beforeReply.get(behindSq);
          if (!behind || behind.color !== them) continue;
          if (VALUE[p.type] > VALUE[behind.type] && reply.from === p.square && follow.to === behindSq) return 'skewer';
          if (VALUE[behind.type] > VALUE[p.type] && (behind.type === 'k' || behind.type === 'q') && follow.to === p.square) return 'pin';
        }
      }
    }
  }

  // Discovered: another of our pieces newly attacks the king or queen once the moved piece steps away.
  for (const row of c.board()) {
    for (const p of row) {
      if (!p || p.color !== them || (p.type !== 'k' && p.type !== 'q')) continue;
      const nowAttackers = c.attackers(p.square, me).filter((s) => s !== first.to);
      const was = before.attackers(p.square, me);
      if (nowAttackers.some((s) => !was.includes(s))) return 'discovered';
    }
  }
  return 'material';
}

async function buildLine(fen, n) {
  // Mate lines: every one of our moves must be the only mate that fast.
  const c = new Chess(fen);
  const line = [];
  for (let k = n; k >= 1; k--) {
    const a = await analyse(c.fen(), 900, 12, 400);
    if (mateIn(a.score) !== k || a.lines.length === 0) return null;
    const second = a.lines[1];
    const secondMate = second ? mateIn(second.score) : null;
    if (secondMate !== null && secondMate > 0 && secondMate <= k) return null;
    line.push(uci(a.best));
    c.move(a.best);
    if (k === 1) {
      return c.isCheckmate() ? { line, finalFen: c.fen() } : null;
    }
    const reply = await analyse(c.fen(), 300, 10, 0);
    if (!reply.best) return null;
    line.push(uci(reply.best));
    c.move(reply.best);
  }
  return null;
}

async function tacticLine(fen) {
  const c = new Chess(fen);
  const me = c.turn();
  const startBal = balance(c, me);
  const line = [];
  for (let step = 0; step < 3; step++) {
    const a = await analyse(c.fen(), 500, 9);
    if (!a.best || a.lines.length < 2) break;
    const gap = a.score - a.lines[1].score;
    if (step === 0 && (gap < 220 || a.score < 220 || a.lines[1].score > 220)) return null;
    if (step > 0 && (gap < 180 || a.score < 150)) break;
    if (step > 0) {
      // Commit the opponent reply only once we know our follow-up is uniquely good.
      line.push(line.pendingReply);
    }
    line.push(uci(a.best));
    c.move(a.best);
    if (c.isGameOver()) break;
    const reply = await analyse(c.fen(), 300, 9, 0);
    if (!reply.best) break;
    line.pendingReply = uci(reply.best);
    c.move(reply.best);
  }
  delete line.pendingReply;
  if (line.length === 0) return null;
  const end = new Chess(fen);
  for (const u of line) end.move(parse(u));
  const after = await analyse(end.fen(), 400, 9, 0);
  const gain = balance(end, me) - startBal;
  if (after.score > -150) return null;
  if (gain < 2 && !end.isCheckmate()) {
    // The material arrives on the next exchange: count it from the search instead of the board.
    if (after.score > -250) return null;
  }
  return { line, gain };
}

const GAIN_NAME = (g) => (g >= 9 ? 'q' : g >= 5 ? 'r' : g >= 3 ? 'n' : g >= 1 ? 'p' : null);

function persist() {
  fs.writeFileSync(outFile, JSON.stringify(found));
}

const end = Date.now() + minutes * 60000;
let games = 0;
while (Date.now() < end) {
  games++;
  const c = new Chess();
  const openLine = BOOK_LINES[Math.floor(rnd() * BOOK_LINES.length)];
  const openPlies = 2 + Math.floor(rnd() * 8);
  for (const san of openLine.slice(0, openPlies)) c.move(san);
  const margin = 40 + rnd() * 120;
  for (let ply = 0; ply < 140 && !c.isGameOver(); ply++) {
    e.setPosition(c.fen());
    // Sloppy players on purpose: strong ones rarely walk into forks, pins or short mates.
    const played = await e.think({
      maxDepth: 1 + Math.floor(rnd() * 2), timeMs: 40, margin, random: rnd, blunderChance: 0.3, blunderMargin: 450,
    });
    if (!played.move) break;
    const lastMove = c.move(played.move);
    if (c.isGameOver() || c.history().length < 12) continue;

    const fen = c.fen();
    const key = fen.split(' ').slice(0, 2).join(' ');
    if (seen.has(key)) continue;
    const quick = await analyse(fen, 60, 4);
    if (quick.lines.length < 2 || quick.score - quick.lines[1].score < 150) continue;
    const a = await analyse(fen, 600, 10);
    if (a.lines.length < 2) continue;
    seen.add(key);
    const mate = mateIn(a.score);
    let puzzle = null;
    if (mate !== null && mate > 0 && mate <= 3) {
      const built = await buildLine(fen, mate);
      if (!built) continue;
      const finalBoard = new Chess(built.finalFen);
      const loser = finalBoard.turn();
      const kingSq = finalBoard.board().flat().find((p) => p && p.type === 'k' && p.color === loser).square;
      const homeRank = loser === 'w' ? '1' : '8';
      const mater = parse(built.line[built.line.length - 1]);
      const materPiece = finalBoard.get(mater.to);
      const backRank = mate <= 2 && kingSq[1] === homeRank && mater.to[1] === homeRank && (materPiece.type === 'r' || materPiece.type === 'q');
      puzzle = { theme: backRank ? 'backRank' : `mate${mate}`, line: built.line, mate, gain: null };
    } else if (mate === null) {
      // Taking back the piece that was just captured is not a puzzle.
      if (lastMove.captured && a.best.to === lastMove.to) continue;
      const built = await tacticLine(fen);
      if (!built) continue;
      puzzle = { theme: classifyTactic(fen, built.line), line: built.line, mate: null, gain: GAIN_NAME(built.gain) };
    }
    if (!puzzle) continue;
    counts[puzzle.theme] = counts[puzzle.theme] ?? 0;
    if (counts[puzzle.theme] >= TARGET[puzzle.theme]) continue;
    counts[puzzle.theme]++;
    found.push({
      fen,
      last: [lastMove.from, lastMove.to],
      line: puzzle.line,
      theme: puzzle.theme,
      mate: puzzle.mate,
      gain: puzzle.gain,
    });
    persist();
  }
  if (games % 5 === 0) console.log(games, JSON.stringify(counts));
  if (Object.keys(TARGET).every((t) => (counts[t] ?? 0) >= TARGET[t])) break;
}
persist();
console.log('done', games, found.length, JSON.stringify(counts));
process.exit(0);

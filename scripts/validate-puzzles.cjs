const { Chess } = require('chess.js');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'puzzles.ts'), 'utf8');
const match = src.match(/export const PUZZLES: Puzzle\[\] = (\[[\s\S]*?\n\]);/);
if (!match) {
  console.error('Could not locate PUZZLES array');
  process.exit(1);
}
// Strip TS-only bits that aren't valid JS object literal syntax (there are none here, it's plain data).
const arr = eval(match[1]);

let failures = 0;
for (const puzzle of arr) {
  const chess = new Chess(puzzle.fen);
  let ok = true;
  for (let i = 0; i < puzzle.solution.length; i++) {
    const san = puzzle.solution[i];
    try {
      const move = chess.move(san);
      if (!move) throw new Error('no move returned');
    } catch (e) {
      console.error(`[${puzzle.id}] "${puzzle.title}": illegal move "${san}" at step ${i} (fen before move: ${chess.fen()})`);
      failures++;
      ok = false;
      break;
    }
  }
  if (!ok) continue;
  const lastSan = puzzle.solution[puzzle.solution.length - 1];
  if (/#/.test(lastSan) && !chess.isCheckmate()) {
    console.error(`[${puzzle.id}] "${puzzle.title}": solution claims mate ("${lastSan}") but position is not checkmate (fen: ${chess.fen()}).`);
    failures++;
  }
}

if (failures === 0) {
  console.log(`validate-puzzles: OK — all ${arr.length} puzzles have fully legal solutions.`);
} else {
  console.error(`validate-puzzles: FAILED — ${failures} issue(s).`);
  process.exit(1);
}

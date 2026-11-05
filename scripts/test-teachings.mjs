// Run: node --no-warnings scripts/test-teachings.mjs   Every move a lesson asks for must be legal and genuinely good.
import { createRequire } from 'node:module';
import { Engine } from '../lib/engine.ts';
import { TEACHINGS } from '../lib/teachings.ts';

const { Chess } = createRequire(import.meta.url)('chess.js');
const e = new Engine();
let failed = 0;
for (const t of TEACHINGS) {
  for (const [i, s] of t.steps.entries()) {
    new Chess(s.fen);
    if (!s.moves) continue;
    e.setPosition(s.fen);
    const r = await e.think({ maxDepth: 40, timeMs: 1200, blunderMargin: 100000 });
    for (const u of s.moves) {
      const line = r.lines.find((l) => l.from + l.to + (l.promotion ?? '') === u);
      const ok = !!line && line.score >= r.score - 120;
      if (!ok) failed++;
      if (!ok || ['teach-square', 'teach-opposition', 'teach-smothered', 'teach-lucena'].includes(t.id)) {
        console.log(`${ok ? 'ok  ' : 'FAIL'} ${t.id} step ${i + 1} ${u}: ${line?.score} (best ${r.best.from}${r.best.to} ${r.score})`);
      }
    }
  }
}
console.log(failed ? `${failed} FAILED` : 'all lesson moves are sound');
process.exit(failed ? 1 : 0);

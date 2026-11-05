// Usage: node scripts/fit-elo.mjs <part.json> [part.json ...]
// Turns match results from calibrate.mjs into a rating per bot and prints them with their uncertainty.
import fs from 'node:fs';

const rows = process.argv.slice(2).flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
const direct = rows.filter((r) => r.elo !== undefined);
const chain = rows.filter((r) => r.high !== undefined);
const expected = (a, b) => 1 / (1 + 10 ** ((b - a) / 400));

// Best-fit rating against fixed-strength opponents. One virtual draw keeps a clean sweep finite.
function fit(games) {
  let lo = 0;
  let hi = 3600;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    let diff = 0;
    for (const g of games) {
      const n = g.w + g.l + g.d + 1;
      diff += g.w + g.d / 2 + 0.5 - n * expected(mid, g.elo);
    }
    if (diff > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

const levels = [...new Set(direct.map((r) => r.level))].sort((a, b) => a - b);
const ratings = {};
for (const level of levels) {
  const games = direct.filter((r) => r.level === level);
  const n = games.reduce((s, g) => s + g.w + g.l + g.d, 0);
  const r = fit(games);
  ratings[level] = r;
  const score = games.reduce((s, g) => s + g.w + g.d / 2, 0);
  console.log(`L${level}: ${Math.round(r)} from ${n} games vs Stockfish (+/-${Math.round(700 / Math.sqrt(n))}), scored ${score}/${n}`);
}

// Weaker bots cannot trouble even Stockfish's lowest setting, so they hang off the bot above them.
for (const c of [...chain].sort((a, b) => b.low - a.low)) {
  if (ratings[c.low] !== undefined || ratings[c.high] === undefined) continue;
  const n = c.w + c.l + c.d + 1;
  const s = (c.w + c.d / 2 + 0.5) / n;
  const gap = 400 * Math.log10(s / (1 - s));
  ratings[c.low] = ratings[c.high] - gap;
  console.log(`L${c.low}: ${Math.round(ratings[c.low])} from a match with L${c.high} (+${c.w} -${c.l} =${c.d}, gap ${Math.round(gap)})`);
}
console.log(JSON.stringify(Object.fromEntries(Object.entries(ratings).map(([k, v]) => [k, Math.round(v)]))));

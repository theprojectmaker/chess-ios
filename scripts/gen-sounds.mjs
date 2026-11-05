// Run: node scripts/gen-sounds.mjs   Synthesizes three selectable sound sets, so nothing is licensed.
// Piece sounds use modal synthesis: a tiny noise burst rings a few resonators, the way a real strike
// excites an object. That gives a crisp attack, which plain decaying sine tones cannot.
import fs from 'node:fs';
import path from 'node:path';

const RATE = 44100;
const root = path.join(import.meta.dirname, '..', 'assets', 'sounds');
fs.rmSync(root, { recursive: true, force: true });

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2));
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

const buf = (seconds) => new Float64Array(Math.ceil(seconds * RATE));
let seed = 11;
const noise = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 1073741823 - 1;
};
const N = { G3: 196, C4: 261.63, D4: 293.66, E4: 329.63, G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G6: 1568, C7: 2093 };

// A strike: `modes` are [frequency, decay per second, gain] of the struck object.
function strike(out, at, modes, level = 1, burstMs = 2.5) {
  const start = Math.floor(at * RATE);
  const burst = Math.floor((burstMs / 1000) * RATE);
  for (const [freq, decay, gain] of modes) {
    const r = Math.exp(-decay / RATE);
    const a1 = 2 * r * Math.cos((2 * Math.PI * freq) / RATE);
    const a2 = -r * r;
    let y1 = 0;
    let y2 = 0;
    for (let i = start; i < out.length; i++) {
      const k = i - start;
      const x = k < burst ? noise() * (1 - k / burst) : 0;
      const y = x + a1 * y1 + a2 * y2;
      y2 = y1;
      y1 = y;
      out[i] += y * gain * level * (freq / 900) * 0.11;
    }
  }
}
const WOOD = [[210, 75, 0.9], [640, 170, 1], [1180, 260, 0.75], [2350, 420, 0.5], [3900, 700, 0.3]];
const WOOD_LOW = [[150, 60, 1], [430, 130, 1], [900, 240, 0.7], [1900, 420, 0.4]];
const WOOD_HIGH = [[300, 95, 0.7], [860, 210, 1], [1650, 340, 0.8], [3100, 560, 0.5]];

// Struck bar: a fundamental, its bright 4th partial, and a soft tick on the attack.
function marimba(out, at, freq, length, level) {
  const start = Math.floor(at * RATE);
  const n = Math.floor(length * RATE);
  for (let i = 0; i < n && start + i < out.length; i++) {
    const t = i / RATE;
    const s = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * (3.4 / length))
      + 0.3 * Math.sin(2 * Math.PI * freq * 3.93 * t) * Math.exp(-t * (15 / length))
      + 0.1 * Math.sin(2 * Math.PI * freq * 9.2 * t) * Math.exp(-t * 90);
    out[start + i] += level * Math.min(1, t * 1500) * s;
  }
}
// Rounded FM tine, like a soft electric piano.
function tine(out, at, freq, length, level) {
  const start = Math.floor(at * RATE);
  const n = Math.floor(length * RATE);
  for (let i = 0; i < n && start + i < out.length; i++) {
    const t = i / RATE;
    const index = 1.5 * Math.exp(-t * 11);
    out[start + i] += level * Math.min(1, t * 800) * Math.exp(-t * (3.6 / length)) * Math.sin(2 * Math.PI * freq * t + index * Math.sin(2 * Math.PI * freq * 2 * t));
  }
}
// Pitch-dropping sine: the rounded "pop" of a bubble.
function pop(out, at, from, to, length, level) {
  const start = Math.floor(at * RATE);
  const n = Math.floor(length * RATE);
  let phase = 0;
  for (let i = 0; i < n && start + i < out.length; i++) {
    const p = i / n;
    phase += (2 * Math.PI * (from * Math.pow(to / from, Math.min(1, p * 2.2)))) / RATE;
    out[start + i] += level * Math.min(1, i / 60) * Math.pow(1 - p, 2.2) * Math.sin(phase);
  }
}
// Pulse wave with a fixed duty cycle, softened slightly to take the edge off.
function chip(out, at, from, to, length, level, duty = 0.25) {
  const start = Math.floor(at * RATE);
  const n = Math.floor(length * RATE);
  let phase = 0;
  let lp = 0;
  for (let i = 0; i < n && start + i < out.length; i++) {
    const p = i / n;
    phase = (phase + (from * Math.pow(to / from, p)) / RATE) % 1;
    lp += ((phase < duty ? 1 : -1) - lp) * 0.45;
    out[start + i] += level * Math.min(1, i / 40) * Math.min(1, (n - i) / 240) * lp;
  }
}
function crunch(out, at, length, level) {
  const start = Math.floor(at * RATE);
  const n = Math.floor(length * RATE);
  let held = 0;
  for (let i = 0; i < n && start + i < out.length; i++) {
    if (i % 12 === 0) held = noise();
    out[start + i] += level * Math.pow(1 - i / n, 2) * held;
  }
}

function room(out, amount) {
  if (!amount) return out;
  const lines = [1103, 1427, 1871, 2311].map((d) => ({ d, b: new Float64Array(d), i: 0 }));
  const res = new Float64Array(out.length);
  for (let n = 0; n < out.length; n++) {
    let wet = 0;
    for (const l of lines) {
      const y = l.b[l.i];
      l.b[l.i] = out[n] + y * 0.45;
      l.i = (l.i + 1) % l.d;
      wet += y;
    }
    res[n] = out[n] + (wet / 4) * amount;
  }
  return res;
}
function finish(out, peak, wet = 0) {
  const s = room(out, wet);
  let max = 1e-9;
  for (const v of s) max = Math.max(max, Math.abs(v));
  const fade = Math.floor(0.012 * RATE);
  return Array.from(s, (v, i) => (v / max) * peak * Math.min(1, (s.length - i) / fade));
}
const arp = (fn, o, notes, step, len, lvl) => notes.forEach((f, i) => fn(o, i * step, f, len, lvl));

const rewards = (fn, wet) => ({
  start: () => { const o = buf(0.55); arp(fn, o, [N.G4, N.C5], 0.09, 0.42, 0.5); return finish(o, 0.55, wet); },
  best: () => { const o = buf(0.4); fn(o, 0, N.E6, 0.32, 0.5); return finish(o, 0.4, wet); },
  correct: () => { const o = buf(0.62); arp(fn, o, [N.E5, N.A5], 0.09, 0.5, 0.5); return finish(o, 0.72, wet); },
  combo: () => { const o = buf(0.8); arp(fn, o, [N.C6, N.E6, N.G6, N.C7], 0.065, 0.48, 0.34); return finish(o, 0.74, wet); },
  great: () => { const o = buf(0.9); arp(fn, o, [N.G5, N.C6, N.E6, N.G6], 0.07, 0.6, 0.34); return finish(o, 0.8, wet); },
  brilliant: () => { const o = buf(1.6); fn(o, 0, N.C5, 1.3, 0.3); arp(fn, o, [N.C6, N.E6, N.G6, N.C7, N.G6, N.C7, N.E6, N.C7], 0.07, 0.8, 0.26); return finish(o, 0.9, wet * 1.5); },
  win: () => { const o = buf(1.6); arp(fn, o, [N.C5, N.E5, N.G5, N.C6], 0.11, 0.7, 0.34); [N.C5, N.E5, N.G5, N.C6].forEach((f) => fn(o, 0.5, f, 1, 0.2)); return finish(o, 0.88, wet * 1.4); },
  levelup: () => { const o = buf(1.2); arp(fn, o, [N.G5, N.C6, N.E6, N.G6, N.C7], 0.08, 0.7, 0.3); return finish(o, 0.82, wet * 1.3); },
  lose: () => { const o = buf(1); arp(fn, o, [N.E4, N.D4, N.C4], 0.2, 0.62, 0.48); return finish(o, 0.6, wet); },
  wrong: () => { const o = buf(0.45); arp(fn, o, [N.D4, N.G3], 0.13, 0.32, 0.55); return finish(o, 0.6, wet * 0.5); },
  inaccuracy: () => { const o = buf(0.3); fn(o, 0, N.B4, 0.26, 0.4); return finish(o, 0.42, wet * 0.5); },
  blunder: () => { const o = buf(0.85); arp(fn, o, [N.E4, N.D4, N.C4, N.G3], 0.1, 0.5, 0.48); return finish(o, 0.7, wet * 0.5); },
});

const SETS = {
  wood: {
    move: () => { const o = buf(0.1); strike(o, 0, WOOD); return finish(o, 0.7); },
    capture: () => { const o = buf(0.14); strike(o, 0, WOOD_HIGH, 0.7); strike(o, 0.032, WOOD_LOW); return finish(o, 0.85); },
    check: () => { const o = buf(0.3); strike(o, 0, WOOD); marimba(o, 0.015, N.E6, 0.22, 0.14); return finish(o, 0.78); },
    castle: () => { const o = buf(0.2); strike(o, 0, WOOD); strike(o, 0.085, WOOD_HIGH, 0.9); return finish(o, 0.72); },
    promote: () => { const o = buf(0.62); strike(o, 0, WOOD, 0.7); arp(marimba, o, [N.G5, N.C6, N.E6], 0.075, 0.42, 0.14); return finish(o, 0.78, 0.1); },
    ...rewards(marimba, 0.12),
  },
  soft: {
    move: () => { const o = buf(0.08); pop(o, 0, 760, 400, 0.07, 1); return finish(o, 0.55); },
    capture: () => { const o = buf(0.14); pop(o, 0, 980, 480, 0.06, 0.8); pop(o, 0.045, 520, 240, 0.09, 1); return finish(o, 0.72); },
    check: () => { const o = buf(0.3); pop(o, 0, 760, 400, 0.07, 0.8); tine(o, 0.02, N.A5, 0.24, 0.4); return finish(o, 0.68, 0.1); },
    castle: () => { const o = buf(0.18); pop(o, 0, 720, 400, 0.07, 1); pop(o, 0.08, 880, 480, 0.07, 1); return finish(o, 0.6); },
    promote: () => { const o = buf(0.6); pop(o, 0, 500, 900, 0.1, 0.5); arp(tine, o, [N.G5, N.C6, N.E6], 0.07, 0.42, 0.3); return finish(o, 0.72, 0.16); },
    ...rewards(tine, 0.18),
  },
  arcade: {
    move: () => { const o = buf(0.07); chip(o, 0, 520, 780, 0.05, 0.6); return finish(o, 0.42); },
    capture: () => { const o = buf(0.14); crunch(o, 0, 0.11, 0.7); chip(o, 0, 620, 200, 0.1, 0.5, 0.5); return finish(o, 0.55); },
    check: () => { const o = buf(0.2); chip(o, 0, 880, 880, 0.07, 0.5); chip(o, 0.09, 1175, 1175, 0.09, 0.5); return finish(o, 0.5); },
    castle: () => { const o = buf(0.16); chip(o, 0, 520, 700, 0.06, 0.5); chip(o, 0.07, 700, 920, 0.06, 0.5); return finish(o, 0.44); },
    promote: () => { const o = buf(0.4); [N.G5, N.C6, N.E6, N.G6].forEach((f, i) => chip(o, i * 0.06, f, f, 0.07, 0.5, 0.5)); return finish(o, 0.5); },
    ...rewards((o, at, f, len, lvl) => chip(o, at, f, f, Math.min(len, 0.16), lvl, 0.25), 0.05),
  },
};

for (const [set, sounds] of Object.entries(SETS)) {
  const dir = path.join(root, set);
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, make] of Object.entries(sounds)) {
    const s = make();
    fs.writeFileSync(path.join(dir, `${name}.wav`), wav(s));
    if (name === 'move' || name === 'capture') {
      // Sanity numbers, since these cannot be judged by ear here: time until 10% of peak.
      const peak = Math.max(...s.map(Math.abs));
      const lastLoud = s.findLastIndex((v) => Math.abs(v) > peak * 0.1);
      console.log(set.padEnd(7), name.padEnd(8), `ring ${Math.round((lastLoud / RATE) * 1000)}ms`, `peak ${peak.toFixed(2)}`, Number.isNaN(peak) ? 'NAN' : '');
    }
  }
}
console.log(fs.readdirSync(path.join(root, 'wood')).join(' '));

// Run once: node scripts/gen-sounds.mjs   Synthesizes the app's sound effects, so nothing is licensed.
import fs from 'node:fs';
import path from 'node:path';

const RATE = 44100;
const outDir = path.join(import.meta.dirname, '..', 'assets', 'sounds');
fs.mkdirSync(outDir, { recursive: true });

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

const buf = (seconds) => new Float64Array(Math.floor(seconds * RATE));
let noiseSeed = 7;
const noise = () => {
  noiseSeed = (noiseSeed * 16807) % 2147483647;
  return noiseSeed / 1073741823 - 1;
};

// A wooden piece on a board: inharmonic body modes that die fast, a felt-damped click on the
// attack, and a low thump from the board underneath.
function woodHit(out, at, { pitch = 340, level = 0.8, damp = 1 } = {}) {
  const start = Math.floor(at * RATE);
  const modes = [
    [1, 1, 62], [1.71, 0.55, 88], [2.63, 0.32, 125], [4.14, 0.14, 190],
  ];
  let lp = 0;
  for (let i = start; i < out.length; i++) {
    const t = (i - start) / RATE;
    if (t > 0.3) break;
    let body = 0;
    for (const [ratio, amp, decay] of modes) body += amp * Math.sin(2 * Math.PI * pitch * ratio * t) * Math.exp(-t * decay * damp);
    const thump = 0.9 * Math.sin(2 * Math.PI * 92 * t) * Math.exp(-t * 48);
    lp += (noise() - lp) * 0.28;
    const click = lp * 1.7 * Math.exp(-t * 420);
    const attack = Math.min(1, t * RATE / 12);
    out[i] += level * attack * (body + thump + click);
  }
}

// Soft mallet bell: a sine with a few bright partials, for chimes and rewards.
function bell(out, at, freq, length, level) {
  const start = Math.floor(at * RATE);
  const n = Math.floor(length * RATE);
  const partials = [[1, 1, 1], [2, 0.42, 1.6], [3, 0.2, 2.4], [4.2, 0.09, 4]];
  for (let i = 0; i < n && start + i < out.length; i++) {
    const t = i / RATE;
    let s = 0;
    for (const [ratio, amp, fade] of partials) s += amp * Math.sin(2 * Math.PI * freq * ratio * t) * Math.exp(-t * (fade * 3.6) / length);
    out[start + i] += level * Math.min(1, t * 900) * s;
  }
}

// Warm falling tone for errors: gentle rather than a harsh buzzer.
function slide(out, at, from, to, length, level) {
  const start = Math.floor(at * RATE);
  const n = Math.floor(length * RATE);
  let phase = 0;
  for (let i = 0; i < n && start + i < out.length; i++) {
    const t = i / n;
    const f = from * Math.pow(to / from, t);
    phase += (2 * Math.PI * f) / RATE;
    const env = Math.min(1, t * 40) * Math.pow(1 - t, 1.4);
    out[start + i] += level * env * (Math.sin(phase) + 0.35 * Math.sin(2 * phase) + 0.12 * Math.sin(3 * phase));
  }
}

// A short room around dry sounds, so they do not feel pasted on.
function room(out, amount = 0.16) {
  const lines = [1423, 1871, 2311, 2729].map((d) => ({ d, g: 0.5, buf: new Float64Array(d), i: 0 }));
  const res = new Float64Array(out.length);
  for (let n = 0; n < out.length; n++) {
    let wet = 0;
    for (const l of lines) {
      const y = l.buf[l.i];
      l.buf[l.i] = out[n] + y * l.g;
      l.i = (l.i + 1) % l.d;
      wet += y;
    }
    res[n] = out[n] + (wet / lines.length) * amount;
  }
  return res;
}

function finish(out, peak = 0.82, wetAmount = 0.16) {
  const wet = room(out, wetAmount);
  let max = 0;
  for (const s of wet) max = Math.max(max, Math.abs(s));
  const fadeFrom = wet.length - Math.floor(0.02 * RATE);
  return Array.from(wet, (s, i) => (s / max) * peak * (i > fadeFrom ? (wet.length - i) / (wet.length - fadeFrom) : 1));
}

const N = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G6: 1568, C7: 2093, G4: 392, E4: 329.63, C4: 261.63, A4: 440 };

const sounds = {
  // Peak levels keep the many everyday sounds below the rewards.
  move: () => { const o = buf(0.22); woodHit(o, 0, { pitch: 360, level: 0.8 }); return finish(o, 0.62, 0.12); },
  capture: () => { const o = buf(0.3); woodHit(o, 0, { pitch: 290, level: 0.85 }); woodHit(o, 0.06, { pitch: 440, level: 0.62, damp: 1.2 }); return finish(o, 0.74, 0.12); },
  check: () => { const o = buf(0.5); woodHit(o, 0, { pitch: 360, level: 0.7 }); bell(o, 0.02, N.A5, 0.42, 0.22); return finish(o, 0.72); },
  castle: () => { const o = buf(0.34); woodHit(o, 0, { pitch: 360, level: 0.75 }); woodHit(o, 0.11, { pitch: 300, level: 0.75 }); return finish(o, 0.66, 0.12); },
  promote: () => { const o = buf(0.8); woodHit(o, 0, { pitch: 360, level: 0.5 }); [N.G5, N.C6, N.E6].forEach((f, i) => bell(o, 0.05 + i * 0.08, f, 0.6, 0.2)); return finish(o, 0.75); },
  start: () => { const o = buf(0.62); bell(o, 0, N.G4, 0.5, 0.26); bell(o, 0.1, N.C5, 0.5, 0.26); return finish(o, 0.6); },
  correct: () => { const o = buf(0.7); bell(o, 0, N.E5, 0.5, 0.3); bell(o, 0.1, N.A5, 0.58, 0.32); return finish(o, 0.76); },
  combo: () => { const o = buf(0.82); [N.C6, N.E6, N.G6, N.C7].forEach((f, i) => bell(o, i * 0.07, f, 0.5, 0.16)); return finish(o, 0.72); },
  wrong: () => { const o = buf(0.5); slide(o, 0, 300, 150, 0.2, 0.32); slide(o, 0.17, 225, 112, 0.28, 0.32); return finish(o, 0.62, 0.1); },
  brilliant: () => { const o = buf(1.5); [N.C6, N.E6, N.G6, N.C7, N.G6, N.C7].forEach((f, i) => bell(o, i * 0.075, f, 0.9, 0.15)); bell(o, 0, N.C5, 1.3, 0.18); return finish(o, 0.84, 0.28); },
  great: () => { const o = buf(0.9); [N.G5, N.C6, N.E6].forEach((f, i) => bell(o, i * 0.08, f, 0.7, 0.2)); return finish(o, 0.76, 0.22); },
  blunder: () => { const o = buf(0.9); slide(o, 0, 330, 80, 0.72, 0.42); woodHit(o, 0.02, { pitch: 150, level: 0.4, damp: 0.7 }); return finish(o, 0.68, 0.14); },
  inaccuracy: () => { const o = buf(0.34); slide(o, 0, 370, 300, 0.26, 0.26); return finish(o, 0.46, 0.1); },
  win: () => { const o = buf(1.6); [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => bell(o, i * 0.11, f, 0.8, 0.22)); [N.C5, N.E5, N.G5, N.C6].forEach((f) => bell(o, 0.5, f, 1, 0.12)); return finish(o, 0.84, 0.28); },
  lose: () => { const o = buf(1.1); [N.G4, N.E4, N.C4].forEach((f, i) => bell(o, i * 0.2, f, 0.7, 0.26)); return finish(o, 0.6, 0.2); },
  levelup: () => { const o = buf(1.3); [N.G5, N.C6, N.E6, N.G6, N.C7].forEach((f, i) => bell(o, i * 0.09, f, 0.8, 0.17)); return finish(o, 0.82, 0.26); },
};

for (const [name, make] of Object.entries(sounds)) {
  const samples = make();
  fs.writeFileSync(path.join(outDir, `${name}.wav`), wav(samples));
  const peak = samples.reduce((m, s) => Math.max(m, Math.abs(s)), 0);
  console.log(name.padEnd(11), `${(samples.length / RATE).toFixed(2)}s`, `peak ${peak.toFixed(2)}`, `${Math.round((samples.length * 2) / 1024)}KB`);
}

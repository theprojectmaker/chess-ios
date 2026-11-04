// Run once: node scripts/gen-sounds.mjs   Synthesizes the app's sound effects, so nothing is licensed.
import fs from 'node:fs';
import path from 'node:path';

const RATE = 22050;
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

function buf(seconds) {
  return new Float64Array(Math.floor(seconds * RATE));
}
let noiseSeed = 1;
const noise = () => {
  noiseSeed = (noiseSeed * 16807) % 2147483647;
  return noiseSeed / 1073741823 - 1;
};

// Wood-on-wood: a short pitched body with a click of filtered noise on the attack.
function knock(out, at, pitch, level, decay = 38) {
  const start = Math.floor(at * RATE);
  let lp = 0;
  for (let i = start; i < out.length; i++) {
    const t = (i - start) / RATE;
    const body = Math.sin(2 * Math.PI * pitch * t) * Math.exp(-t * decay) + 0.5 * Math.sin(2 * Math.PI * pitch * 2.3 * t) * Math.exp(-t * decay * 1.8);
    lp += (noise() - lp) * 0.35;
    out[i] += level * (body + lp * 1.4 * Math.exp(-t * 170));
  }
}
function tone(out, at, freq, length, level) {
  const start = Math.floor(at * RATE);
  const n = Math.floor(length * RATE);
  for (let i = 0; i < n && start + i < out.length; i++) {
    const t = i / RATE;
    const env = Math.min(1, t * 200) * Math.exp(-t * (3.2 / length));
    out[start + i] += level * env * (Math.sin(2 * Math.PI * freq * t) + 0.25 * Math.sin(4 * Math.PI * freq * t));
  }
}

const sounds = {
  move: () => { const o = buf(0.14); knock(o, 0, 420, 0.75); return o; },
  capture: () => { const o = buf(0.2); knock(o, 0, 300, 0.7); knock(o, 0.045, 520, 0.6); return o; },
  check: () => { const o = buf(0.26); knock(o, 0, 420, 0.6); tone(o, 0.03, 880, 0.2, 0.18); return o; },
  correct: () => { const o = buf(0.42); tone(o, 0, 659, 0.2, 0.34); tone(o, 0.11, 988, 0.3, 0.34); return o; },
  wrong: () => { const o = buf(0.36); tone(o, 0, 233, 0.16, 0.36); tone(o, 0.13, 185, 0.22, 0.36); return o; },
  win: () => { const o = buf(0.95); [523, 659, 784, 1047].forEach((f, i) => tone(o, i * 0.12, f, 0.5, 0.26)); return o; },
  lose: () => { const o = buf(0.7); [392, 330, 262].forEach((f, i) => tone(o, i * 0.16, f, 0.38, 0.26)); return o; },
};
for (const [name, make] of Object.entries(sounds)) {
  fs.writeFileSync(path.join(outDir, `${name}.wav`), wav(make()));
}
console.log('sounds written to', outDir);

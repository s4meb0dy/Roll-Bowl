/**
 * Synthesizes the kitchen alarm + a quiet keep-alive as mono WAV files.
 * Run: `node scripts/generate-kitchen-audio.mjs`
 *
 * Alarm: loud high-pitched triple-beep (POS / kitchen-timer style).
 * Keep-alive must NOT be near-digital-silence: Android Chrome detects
 * "silent media" and pauses the element after a while.
 */
import fs from "fs";

const SR = 22050;

function writeWav(path, samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits per sample
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  fs.writeFileSync(path, buf);
}

function squareWave(freq, t) {
  return Math.sign(Math.sin(2 * Math.PI * freq * t)) || 1;
}

// --- Alarm: loud triple-beep at ~1720 Hz (POS / kitchen timer) ---
const BEEP_FREQ = 1720;
const BEEP_DUR = 0.16;
const BEEP_GAP = 0.13;
const BEEPS = 3;
const cycleLen = BEEPS * BEEP_DUR + (BEEPS - 1) * BEEP_GAP + 0.15;
const N = Math.floor(SR * cycleLen);
const alarm = new Float32Array(N);

for (let b = 0; b < BEEPS; b++) {
  const startS = b * (BEEP_DUR + BEEP_GAP);
  const start = Math.floor(startS * SR);
  const len = Math.floor(BEEP_DUR * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = t < 0.004 ? t / 0.004 : t > BEEP_DUR - 0.02 ? (BEEP_DUR - t) / 0.02 : 1;
    const fund = squareWave(BEEP_FREQ, t);
    const harm = 0.35 * squareWave(BEEP_FREQ * 2, t);
    const idx = start + i;
    if (idx < N) alarm[idx] += 0.55 * env * (fund + harm);
  }
}

let peak = 0;
for (const v of alarm) peak = Math.max(peak, Math.abs(v));
if (peak > 0) for (let i = 0; i < N; i++) alarm[i] = (alarm[i] / peak) * 0.95;
writeWav("public/kitchen-alarm.wav", alarm);

// --- Keep-alive: inaudible on typical tablet speakers ---
const KEEP_S = Math.floor(SR * 2);
const keep = new Float32Array(KEEP_S);
for (let i = 0; i < KEEP_S; i++) {
  const t = i / SR;
  keep[i] = 0.0006 * Math.sin(2 * Math.PI * 28 * t);
}
writeWav("public/kitchen-silent.wav", keep);

console.log("wrote public/kitchen-alarm.wav and public/kitchen-silent.wav");

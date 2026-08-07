/**
 * Synthesizes the kitchen alarm + a quiet keep-alive as mono WAV files.
 * Run: `node scripts/generate-kitchen-audio.mjs`
 *
 * Alarm: piercing two-tone siren (2500 Hz + 3100 Hz, six rapid beeps).
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

function sawWave(freq, t) {
  const phase = (freq * t) % 1;
  return 2 * phase - 1;
}

function squareWave(freq, t) {
  return Math.sign(Math.sin(2 * Math.PI * freq * t)) || 1;
}

function addBeep(buf, startS, durS, freq) {
  const start = Math.floor(startS * SR);
  const len = Math.floor(durS * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env =
      t < 0.002
        ? t / 0.002
        : t > durS - 0.015
          ? (durS - t) / 0.015
          : 1;
    const fund = sawWave(freq, t);
    const harm = 0.55 * squareWave(freq * 2, t);
    const det = 0.35 * squareWave(freq * 1.015, t);
    const idx = start + i;
    if (idx < buf.length) buf[idx] += 0.62 * env * (fund + harm + det);
  }
}

// --- Alarm: two-tone siren matching kitchenSound.ts SIREN_PATTERN ---
const BEEP_DUR = 0.22;
const BEEP_GAP = 0.08;
const LOW = 2500;
const HIGH = 3100;
const cycleLen = 1.85;
const N = Math.floor(SR * cycleLen);
const alarm = new Float32Array(N);

addBeep(alarm, 0.0, BEEP_DUR, LOW);
addBeep(alarm, BEEP_DUR + BEEP_GAP, BEEP_DUR, LOW);
addBeep(alarm, 2 * (BEEP_DUR + BEEP_GAP), BEEP_DUR, LOW);
addBeep(alarm, 0.92, BEEP_DUR, HIGH);
addBeep(alarm, 0.92 + BEEP_DUR + BEEP_GAP, BEEP_DUR, HIGH);
addBeep(alarm, 0.92 + 2 * (BEEP_DUR + BEEP_GAP), BEEP_DUR, HIGH);

let peak = 0;
for (const v of alarm) peak = Math.max(peak, Math.abs(v));
if (peak > 0) for (let i = 0; i < N; i++) alarm[i] = (alarm[i] / peak) * 0.98;
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

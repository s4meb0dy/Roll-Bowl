/**
 * Synthesizes the kitchen alarm + a quiet keep-alive as mono WAV files.
 * Run: `node scripts/generate-kitchen-audio.mjs`
 *
 * Keep-alive must NOT be near-digital-silence: Android Chrome detects
 * "silent media" and pauses the element after a while, which is what made
 * the yellow "enable sound" button reappear mid-shift.
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

// --- Alarm: warm marimba motif (C5 E5 G5 C6), one loopable cycle + gap ---
const notes = [
  [523.25, 0.0, 0.42],
  [659.25, 0.18, 0.42],
  [783.99, 0.36, 0.46],
  [1046.5, 0.54, 0.55],
];
const cycleLen = 1.7;
const N = Math.floor(SR * cycleLen);
const alarm = new Float32Array(N);
for (const [freq, off, dur] of notes) {
  const start = Math.floor(off * SR);
  const len = Math.floor(dur * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = Math.exp(-t * 4.5);
    const fund = Math.sin(2 * Math.PI * freq * t);
    const over = 0.18 * Math.sin(2 * Math.PI * freq * 4 * t);
    const idx = start + i;
    if (idx < N) alarm[idx] += 0.5 * env * (fund + over);
  }
}
let peak = 0;
for (const v of alarm) peak = Math.max(peak, Math.abs(v));
if (peak > 0) for (let i = 0; i < N; i++) alarm[i] = (alarm[i] / peak) * 0.9;
writeWav("public/kitchen-alarm.wav", alarm);

// --- Keep-alive: inaudible on typical tablet speakers.
// Pure sub-bass (~28 Hz) at very low level — no noise/hiss (that was audible).
// Still non-zero PCM so Chrome is less likely to treat it as digital silence;
// heartbeat + any kitchen tap re-arms if the browser pauses it anyway.
const KEEP_S = Math.floor(SR * 2);
const keep = new Float32Array(KEEP_S);
for (let i = 0; i < KEEP_S; i++) {
  const t = i / SR;
  keep[i] = 0.0006 * Math.sin(2 * Math.PI * 28 * t);
}
writeWav("public/kitchen-silent.wav", keep);

console.log("wrote public/kitchen-alarm.wav and public/kitchen-silent.wav");

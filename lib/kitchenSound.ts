/** Short distinctive two-tone beep for new kitchen orders (no external assets). */
export function playNewOrderChime(): void {
  if (typeof window === "undefined") return;
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const playTone = (freq: number, startSec: number, durSec: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      const t0 = ctx.currentTime + startSec;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.14, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durSec);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + durSec + 0.05);
    };
    playTone(880, 0, 0.14);
    playTone(1174.66, 0.16, 0.16);
    setTimeout(() => void ctx.close(), 600);
  } catch {
    // ignore (no audio permission / unsupported)
  }
}

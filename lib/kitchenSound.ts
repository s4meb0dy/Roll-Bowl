/**
 * @file Kitchen new-order notification — takeaway-app style marimba chime.
 *
 * - Mobile browsers need a user gesture before audio; call
 *   `unlockKitchenAudio()` from the PIN unlock (or any click).
 * - One shared AudioContext for the session; visibility hook re-resumes
 *   after the tab was backgrounded.
 * - Warm, mid-register marimba/bell motif (Takeaway/Just Eat feel) that is
 *   friendly and recognisable instead of a piercing high-pitched siren, so it
 *   grabs attention without being harsh or disturbing.
 * - `navigator.vibrate` runs in parallel on supported phones.
 */

const MUTE_KEY = "roll-bowl-kitchen-mute";

/** How long the alarm keeps ringing (ms) — long enough to be heard in a busy kitchen. */
const ALARM_WALL_MS = 14_000;
/** One chime cycle length (seconds) — matches the last note's offset + duration. */
const CHIME_CYCLE_S = 1.0;
/** Gap between cycles — a relaxed "ding … ding" cadence, not a relentless siren. */
const CHIME_CYCLE_GAP_S = 1.1;
const CHIME_CYCLES = 7;
/** Per-note peak gain — clearly audible over kitchen noise, but warm not shrill. */
const NOTE_PEAK = 0.85;

/**
 * Warm takeaway-app marimba motif: a friendly rising C-major phrase that
 * resolves on the octave (C5 → E5 → G5 → C6). It stays in the mid register
 * instead of climbing to a shrill G6, so it reads as a pleasant "order in!"
 * jingle rather than an alarm.
 */
const CHIME_NOTES: ReadonlyArray<readonly [freq: number, offsetS: number, durS: number]> = [
  [523.25, 0, 0.42], // C5
  [659.25, 0.18, 0.42], // E5
  [783.99, 0.36, 0.46], // G5
  [1046.5, 0.54, 0.5], // C6
];

type Session = { stop: () => void };
let activeSession: Session | null = null;

let sharedCtx: AudioContext | null = null;
let unlocked = false;
let visibilityHookInstalled = false;

export function isKitchenAlarmMuted(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return true;
  }
}

export function setKitchenAlarmMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
  if (muted) stopKitchenAlarmLoop();
}

function getSharedCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (sharedCtx && sharedCtx.state !== "closed") return sharedCtx;
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedCtx = new AC({ latencyHint: "interactive" });
    installVisibilityResumeHook();
    return sharedCtx;
  } catch {
    return null;
  }
}

function installVisibilityResumeHook(): void {
  if (visibilityHookInstalled) return;
  if (typeof document === "undefined") return;
  visibilityHookInstalled = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    const ctx = sharedCtx;
    if (!ctx || ctx.state !== "suspended") return;
    void ctx.resume().catch(() => {
      /* ignore — needs a fresh gesture */
    });
  });
}

export function unlockKitchenAudio(): void {
  if (typeof window === "undefined") return;
  if (unlocked) return;
  const ctx = getSharedCtx();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") void ctx.resume();
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    unlocked = true;
  } catch {
    /* ignore — we'll retry on the next gesture */
  }
}

/** True once Web Audio has been unlocked by a user gesture this session. */
export function isKitchenAudioUnlocked(): boolean {
  return unlocked;
}

export function ensureKitchenAudioUnlock(): void {
  if (typeof window === "undefined") return;
  if (unlocked) return;
  const handler = () => {
    unlockKitchenAudio();
    if (unlocked) {
      window.removeEventListener("pointerdown", handler, true);
      window.removeEventListener("touchstart", handler, true);
      window.removeEventListener("keydown", handler, true);
      window.removeEventListener("click", handler, true);
    }
  };
  window.addEventListener("pointerdown", handler, true);
  window.addEventListener("touchstart", handler, true);
  window.addEventListener("keydown", handler, true);
  window.addEventListener("click", handler, true);
}

function tryVibrate(pattern: number[]): void {
  if (typeof navigator === "undefined") return;
  try {
    if (typeof navigator.vibrate === "function") navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}

function buildSoftOutputGraph(ctx: AudioContext): {
  input: AudioNode;
  master: GainNode;
  cleanup: () => void;
} {
  const master = ctx.createGain();
  master.gain.value = 0.95;

  // Compressor evens out the loudness so the chime carries across the kitchen
  // without the harsh, in-your-face punch of a siren.
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.knee.value = 28;
  comp.ratio.value = 8;
  comp.attack.value = 0.006;
  comp.release.value = 0.3;

  // Roll off the piercing high end — a marimba/bell timbre lives in the mids,
  // so this keeps the tone warm and pleasant rather than shrill.
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 5200;
  lowpass.Q.value = 0.7;

  lowpass.connect(comp);
  comp.connect(master);
  master.connect(ctx.destination);

  const cleanup = () => {
    for (const node of [lowpass, comp, master]) {
      try {
        node.disconnect();
      } catch {
        /* ignore */
      }
    }
  };

  return { input: lowpass, master, cleanup };
}

function scheduleNote(
  ctx: AudioContext,
  input: AudioNode,
  t0: number,
  freq: number,
  durS: number,
  peakGain: number
): OscillatorNode[] {
  // Marimba/bell timbre: a sine fundamental plus a softer overtone, struck with
  // a fast attack and left to ring out with a natural exponential decay.
  const fundamental = ctx.createOscillator();
  fundamental.type = "sine";
  fundamental.frequency.value = freq;

  const overtone = ctx.createOscillator();
  overtone.type = "sine";
  overtone.frequency.value = freq * 4; // 2 octaves up gives the mallet "ping"

  const overtoneGain = ctx.createGain();
  overtoneGain.gain.value = 0.18;

  const mix = ctx.createGain();
  mix.gain.value = 0.85;

  // Percussive envelope — quick attack then a smooth ring-out (no plateau),
  // which reads as a friendly marimba tap rather than a sustained beep.
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(peakGain, t0 + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + durS);

  fundamental.connect(mix);
  overtone.connect(overtoneGain);
  overtoneGain.connect(mix);
  mix.connect(env);
  env.connect(input);

  fundamental.start(t0);
  fundamental.stop(t0 + durS + 0.05);
  overtone.start(t0);
  overtone.stop(t0 + durS + 0.05);

  return [fundamental, overtone];
}

/**
 * Schedule one or more delivery-style chime cycles. Returns stop() for instant mute.
 */
function scheduleDeliveryChime(
  ctx: AudioContext,
  options: { cycles?: number; cycleGapS?: number } = {}
): { stop: () => void } {
  const cycles = options.cycles ?? CHIME_CYCLES;
  const cycleGapS = options.cycleGapS ?? CHIME_CYCLE_GAP_S;
  const t0 = ctx.currentTime;
  const { input, master, cleanup } = buildSoftOutputGraph(ctx);
  const oscs: OscillatorNode[] = [];

  for (let c = 0; c < cycles; c++) {
    const cycleStart = t0 + c * (CHIME_CYCLE_S + cycleGapS);
    for (const [freq, offsetS, durS] of CHIME_NOTES) {
      oscs.push(
        ...scheduleNote(ctx, input, cycleStart + offsetS, freq, durS, NOTE_PEAK)
      );
    }
  }

  return {
    stop: () => {
      const now = ctx.currentTime;
      try {
        master.gain.cancelScheduledValues(now);
        master.gain.setTargetAtTime(0, now, 0.02);
      } catch {
        /* ignore */
      }
      oscs.forEach((o) => {
        try {
          o.stop(now + 0.05);
        } catch {
          /* ignore */
        }
      });
      window.setTimeout(cleanup, 200);
    },
  };
}

export function stopKitchenAlarmLoop(): void {
  if (typeof window === "undefined") return;
  if (!activeSession) return;
  try {
    activeSession.stop();
  } catch {
    /* ignore */
  }
  activeSession = null;
  tryVibrate([0]);
}

/**
 * New order: 3× delivery chime + gentle vibration. Falls back to a single chime
 * if Web Audio is unavailable.
 */
export function startKitchenAlarmLoop(): void {
  if (typeof window === "undefined") return;
  if (isKitchenAlarmMuted()) return;
  stopKitchenAlarmLoop();

  const ctx = getSharedCtx();
  if (!ctx) {
    playNewOrderChime();
    return;
  }

  tryVibrate([
    350, 180, 350, 180, 350, 700,
    350, 180, 350, 180, 350, 700,
    350, 180, 350, 180, 350,
  ]);

  let endTimer: number | null = null;
  let scheduled: { stop: () => void } | null = null;

  const run = () => {
    scheduled = scheduleDeliveryChime(ctx);
    endTimer = window.setTimeout(() => {
      endTimer = null;
      activeSession = null;
    }, ALARM_WALL_MS);
  };

  if (ctx.state === "suspended") {
    void ctx.resume().then(run).catch(run);
  } else {
    run();
  }

  activeSession = {
    stop: () => {
      if (endTimer !== null) {
        clearTimeout(endTimer);
        endTimer = null;
      }
      if (scheduled) {
        try {
          scheduled.stop();
        } catch {
          /* ignore */
        }
        scheduled = null;
      }
      activeSession = null;
    },
  };
}

/** Single chime — fallback when the full graph cannot be built. */
export function playNewOrderChime(): void {
  if (typeof window === "undefined" || isKitchenAlarmMuted()) return;
  const ctx = getSharedCtx();
  if (!ctx) return;

  const fire = () => {
    scheduleDeliveryChime(ctx, { cycles: 1, cycleGapS: 0 });
  };

  if (ctx.state === "suspended") {
    void ctx.resume().then(fire).catch(fire);
  } else {
    fire();
  }
}

/** "Test geluid" — one chime cycle; the click also unlocks mobile audio. */
export function playTestKitchenAlarm(): void {
  if (typeof window === "undefined") return;
  if (isKitchenAlarmMuted()) return;
  unlockKitchenAudio();
  const ctx = getSharedCtx();
  if (!ctx) return;

  tryVibrate([100]);

  const fire = () => {
    scheduleDeliveryChime(ctx, { cycles: 1, cycleGapS: 0 });
  };

  if (ctx.state === "suspended") {
    void ctx.resume().then(fire).catch(fire);
  } else {
    fire();
  }
}

/**
 * @file Kitchen new-order notification — delivery-app style chime.
 *
 * - Mobile browsers need a user gesture before audio; call
 *   `unlockKitchenAudio()` from the PIN unlock (or any click).
 * - One shared AudioContext for the session; visibility hook re-resumes
 *   after the tab was backgrounded.
 * - Three-note ascending chime, repeated a few times (Uber/Deliveroo feel),
 *   not a piercing siren.
 * - `navigator.vibrate` runs in parallel on supported phones.
 */

const MUTE_KEY = "roll-bowl-kitchen-mute";

const ALARM_WALL_MS = 7_000;
/** One 3-note chime cycle length (seconds). */
const CHIME_CYCLE_S = 0.52;
const CHIME_CYCLE_GAP_S = 1.15;
const CHIME_CYCLES = 3;

/** Ascending major triad — short, friendly notification. */
const CHIME_NOTES: ReadonlyArray<readonly [freq: number, offsetS: number, durS: number]> = [
  [587.33, 0, 0.1], // D5
  [739.99, 0.12, 0.1], // F#5
  [880, 0.24, 0.18], // A5
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
  master.gain.value = 0.5;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 4200;
  lowpass.Q.value = 0.7;

  lowpass.connect(master);
  master.connect(ctx.destination);

  const cleanup = () => {
    try {
      lowpass.disconnect();
    } catch {
      /* ignore */
    }
    try {
      master.disconnect();
    } catch {
      /* ignore */
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
  const sine = ctx.createOscillator();
  sine.type = "sine";
  sine.frequency.value = freq;

  const triangle = ctx.createOscillator();
  triangle.type = "triangle";
  triangle.frequency.value = freq;

  const mix = ctx.createGain();
  mix.gain.value = 0.72;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(peakGain, t0 + 0.012);
  env.gain.setValueAtTime(peakGain * 0.85, t0 + durS - 0.04);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + durS);

  sine.connect(mix);
  triangle.connect(mix);
  mix.connect(env);
  env.connect(input);

  sine.start(t0);
  sine.stop(t0 + durS + 0.03);
  triangle.start(t0);
  triangle.stop(t0 + durS + 0.03);

  return [sine, triangle];
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
        ...scheduleNote(ctx, input, cycleStart + offsetS, freq, durS, 0.38)
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

  tryVibrate([120, 60, 120, 900, 120, 60, 120, 900, 120]);

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

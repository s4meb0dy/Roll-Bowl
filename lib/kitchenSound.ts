/**
 * @file Kitchen new-order notification.
 *
 * Reliability model (Android Chrome kitchen tablet, tab kept in foreground for
 * a whole shift):
 *
 * - PRIMARY: an <audio> element playing a pre-rendered marimba chime. A media
 *   element that was started once from a user gesture keeps working — and can be
 *   re-played programmatically — for hours in a foreground tab. This sidesteps
 *   the Web Audio autoplay trap where a mobile browser suspends the shared
 *   AudioContext after a few idle hours and then refuses `resume()` without a
 *   fresh gesture (which is why the alarm used to go silent + show the yellow
 *   "enable sound" button).
 * - A permanently-looping, near-silent <audio> keep-alive holds the audio
 *   pipeline open so the alarm fires instantly even after a long quiet period.
 * - FALLBACK: the original Web Audio synth chime, used when the audio files
 *   can't be played (e.g. blocked before any gesture).
 * - `navigator.vibrate` runs in parallel on supported phones.
 */

const MUTE_KEY = "roll-bowl-kitchen-mute";

/** How long the alarm keeps ringing (ms) — long enough to be heard in a busy kitchen. */
const ALARM_WALL_MS = 14_000;

const ALARM_SRC = "/kitchen-alarm.wav";
const SILENT_SRC = "/kitchen-silent.wav";

/** One chime cycle length (seconds) — matches the last note's offset + duration. */
const CHIME_CYCLE_S = 1.0;
/** Gap between cycles — a relaxed "ding … ding" cadence, not a relentless siren. */
const CHIME_CYCLE_GAP_S = 1.1;
const CHIME_CYCLES = 7;
/** Per-note peak gain — clearly audible over kitchen noise, but warm not shrill. */
const NOTE_PEAK = 0.85;

/**
 * Warm takeaway-app marimba motif (C5 → E5 → G5 → C6) used by the Web Audio
 * fallback. The pre-rendered file (`/kitchen-alarm.wav`) uses the same motif.
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
let keepAliveHookInstalled = false;
let silentKeepAlive: { osc: OscillatorNode; gain: GainNode } | null = null;

// Media-element layer (primary).
let alarmEl: HTMLAudioElement | null = null;
let silentEl: HTMLAudioElement | null = null;
let mediaUnlocked = false;
let alarmStopTimer: number | null = null;

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

/* ------------------------------------------------------------------ *
 * Media-element layer (primary, robust on mobile for a full shift)
 * ------------------------------------------------------------------ */

function getSilentEl(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (silentEl) return silentEl;
  try {
    const el = new Audio(SILENT_SRC);
    el.loop = true;
    el.preload = "auto";
    el.setAttribute("playsinline", "");
    silentEl = el;
  } catch {
    silentEl = null;
  }
  return silentEl;
}

function getAlarmEl(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (alarmEl) return alarmEl;
  try {
    const el = new Audio(ALARM_SRC);
    el.preload = "auto";
    el.setAttribute("playsinline", "");
    alarmEl = el;
  } catch {
    alarmEl = null;
  }
  return alarmEl;
}

/**
 * Start the looping keep-alive element and "bless" the alarm element so both can
 * be (re)played programmatically later. Must be called from a user gesture.
 */
function unlockMediaAudio(): void {
  const silent = getSilentEl();
  if (silent) {
    silent.muted = false;
    // The file itself is near-silent; full volume still keeps the pipeline
    // "producing audio" (so the browser won't idle it) without being audible.
    silent.volume = 1;
    const p = silent.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        mediaUnlocked = true;
      }).catch(() => {
        /* needs another gesture — the yellow prompt stays up */
      });
    } else {
      mediaUnlocked = true;
    }
  }

  const alarm = getAlarmEl();
  if (alarm) {
    alarm.muted = true;
    const p = alarm.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        try {
          alarm.pause();
          alarm.currentTime = 0;
        } catch {
          /* ignore */
        }
        alarm.muted = false;
      }).catch(() => {
        alarm.muted = false;
      });
    }
  }
}

function resumeMediaAudio(): void {
  if (!mediaUnlocked) return;
  const silent = silentEl;
  if (silent && silent.paused) {
    void silent.play().catch(() => {
      /* needs a fresh gesture */
    });
  }
}

function stopMediaAlarm(): void {
  if (alarmStopTimer !== null) {
    clearTimeout(alarmStopTimer);
    alarmStopTimer = null;
  }
  if (alarmEl) {
    try {
      alarmEl.pause();
      alarmEl.loop = false;
      alarmEl.currentTime = 0;
    } catch {
      /* ignore */
    }
  }
}

/* ------------------------------------------------------------------ *
 * Web Audio layer (fallback + shared unlock plumbing)
 * ------------------------------------------------------------------ */

function getSharedCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (sharedCtx && sharedCtx.state !== "closed") return sharedCtx;
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedCtx = new AC({ latencyHint: "interactive" });
    installVisibilityResumeHook();
    installKeepAliveResumeHook();
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
    resumeMediaAudio();
    const ctx = sharedCtx;
    if (!ctx || ctx.state !== "suspended") return;
    void ctx.resume().catch(() => {
      /* ignore — needs a fresh gesture */
    });
  });
}

/**
 * Resume audio on any interaction with the kitchen board (tapping an order,
 * entering the PIN, etc.) — belt-and-suspenders alongside the media keep-alive.
 */
function installKeepAliveResumeHook(): void {
  if (keepAliveHookInstalled) return;
  if (typeof window === "undefined") return;
  keepAliveHookInstalled = true;
  const resume = () => {
    resumeMediaAudio();
    const ctx = sharedCtx;
    if (!ctx || ctx.state !== "suspended") return;
    void ctx.resume().catch(() => {
      /* ignore — will retry on the next gesture */
    });
  };
  for (const evt of ["pointerdown", "touchstart", "keydown", "click"] as const) {
    window.addEventListener(evt, resume, { capture: true, passive: true });
  }
}

export function unlockKitchenAudio(): void {
  if (typeof window === "undefined") return;
  // Primary: media elements (robust for the whole shift).
  unlockMediaAudio();

  // Fallback plumbing: unlock + keep the Web Audio context warm too.
  const ctx = getSharedCtx();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") void ctx.resume();
    if (!unlocked) {
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      unlocked = true;
    }
    startSilentKeepAlive(ctx);
  } catch {
    /* ignore — we'll retry on the next gesture */
  }
}

/** Keep the (fallback) AudioContext from being idled-out during quiet spells. */
function startSilentKeepAlive(ctx: AudioContext): void {
  if (silentKeepAlive) return;
  try {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 30;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    silentKeepAlive = { osc, gain };
  } catch {
    /* ignore */
  }
}

/** True once audio has been unlocked by a user gesture this session. */
export function isKitchenAudioUnlocked(): boolean {
  return mediaUnlocked || unlocked;
}

/**
 * True when the alarm can actually be fired right now. Prefers the media
 * keep-alive (which the kitchen board polls to decide whether to keep showing
 * the "enable sound" prompt); falls back to the Web Audio context state.
 */
export function isKitchenAudioReady(): boolean {
  if (mediaUnlocked && silentEl) {
    if (silentEl.paused) {
      void silentEl.play().catch(() => {
        /* prompt stays until playback resumes */
      });
      return false;
    }
    return true;
  }
  if (!unlocked) return false;
  const ctx = sharedCtx;
  if (!ctx) return false;
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => {
      /* needs a fresh gesture; the prompt will stay visible */
    });
    return false;
  }
  return ctx.state === "running";
}

export function ensureKitchenAudioUnlock(): void {
  if (typeof window === "undefined") return;
  if (isKitchenAudioUnlocked()) return;
  const handler = () => {
    unlockKitchenAudio();
    if (isKitchenAudioUnlocked()) {
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

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.knee.value = 28;
  comp.ratio.value = 8;
  comp.attack.value = 0.006;
  comp.release.value = 0.3;

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
  const fundamental = ctx.createOscillator();
  fundamental.type = "sine";
  fundamental.frequency.value = freq;

  const overtone = ctx.createOscillator();
  overtone.type = "sine";
  overtone.frequency.value = freq * 4;

  const overtoneGain = ctx.createGain();
  overtoneGain.gain.value = 0.18;

  const mix = ctx.createGain();
  mix.gain.value = 0.85;

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

/* ------------------------------------------------------------------ *
 * Public alarm controls
 * ------------------------------------------------------------------ */

export function stopKitchenAlarmLoop(): void {
  if (typeof window === "undefined") return;
  const s = activeSession;
  activeSession = null;
  if (s) {
    try {
      s.stop();
    } catch {
      /* ignore */
    }
  }
  // Defensive: ensure the media alarm is stopped even if no session was set yet.
  stopMediaAlarm();
  tryVibrate([0]);
}

/** New order: loop the chime for a while + vibrate. Media first, synth fallback. */
export function startKitchenAlarmLoop(): void {
  if (typeof window === "undefined") return;
  if (isKitchenAlarmMuted()) return;
  stopKitchenAlarmLoop();

  tryVibrate([
    350, 180, 350, 180, 350, 700,
    350, 180, 350, 180, 350, 700,
    350, 180, 350, 180, 350,
  ]);

  const alarm = getAlarmEl();
  if (alarm) {
    alarm.loop = true;
    alarm.muted = false;
    alarm.volume = 1;
    try {
      alarm.currentTime = 0;
    } catch {
      /* ignore */
    }
    const p = alarm.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        alarmStopTimer = window.setTimeout(stopMediaAlarm, ALARM_WALL_MS);
        activeSession = { stop: stopMediaAlarm };
      }).catch(() => {
        startWebAudioAlarm();
      });
      return;
    }
    // Older browsers: play() returned void — assume it started.
    alarmStopTimer = window.setTimeout(stopMediaAlarm, ALARM_WALL_MS);
    activeSession = { stop: stopMediaAlarm };
    return;
  }

  startWebAudioAlarm();
}

function startWebAudioAlarm(): void {
  const ctx = getSharedCtx();
  if (!ctx) {
    playNewOrderChime();
    return;
  }

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

/** "Test geluid" — one chime; the click also unlocks mobile audio. */
export function playTestKitchenAlarm(): void {
  if (typeof window === "undefined") return;
  if (isKitchenAlarmMuted()) return;
  unlockKitchenAudio();
  tryVibrate([100]);

  const alarm = getAlarmEl();
  if (alarm) {
    alarm.loop = false;
    alarm.muted = false;
    alarm.volume = 1;
    try {
      alarm.currentTime = 0;
    } catch {
      /* ignore */
    }
    const p = alarm.play();
    if (p && typeof p.then === "function") {
      p.catch(() => playWebAudioTest());
    }
    return;
  }

  playWebAudioTest();
}

function playWebAudioTest(): void {
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

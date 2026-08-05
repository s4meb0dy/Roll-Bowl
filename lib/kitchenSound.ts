/**
 * @file Kitchen new-order notification — unified Web Audio service.
 *
 * Two fully silent keep-warm strategies (no audible hum for staff):
 * 1. AudioContext: `resume()` before every alarm + recreate stuck elements.
 * 2. Silent wake-up on `visibilitychange` / `focus` (0-gain buffer pulse).
 *
 * Alarm playback: HTMLAudioElement (marimba wav) with Web Audio synth fallback.
 * First unlock still needs one user gesture; a header banner nudges when blocked.
 */

const MUTE_KEY = "roll-bowl-kitchen-mute";

const ALARM_WALL_MS = 14_000;
const HEARTBEAT_MS = 2_000;
const SILENT_WAKE_INTERVAL_MS = 30_000;

const ALARM_SRC = "/kitchen-alarm.wav";

const CHIME_CYCLE_S = 1.0;
const CHIME_CYCLE_GAP_S = 1.1;
const CHIME_CYCLES = 7;
const NOTE_PEAK = 0.85;

const CHIME_NOTES: ReadonlyArray<readonly [freq: number, offsetS: number, durS: number]> = [
  [523.25, 0, 0.42],
  [659.25, 0.18, 0.42],
  [783.99, 0.36, 0.46],
  [1046.5, 0.54, 0.5],
];

type Session = { stop: () => void };
type ReadinessListener = (ready: boolean) => void;

let activeSession: Session | null = null;
let audioCtx: AudioContext | null = null;
let ctxKeepAliveOsc: OscillatorNode | null = null;
let sessionArmed = false;
let hooksInstalled = false;
let heartbeatTimer: number | null = null;
let silentWakeTimer: number | null = null;
let lastSilentWakeAt = 0;

let alarmEl: HTMLAudioElement | null = null;
let alarmStopTimer: number | null = null;

const readinessListeners = new Set<ReadinessListener>();

function notifyReadiness(): void {
  const ready = isKitchenAudioReady();
  for (const fn of readinessListeners) {
    try {
      fn(ready);
    } catch {
      /* ignore */
    }
  }
}

/** Subscribe to audio readiness changes (for admin UI banner). */
export function subscribeKitchenAudioReadiness(
  listener: ReadinessListener
): () => void {
  readinessListeners.add(listener);
  listener(isKitchenAudioReady());
  return () => readinessListeners.delete(listener);
}

/** True when sound is on but autoplay is blocked — show the unlock banner. */
export function isKitchenAudioBlocked(): boolean {
  if (typeof window === "undefined") return false;
  if (isKitchenAlarmMuted()) return false;
  return !isKitchenAudioReady();
}

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
  notifyReadiness();
}

/* ------------------------------------------------------------------ *
 * Unified AudioContext service
 * ------------------------------------------------------------------ */

function createAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    return new AC({ latencyHint: "interactive" });
  } catch {
    return null;
  }
}

function closeAudioContext(): void {
  if (ctxKeepAliveOsc) {
    try {
      ctxKeepAliveOsc.stop();
      ctxKeepAliveOsc.disconnect();
    } catch {
      /* ignore */
    }
    ctxKeepAliveOsc = null;
  }
  if (audioCtx && audioCtx.state !== "closed") {
    void audioCtx.close().catch(() => {
      /* ignore */
    });
  }
  audioCtx = null;
}

/** Resume or recreate a suspended/closed AudioContext. */
async function ensureAudioContext(): Promise<AudioContext | null> {
  if (typeof window === "undefined") return null;

  if (!audioCtx || audioCtx.state === "closed") {
    closeAudioContext();
    audioCtx = createAudioContext();
    if (audioCtx) startCtxKeepAlive(audioCtx);
  }

  const ctx = audioCtx;
  if (!ctx) return null;

  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      /* may need gesture */
    }
  }

  if (ctx.state === "suspended" || ctx.state === "closed") {
    closeAudioContext();
    audioCtx = createAudioContext();
    if (audioCtx) startCtxKeepAlive(audioCtx);
    const next = audioCtx;
    if (next?.state === "suspended") {
      try {
        await next.resume();
      } catch {
        /* ignore */
      }
    }
    return audioCtx;
  }

  return audioCtx;
}

/** Near-zero oscillator keeps the Web Audio graph alive without audible output. */
function startCtxKeepAlive(ctx: AudioContext): void {
  if (ctxKeepAliveOsc) return;
  try {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 20;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    ctxKeepAliveOsc = osc;
  } catch {
    /* ignore */
  }
}

function configureMediaEl(el: HTMLAudioElement): void {
  el.preload = "auto";
  el.setAttribute("playsinline", "");
  el.setAttribute("webkit-playsinline", "");
}

function createAlarmElement(): HTMLAudioElement {
  const el = new Audio(ALARM_SRC);
  configureMediaEl(el);
  return el;
}

function destroyAlarmElement(): void {
  if (!alarmEl) return;
  try {
    alarmEl.pause();
    alarmEl.removeAttribute("src");
    alarmEl.load();
  } catch {
    /* ignore */
  }
  alarmEl = null;
}

function getAlarmElement(): HTMLAudioElement {
  if (!alarmEl) alarmEl = createAlarmElement();
  return alarmEl;
}

/** Recreate the HTMLAudioElement when it errors or won't play after idle. */
function recreateAlarmElement(): HTMLAudioElement {
  destroyAlarmElement();
  alarmEl = createAlarmElement();
  return alarmEl;
}

function isAlarmElementStuck(el: HTMLAudioElement): boolean {
  if (el.error) return true;
  return false;
}

/**
 * Prepare audio pipeline before any audible output.
 * Always resumes AudioContext first; recreates stuck media elements.
 */
async function prepareAudioSession(): Promise<boolean> {
  const ctx = await ensureAudioContext();
  if (!ctx || ctx.state !== "running") {
    notifyReadiness();
    return false;
  }

  if (alarmEl && isAlarmElementStuck(alarmEl)) {
    recreateAlarmElement();
  }

  notifyReadiness();
  return true;
}

/* ------------------------------------------------------------------ *
 * Silent wake-up (method 2) — zero audible output
 * ------------------------------------------------------------------ */

async function silentWakeUp(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!sessionArmed || isKitchenAlarmMuted()) return;

  const now = Date.now();
  if (now - lastSilentWakeAt < 400) return;
  lastSilentWakeAt = now;

  const ctx = await ensureAudioContext();
  if (!ctx) {
    notifyReadiness();
    return;
  }

  try {
    const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * 0.05)), ctx.sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    src.stop(ctx.currentTime + 0.05);
  } catch {
    /* ignore */
  }

  const el = alarmEl ?? getAlarmElement();
  try {
    const prevVol = el.volume;
    const prevMuted = el.muted;
    el.volume = 0;
    el.muted = true;
    el.currentTime = 0;
    const p = el.play();
    if (p && typeof p.then === "function") {
      await p
        .then(() => {
          el.pause();
          el.currentTime = 0;
        })
        .catch(() => {
          /* blocked — UI banner handles */
        });
    } else {
      el.pause();
    }
    el.volume = prevVol;
    el.muted = prevMuted;
  } catch {
    if (isAlarmElementStuck(el)) recreateAlarmElement();
  }

  notifyReadiness();
}

function installLifecycleHooks(): void {
  if (hooksInstalled || typeof window === "undefined") return;
  hooksInstalled = true;

  const onWake = () => {
    void silentWakeUp();
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") onWake();
  });
  window.addEventListener("focus", onWake);
  window.addEventListener("pageshow", onWake);

  const armFromGesture = () => {
    void unlockKitchenAudio();
  };
  for (const evt of ["pointerdown", "touchstart", "keydown", "click"] as const) {
    window.addEventListener(evt, armFromGesture, { capture: true, passive: true });
  }
}

function startHeartbeat(): void {
  if (typeof window === "undefined") return;
  if (heartbeatTimer !== null) return;
  heartbeatTimer = window.setInterval(() => {
    if (!sessionArmed || isKitchenAlarmMuted()) return;
    void silentWakeUp();
  }, HEARTBEAT_MS);

  if (silentWakeTimer !== null) return;
  silentWakeTimer = window.setInterval(() => {
    if (!sessionArmed || isKitchenAlarmMuted()) return;
    void silentWakeUp();
  }, SILENT_WAKE_INTERVAL_MS);
}

/* ------------------------------------------------------------------ *
 * Public unlock / readiness
 * ------------------------------------------------------------------ */

export function isKitchenAudioUnlocked(): boolean {
  return sessionArmed;
}

export function isKitchenAudioReady(): boolean {
  if (typeof window === "undefined") return false;
  if (!sessionArmed) return false;
  const ctx = audioCtx;
  if (ctx?.state === "running") return true;
  return false;
}

export function unlockKitchenAudio(): void {
  if (typeof window === "undefined") return;
  installLifecycleHooks();
  startHeartbeat();

  void (async () => {
    const ok = await prepareAudioSession();
    if (!ok) {
      notifyReadiness();
      return;
    }

    sessionArmed = true;

    const el = getAlarmElement();
    try {
      el.muted = true;
      el.volume = 0;
      const p = el.play();
      if (p && typeof p.then === "function") {
        await p
          .then(() => {
            el.pause();
            el.currentTime = 0;
            el.muted = false;
            el.volume = 1;
          })
          .catch(() => {
            el.muted = false;
            el.volume = 1;
          });
      }
    } catch {
      recreateAlarmElement();
    }

    await silentWakeUp();
    notifyReadiness();
  })();
}

export function ensureKitchenAudioUnlock(): void {
  if (typeof window === "undefined") return;
  installLifecycleHooks();
  if (sessionArmed && isKitchenAudioReady()) return;
  unlockKitchenAudio();
}

function tryVibrate(pattern: number[]): void {
  if (typeof navigator === "undefined") return;
  try {
    if (typeof navigator.vibrate === "function") navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ *
 * Web Audio chime synthesis (fallback + test)
 * ------------------------------------------------------------------ */

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
 * Alarm playback
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
  tryVibrate([0]);
  void silentWakeUp();
}

function startWebAudioAlarm(ctx: AudioContext): void {
  let endTimer: number | null = null;
  let scheduled: { stop: () => void } | null = null;

  scheduled = scheduleDeliveryChime(ctx);
  endTimer = window.setTimeout(() => {
    endTimer = null;
    activeSession = null;
  }, ALARM_WALL_MS);

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

/** New order: loop chime + vibrate. Always resumes AudioContext first. */
export function startKitchenAlarmLoop(): void {
  if (typeof window === "undefined") return;
  if (isKitchenAlarmMuted()) return;
  stopKitchenAlarmLoop();

  tryVibrate([
    350, 180, 350, 180, 350, 700,
    350, 180, 350, 180, 350, 700,
    350, 180, 350, 180, 350,
  ]);

  void (async () => {
    const ready = await prepareAudioSession();
    if (!ready) {
      notifyReadiness();
      return;
    }

    const tryPlay = async (el: HTMLAudioElement): Promise<boolean> => {
      el.loop = true;
      el.muted = false;
      el.volume = 1;
      try {
        el.currentTime = 0;
      } catch {
        /* ignore */
      }
      try {
        await el.play();
        if (alarmStopTimer !== null) clearTimeout(alarmStopTimer);
        alarmStopTimer = window.setTimeout(stopKitchenAlarmLoop, ALARM_WALL_MS);
        activeSession = { stop: stopKitchenAlarmLoop };
        return true;
      } catch {
        return false;
      }
    };

    let el = getAlarmElement();
    if (!(await tryPlay(el))) {
      el = recreateAlarmElement();
      if (!(await tryPlay(el))) {
        const ctx = await ensureAudioContext();
        if (ctx?.state === "running") startWebAudioAlarm(ctx);
        else notifyReadiness();
        return;
      }
    }

    notifyReadiness();
  })();
}

export function playNewOrderChime(): void {
  if (typeof window === "undefined" || isKitchenAlarmMuted()) return;
  void (async () => {
    const ctx = await ensureAudioContext();
    if (!ctx || ctx.state !== "running") return;
    scheduleDeliveryChime(ctx, { cycles: 1, cycleGapS: 0 });
  })();
}

/** "Test geluid" — one chime; the click also unlocks mobile audio. */
export function playTestKitchenAlarm(): void {
  if (typeof window === "undefined") return;
  if (isKitchenAlarmMuted()) return;
  unlockKitchenAudio();
  tryVibrate([100]);

  void (async () => {
    await prepareAudioSession();
    const el = getAlarmElement();
    el.loop = false;
    el.muted = false;
    el.volume = 1;
    try {
      el.currentTime = 0;
      await el.play();
    } catch {
      const retry = recreateAlarmElement();
      retry.loop = false;
      try {
        await retry.play();
      } catch {
        const ctx = await ensureAudioContext();
        if (ctx?.state === "running") {
          scheduleDeliveryChime(ctx, { cycles: 1, cycleGapS: 0 });
        }
      }
    }
  })();
}

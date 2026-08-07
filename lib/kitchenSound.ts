/**
 * @file Kitchen new-order notification — maximum-attention siren for noisy kitchens.
 *
 * Two-tone high-frequency siren (Web Audio primary + WAV layered fallback).
 * Repeats every 2 s until acknowledged or muted.
 * First unlock still needs one user gesture; the admin banner nudges when blocked.
 */

const MUTE_KEY = "roll-bowl-kitchen-mute";

/** Repeat a loud siren burst every 2 s until acknowledged. */
const ALARM_REPEAT_MS = 2_000;

const HEARTBEAT_MS = 2_000;
const SILENT_WAKE_INTERVAL_MS = 30_000;

const ALARM_SRC = "/kitchen-alarm.wav";

/** Piercing kitchen-siren tones (Hz) — tuned for tablet speakers + street noise. */
const SIREN_LOW_HZ = 2_500;
const SIREN_HIGH_HZ = 3_100;
const SIREN_BEEP_DUR_S = 0.22;
const SIREN_BEEP_GAP_S = 0.08;
const SIREN_BURST_PEAK = 1;

/** Six rapid beeps: low-low-low then high-high-high. */
const SIREN_PATTERN: ReadonlyArray<
  readonly [freq: number, offsetS: number, durS: number]
> = [
  [SIREN_LOW_HZ, 0.0, SIREN_BEEP_DUR_S],
  [SIREN_LOW_HZ, SIREN_BEEP_DUR_S + SIREN_BEEP_GAP_S, SIREN_BEEP_DUR_S],
  [
    SIREN_LOW_HZ,
    2 * (SIREN_BEEP_DUR_S + SIREN_BEEP_GAP_S),
    SIREN_BEEP_DUR_S,
  ],
  [SIREN_HIGH_HZ, 0.92, SIREN_BEEP_DUR_S],
  [SIREN_HIGH_HZ, 0.92 + SIREN_BEEP_DUR_S + SIREN_BEEP_GAP_S, SIREN_BEEP_DUR_S],
  [
    SIREN_HIGH_HZ,
    0.92 + 2 * (SIREN_BEEP_DUR_S + SIREN_BEEP_GAP_S),
    SIREN_BEEP_DUR_S,
  ],
];

type Session = { stop: () => void };
type ReadinessListener = (ready: boolean) => void;

let activeSession: Session | null = null;
let activeBurst: { stop: () => void } | null = null;
let alarmRepeatTimer: number | null = null;

let audioCtx: AudioContext | null = null;
let ctxKeepAliveOsc: OscillatorNode | null = null;
let sessionArmed = false;
let hooksInstalled = false;
let heartbeatTimer: number | null = null;
let silentWakeTimer: number | null = null;
let lastSilentWakeAt = 0;

let alarmEl: HTMLAudioElement | null = null;

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

/** True while the repeating alarm loop is active. */
export function isKitchenAlarmActive(): boolean {
  return alarmRepeatTimer !== null || activeBurst !== null;
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
 * Silent wake-up — zero audible output
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
 * Maximum-attention kitchen siren synthesis
 * ------------------------------------------------------------------ */

function buildLoudOutputGraph(ctx: AudioContext): {
  input: AudioNode;
  master: GainNode;
  cleanup: () => void;
} {
  const master = ctx.createGain();
  master.gain.value = 1;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = 2_800;
  bandpass.Q.value = 0.85;

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -2;
  comp.knee.value = 0;
  comp.ratio.value = 20;
  comp.attack.value = 0.0005;
  comp.release.value = 0.08;

  bandpass.connect(comp);
  comp.connect(master);
  master.connect(ctx.destination);

  const cleanup = () => {
    for (const node of [bandpass, comp, master]) {
      try {
        node.disconnect();
      } catch {
        /* ignore */
      }
    }
  };

  return { input: bandpass, master, cleanup };
}

function scheduleSirenBeep(
  ctx: AudioContext,
  input: AudioNode,
  t0: number,
  freq: number,
  durS: number,
  peakGain: number
): OscillatorNode[] {
  const fundamental = ctx.createOscillator();
  fundamental.type = "sawtooth";
  fundamental.frequency.value = freq;

  const overtone = ctx.createOscillator();
  overtone.type = "square";
  overtone.frequency.value = freq * 2;

  const detune = ctx.createOscillator();
  detune.type = "square";
  detune.frequency.value = freq * 1.015;

  const overtoneGain = ctx.createGain();
  overtoneGain.gain.value = 0.55;

  const detuneGain = ctx.createGain();
  detuneGain.gain.value = 0.35;

  const mix = ctx.createGain();
  mix.gain.value = 0.95;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(peakGain, t0 + 0.0015);
  env.gain.setValueAtTime(peakGain, t0 + durS * 0.72);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + durS);

  fundamental.connect(mix);
  overtone.connect(overtoneGain);
  overtoneGain.connect(mix);
  detune.connect(detuneGain);
  detuneGain.connect(mix);
  mix.connect(env);
  env.connect(input);

  const oscs = [fundamental, overtone, detune];
  for (const o of oscs) {
    o.start(t0);
    o.stop(t0 + durS + 0.04);
  }

  return oscs;
}

function scheduleKitchenSirenBurst(ctx: AudioContext): { stop: () => void } {
  const t0 = ctx.currentTime;
  const { input, master, cleanup } = buildLoudOutputGraph(ctx);
  const oscs: OscillatorNode[] = [];

  for (const [freq, offsetS, durS] of SIREN_PATTERN) {
    oscs.push(
      ...scheduleSirenBeep(ctx, input, t0 + offsetS, freq, durS, SIREN_BURST_PEAK)
    );
  }

  return {
    stop: () => {
      const now = ctx.currentTime;
      try {
        master.gain.cancelScheduledValues(now);
        master.gain.setTargetAtTime(0, now, 0.008);
      } catch {
        /* ignore */
      }
      oscs.forEach((o) => {
        try {
          o.stop(now + 0.02);
        } catch {
          /* ignore */
        }
      });
      window.setTimeout(cleanup, 180);
    },
  };
}

/* ------------------------------------------------------------------ *
 * Alarm playback
 * ------------------------------------------------------------------ */

function stopCurrentBurst(): void {
  if (!activeBurst) return;
  try {
    activeBurst.stop();
  } catch {
    /* ignore */
  }
  activeBurst = null;
}

async function playHtmlAlarmBurst(): Promise<boolean> {
  const tryPlay = async (el: HTMLAudioElement): Promise<boolean> => {
    el.loop = false;
    el.muted = false;
    el.volume = 1;
    try {
      el.currentTime = 0;
    } catch {
      /* ignore */
    }
    try {
      await el.play();
      return true;
    } catch {
      return false;
    }
  };

  let el = getAlarmElement();
  if (await tryPlay(el)) return true;
  el = recreateAlarmElement();
  return tryPlay(el);
}

/** Play one loud siren burst — Web Audio + WAV layered for max volume. */
function playAlarmBurst(): void {
  if (typeof window === "undefined" || isKitchenAlarmMuted()) return;

  void (async () => {
    const ready = await prepareAudioSession();
    if (!ready) {
      notifyReadiness();
      return;
    }

    stopCurrentBurst();

    const ctx = await ensureAudioContext();
    if (ctx?.state === "running") {
      activeBurst = scheduleKitchenSirenBurst(ctx);
      void playHtmlAlarmBurst();
      return;
    }

    if (await playHtmlAlarmBurst()) return;
    notifyReadiness();
  })();
}

export function stopKitchenAlarmLoop(): void {
  if (typeof window === "undefined") return;

  if (alarmRepeatTimer !== null) {
    clearInterval(alarmRepeatTimer);
    alarmRepeatTimer = null;
  }

  const s = activeSession;
  activeSession = null;
  if (s) {
    try {
      s.stop();
    } catch {
      /* ignore */
    }
  }

  stopCurrentBurst();

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

/** New order: repeat loud siren every 2 s until acknowledged or muted. */
export function startKitchenAlarmLoop(): void {
  if (typeof window === "undefined") return;
  if (isKitchenAlarmMuted()) return;
  stopKitchenAlarmLoop();

  tryVibrate([
    500, 100, 500, 100, 500, 100, 500, 400,
    500, 100, 500, 100, 500, 100, 500, 400,
    500, 100, 500, 100, 500,
  ]);

  playAlarmBurst();
  alarmRepeatTimer = window.setInterval(() => {
    if (isKitchenAlarmMuted()) {
      stopKitchenAlarmLoop();
      return;
    }
    playAlarmBurst();
  }, ALARM_REPEAT_MS);

  activeSession = { stop: stopKitchenAlarmLoop };
  notifyReadiness();
}

export function playNewOrderChime(): void {
  if (typeof window === "undefined" || isKitchenAlarmMuted()) return;
  void (async () => {
    const ctx = await ensureAudioContext();
    if (!ctx || ctx.state !== "running") return;
    scheduleKitchenSirenBurst(ctx);
  })();
}

/** "Test geluid" — one siren burst; the click also unlocks mobile audio. */
export function playTestKitchenAlarm(): void {
  if (typeof window === "undefined") return;
  if (isKitchenAlarmMuted()) return;
  unlockKitchenAudio();
  tryVibrate([250, 80, 250, 80, 250, 80, 250]);
  playAlarmBurst();
}

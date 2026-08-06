/**
 * @file Kitchen new-order notification — loud POS-style alarm for noisy kitchens.
 *
 * Playback: Web Audio triple-beep bursts (primary) with HTMLAudioElement fallback.
 * Repeats every ~2.5 s until the operator acknowledges or mutes.
 * First unlock still needs one user gesture; the admin banner nudges when blocked.
 */

const MUTE_KEY = "roll-bowl-kitchen-mute";

/** Repeat a loud triple-beep burst every 2.5 s until acknowledged. */
const ALARM_REPEAT_MS = 2_500;

const HEARTBEAT_MS = 2_000;
const SILENT_WAKE_INTERVAL_MS = 30_000;

const ALARM_SRC = "/kitchen-alarm.wav";

/** High-pitched POS / kitchen-timer beeps (Hz). */
const POS_BEEP_FREQ = 1_720;
const POS_BEEP_DUR_S = 0.16;
const POS_BEEP_GAP_S = 0.13;
const POS_BEEPS_PER_BURST = 3;
const POS_BURST_PEAK = 0.98;

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
 * Loud POS-style triple-beep synthesis
 * ------------------------------------------------------------------ */

function buildLoudOutputGraph(ctx: AudioContext): {
  input: AudioNode;
  master: GainNode;
  cleanup: () => void;
} {
  const master = ctx.createGain();
  master.gain.value = 1;

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -6;
  comp.knee.value = 2;
  comp.ratio.value = 16;
  comp.attack.value = 0.001;
  comp.release.value = 0.12;

  comp.connect(master);
  master.connect(ctx.destination);

  const cleanup = () => {
    for (const node of [comp, master]) {
      try {
        node.disconnect();
      } catch {
        /* ignore */
      }
    }
  };

  return { input: comp, master, cleanup };
}

function scheduleBeep(
  ctx: AudioContext,
  input: AudioNode,
  t0: number,
  freq: number,
  durS: number,
  peakGain: number
): OscillatorNode[] {
  const fundamental = ctx.createOscillator();
  fundamental.type = "square";
  fundamental.frequency.value = freq;

  const harmonic = ctx.createOscillator();
  harmonic.type = "square";
  harmonic.frequency.value = freq * 2;

  const harmonicGain = ctx.createGain();
  harmonicGain.gain.value = 0.35;

  const mix = ctx.createGain();
  mix.gain.value = 0.9;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(peakGain, t0 + 0.002);
  env.gain.setValueAtTime(peakGain * 0.9, t0 + durS * 0.65);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + durS);

  fundamental.connect(mix);
  harmonic.connect(harmonicGain);
  harmonicGain.connect(mix);
  mix.connect(env);
  env.connect(input);

  fundamental.start(t0);
  fundamental.stop(t0 + durS + 0.03);
  harmonic.start(t0);
  harmonic.stop(t0 + durS + 0.03);

  return [fundamental, harmonic];
}

function schedulePosTripleBeep(
  ctx: AudioContext,
  options: { beeps?: number } = {}
): { stop: () => void } {
  const beeps = options.beeps ?? POS_BEEPS_PER_BURST;
  const t0 = ctx.currentTime;
  const { input, master, cleanup } = buildLoudOutputGraph(ctx);
  const oscs: OscillatorNode[] = [];

  for (let i = 0; i < beeps; i++) {
    const start = t0 + i * (POS_BEEP_DUR_S + POS_BEEP_GAP_S);
    oscs.push(
      ...scheduleBeep(ctx, input, start, POS_BEEP_FREQ, POS_BEEP_DUR_S, POS_BURST_PEAK)
    );
  }

  return {
    stop: () => {
      const now = ctx.currentTime;
      try {
        master.gain.cancelScheduledValues(now);
        master.gain.setTargetAtTime(0, now, 0.01);
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
      window.setTimeout(cleanup, 150);
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

/** Play one loud triple-beep burst (Web Audio preferred). */
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
      activeBurst = schedulePosTripleBeep(ctx);
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

/** New order: repeat loud triple-beep every 2.5 s until acknowledged or muted. */
export function startKitchenAlarmLoop(): void {
  if (typeof window === "undefined") return;
  if (isKitchenAlarmMuted()) return;
  stopKitchenAlarmLoop();

  tryVibrate([
    400, 120, 400, 120, 400, 500,
    400, 120, 400, 120, 400, 500,
    400, 120, 400, 120, 400,
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
    schedulePosTripleBeep(ctx, { beeps: 3 });
  })();
}

/** "Test geluid" — one triple-beep; the click also unlocks mobile audio. */
export function playTestKitchenAlarm(): void {
  if (typeof window === "undefined") return;
  if (isKitchenAlarmMuted()) return;
  unlockKitchenAudio();
  tryVibrate([200, 80, 200, 80, 200]);
  playAlarmBurst();
}

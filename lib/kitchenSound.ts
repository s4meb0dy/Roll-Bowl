/**
 * @file Kitchen new-order notification.
 *
 * Reliability model (Android Chrome kitchen tablet, tab kept in foreground):
 *
 * - PRIMARY: HTMLAudioElement playing a pre-rendered marimba chime.
 * - Keep-alive: a looping *quietly audible* low hum (not digital silence).
 *   Chrome pauses "silent media" after idle time — that was why the yellow
 *   button kept coming back mid-shift.
 * - Heartbeat: every ~2s, if the keep-alive paused, try to restart it.
 * - Any user gesture re-arms keep-alive + wake lock (no dedicated button needed
 *   after the first tap).
 * - FALLBACK: Web Audio synth + navigator.vibrate.
 *
 * Hard browser limit: the *first* unlock still needs one gesture. After that
 * we keep the pipeline warm so alarms can fire without another tap.
 */

const MUTE_KEY = "roll-bowl-kitchen-mute";

/** How long the alarm keeps ringing (ms). */
const ALARM_WALL_MS = 14_000;
const HEARTBEAT_MS = 2_000;

const ALARM_SRC = "/kitchen-alarm.wav";
const SILENT_SRC = "/kitchen-silent.wav";

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
let activeSession: Session | null = null;

let sharedCtx: AudioContext | null = null;
let unlocked = false;
let visibilityHookInstalled = false;
let keepAliveHookInstalled = false;
let heartbeatTimer: number | null = null;
let silentKeepAlive: { osc: OscillatorNode; gain: GainNode } | null = null;

let alarmEl: HTMLAudioElement | null = null;
let silentEl: HTMLAudioElement | null = null;
let mediaUnlocked = false;
let alarmStopTimer: number | null = null;
/** True once keep-alive has successfully played at least once this session. */
let keepAliveEverPlayed = false;

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
 * Media-element layer
 * ------------------------------------------------------------------ */

function configureMediaEl(el: HTMLAudioElement): void {
  el.preload = "auto";
  el.setAttribute("playsinline", "");
  el.setAttribute("webkit-playsinline", "");
  // Hint to mobile browsers this is intentional background media.
  try {
    el.setAttribute("controls", "false");
  } catch {
    /* ignore */
  }
}

function getSilentEl(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (silentEl) return silentEl;
  try {
    const el = new Audio(SILENT_SRC);
    el.loop = true;
    configureMediaEl(el);
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
    configureMediaEl(el);
    alarmEl = el;
  } catch {
    alarmEl = null;
  }
  return alarmEl;
}

/** Tear down and recreate media elements (recover from a dead pipeline). */
function recreateMediaElements(): void {
  if (silentEl) {
    try {
      silentEl.pause();
      silentEl.removeAttribute("src");
      silentEl.load();
    } catch {
      /* ignore */
    }
    silentEl = null;
  }
  if (alarmEl) {
    try {
      alarmEl.pause();
      alarmEl.removeAttribute("src");
      alarmEl.load();
    } catch {
      /* ignore */
    }
    alarmEl = null;
  }
}

function playSilentKeepAlive(): Promise<boolean> {
  const silent = getSilentEl();
  if (!silent) return Promise.resolve(false);
  silent.loop = true;
  silent.muted = false;
  // Keep-alive must stay inaudible; alarm volume is separate.
  silent.volume = 0.05;
  try {
    if (silent.ended) silent.currentTime = 0;
  } catch {
    /* ignore */
  }
  const p = silent.play();
  if (p && typeof p.then === "function") {
    return p
      .then(() => {
        mediaUnlocked = true;
        keepAliveEverPlayed = true;
        return true;
      })
      .catch(() => false);
  }
  mediaUnlocked = true;
  keepAliveEverPlayed = true;
  return Promise.resolve(true);
}

/**
 * Bless both media elements from a user gesture and start the keep-alive loop.
 */
function unlockMediaAudio(): void {
  void playSilentKeepAlive();

  // Don't poke the alarm element while it's ringing — that would interrupt it.
  const alarmRinging =
    Boolean(alarmEl && !alarmEl.paused && alarmEl.loop) || Boolean(activeSession);
  if (!alarmRinging) {
    const alarm = getAlarmEl();
    if (alarm) {
      alarm.muted = true;
      alarm.volume = 1;
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
      } else {
        alarm.muted = false;
      }
    }
  }

  startHeartbeat();
}

function resumeMediaAudio(): void {
  if (!mediaUnlocked && !keepAliveEverPlayed) return;
  void playSilentKeepAlive().then((ok) => {
    if (!ok && keepAliveEverPlayed) {
      // Pipeline died hard — recreate and retry once.
      recreateMediaElements();
      void playSilentKeepAlive();
    }
  });
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

function startHeartbeat(): void {
  if (typeof window === "undefined") return;
  if (heartbeatTimer !== null) return;
  heartbeatTimer = window.setInterval(() => {
    if (isKitchenAlarmMuted()) return;
    // Don't interrupt a ringing alarm.
    if (activeSession && alarmEl && !alarmEl.paused && alarmEl.loop) return;
    const silent = silentEl;
    if (!silent) {
      if (mediaUnlocked || keepAliveEverPlayed) void playSilentKeepAlive();
      return;
    }
    if (silent.paused || silent.ended) {
      void playSilentKeepAlive().then((ok) => {
        if (!ok && keepAliveEverPlayed) {
          recreateMediaElements();
          void playSilentKeepAlive();
        }
      });
    }
  }, HEARTBEAT_MS);
}

/* ------------------------------------------------------------------ *
 * Web Audio layer (fallback)
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
      /* needs a fresh gesture */
    });
  });
  // pageshow covers bfcache / Android tab restore.
  window.addEventListener("pageshow", () => {
    resumeMediaAudio();
  });
  window.addEventListener("focus", () => {
    resumeMediaAudio();
  });
}

function installKeepAliveResumeHook(): void {
  if (keepAliveHookInstalled) return;
  if (typeof window === "undefined") return;
  keepAliveHookInstalled = true;
  const resume = () => {
    // Any gesture: re-arm keep-alive (this IS a user gesture → play() allowed).
    unlockMediaAudio();
    const ctx = sharedCtx;
    if (ctx && ctx.state === "suspended") {
      void ctx.resume().catch(() => {
        /* ignore */
      });
    }
  };
  for (const evt of ["pointerdown", "touchstart", "keydown", "click"] as const) {
    window.addEventListener(evt, resume, { capture: true, passive: true });
  }
}

export function unlockKitchenAudio(): void {
  if (typeof window === "undefined") return;
  unlockMediaAudio();

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
    /* ignore */
  }
}

function startSilentKeepAlive(ctx: AudioContext): void {
  if (silentKeepAlive) return;
  try {
    const gain = ctx.createGain();
    // Tiny but non-zero so the context stays "active".
    gain.gain.value = 0.0008;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 55;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    silentKeepAlive = { osc, gain };
  } catch {
    /* ignore */
  }
}

export function isKitchenAudioUnlocked(): boolean {
  return mediaUnlocked || unlocked || keepAliveEverPlayed;
}

/**
 * True when the alarm can fire right now. Prefer media keep-alive state.
 */
export function isKitchenAudioReady(): boolean {
  if (silentEl && !silentEl.paused && !silentEl.ended) {
    mediaUnlocked = true;
    keepAliveEverPlayed = true;
    return true;
  }
  if (mediaUnlocked || keepAliveEverPlayed) {
    // Try to resume immediately; report not-ready until it actually plays
    // so the UI can still nudge if needed — but heartbeat + gesture hooks
    // usually recover without the yellow button.
    void playSilentKeepAlive();
    return Boolean(silentEl && !silentEl.paused);
  }
  if (!unlocked) return false;
  const ctx = sharedCtx;
  if (!ctx) return false;
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => {
      /* needs gesture */
    });
    return false;
  }
  return ctx.state === "running";
}

export function ensureKitchenAudioUnlock(): void {
  if (typeof window === "undefined") return;
  installVisibilityResumeHook();
  installKeepAliveResumeHook();
  if (isKitchenAudioUnlocked()) {
    unlockKitchenAudio();
    return;
  }
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
  stopMediaAlarm();
  tryVibrate([0]);
  // Resume keep-alive after the alarm stops.
  resumeMediaAudio();
}

function beginMediaAlarm(el: HTMLAudioElement): void {
  el.loop = true;
  el.muted = false;
  el.volume = 1;
  try {
    el.currentTime = 0;
  } catch {
    /* ignore */
  }
}

/** New order: loop the chime + vibrate. Media first, recreate on failure, synth fallback. */
export function startKitchenAlarmLoop(): void {
  if (typeof window === "undefined") return;
  if (isKitchenAlarmMuted()) return;
  stopKitchenAlarmLoop();

  tryVibrate([
    350, 180, 350, 180, 350, 700,
    350, 180, 350, 180, 350, 700,
    350, 180, 350, 180, 350,
  ]);

  // Nudge keep-alive so the pipeline is warm before/while alarm plays.
  void playSilentKeepAlive();

  const armSession = (el: HTMLAudioElement) => {
    if (alarmStopTimer !== null) {
      clearTimeout(alarmStopTimer);
      alarmStopTimer = null;
    }
    alarmStopTimer = window.setTimeout(stopMediaAlarm, ALARM_WALL_MS);
    activeSession = { stop: stopMediaAlarm };
    void el; // el already playing
  };

  const tryPlay = (el: HTMLAudioElement): Promise<boolean> => {
    beginMediaAlarm(el);
    const p = el.play();
    if (p && typeof p.then === "function") {
      return p
        .then(() => {
          armSession(el);
          return true;
        })
        .catch(() => false);
    }
    armSession(el);
    return Promise.resolve(true);
  };

  const alarm = getAlarmEl();
  if (alarm) {
    void tryPlay(alarm).then((ok) => {
      if (ok) return;
      // Dead element — recreate and retry once.
      recreateMediaElements();
      const retry = getAlarmEl();
      if (!retry) {
        startWebAudioAlarm();
        return;
      }
      void tryPlay(retry).then((ok2) => {
        if (!ok2) startWebAudioAlarm();
        else void playSilentKeepAlive();
      });
    });
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
      p.catch(() => {
        recreateMediaElements();
        const retry = getAlarmEl();
        if (!retry) {
          playWebAudioTest();
          return;
        }
        retry.loop = false;
        retry.muted = false;
        void retry.play().catch(() => playWebAudioTest());
      });
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

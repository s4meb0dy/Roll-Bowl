/**
 * @file Kitchen alarm: cross-device, loud two-tone siren.
 *
 * Why this file exists in this shape:
 * - Mobile browsers (iOS Safari, Android Chrome) refuse to play audio until
 *   the user has interacted with the page at least once. The previous
 *   implementation created a fresh `AudioContext` per beep — that silently
 *   stayed `suspended` on phones/tablets and never produced sound.
 * - This module now keeps **one shared** `AudioContext` for the whole
 *   session, exposes `unlockKitchenAudio()` to be called inside a user
 *   gesture handler (the PIN unlock), and registers a global one-shot
 *   gesture listener as a defensive fallback.
 * - The alarm itself is rebuilt as a two-tone (hi/lo) square+sine layer
 *   pushed through a bandpass (peaks ear-sensitive ~1.8 kHz) and a
 *   dynamics compressor with high ratio + makeup gain, giving the maximum
 *   perceived loudness Web Audio can deliver without clipping.
 * - `navigator.vibrate` is fired in parallel so silenced phones still buzz.
 */

const MUTE_KEY = "roll-bowl-kitchen-mute";

const ALARM_WALL_MS = 5_000;
const ALARM_MAX_AUDIO_S = 5;
const BEEP_DUR_S = 0.18;
const BEEP_GAP_S = 0.06;
const FREQ_HI = 1320;
const FREQ_LO = 990;

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

/**
 * Re-resume the shared context whenever the tab becomes visible again.
 * iOS / mobile browsers often suspend long-idle AudioContexts; without this,
 * the first new order after the kitchen tab has been backgrounded would be
 * silent until someone taps the screen.
 */
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

/**
 * Unlock audio for the current session. Must be called from inside a user
 * gesture handler (click / pointerdown / keydown / touchstart) on iOS Safari
 * — that's the only window in which `resume()` and the silent-buffer trick
 * are honoured. Subsequent calls are cheap no-ops.
 */
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

/**
 * Defensive backup: install a one-shot global listener that unlocks audio
 * on the very first user interaction with the page. Idempotent — call this
 * on mount of any page that may need to ring the kitchen alarm.
 */
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

function tryVibrate(pattern: number | number[]): void {
  if (typeof navigator === "undefined") return;
  try {
    const vibrate = (navigator as Navigator & { vibrate?: (p: number | number[]) => boolean })
      .vibrate;
    if (typeof vibrate === "function") vibrate.call(navigator, pattern);
  } catch {
    /* ignore */
  }
}

/**
 * Build the loud-but-clean output graph: bandpass → compressor → makeup gain.
 * Bandpass focuses energy in the 1–3 kHz band where the human ear is most
 * sensitive; compressor + 0.95 makeup gain pushes the perceived loudness to
 * the ceiling without hard-clipping the speaker.
 */
function buildOutputGraph(ctx: AudioContext): {
  input: AudioNode;
  master: GainNode;
  cleanup: () => void;
} {
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -8;
  compressor.knee.value = 0;
  compressor.ratio.value = 18;
  compressor.attack.value = 0.001;
  compressor.release.value = 0.05;

  const master = ctx.createGain();
  master.gain.value = 0.95;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = 1800;
  bandpass.Q.value = 0.6;

  bandpass.connect(compressor);
  compressor.connect(master);
  master.connect(ctx.destination);

  const cleanup = () => {
    try {
      bandpass.disconnect();
    } catch {
      /* ignore */
    }
    try {
      compressor.disconnect();
    } catch {
      /* ignore */
    }
    try {
      master.disconnect();
    } catch {
      /* ignore */
    }
  };

  return { input: bandpass, master, cleanup };
}

/**
 * Pre-schedule a two-tone siren on the audio timeline. Each beep stacks a
 * square wave (rich harmonics → piercing) with a sine an octave above
 * (adds body), shaped by a fast attack / hold / release envelope.
 *
 * Returns a stop() that immediately ducks the master gain to zero and
 * tears down the graph — used by `stopKitchenAlarmLoop()` so that
 * "Bevestig gehoord" / "Accepteren & afdrukken" cuts the noise instantly.
 */
function scheduleAlarm(ctx: AudioContext, durationS: number): { stop: () => void } {
  const t0 = ctx.currentTime;
  const { input, master, cleanup } = buildOutputGraph(ctx);
  const oscs: OscillatorNode[] = [];

  let off = 0;
  let i = 0;
  while (off + BEEP_DUR_S <= durationS + 0.001) {
    const at = t0 + off;
    const freq = i % 2 === 0 ? FREQ_HI : FREQ_LO;

    const square = ctx.createOscillator();
    square.type = "square";
    square.frequency.value = freq;

    const sine = ctx.createOscillator();
    sine.type = "sine";
    sine.frequency.value = freq * 2;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(0.7, at + 0.006);
    env.gain.setValueAtTime(0.7, at + BEEP_DUR_S - 0.03);
    env.gain.exponentialRampToValueAtTime(0.0001, at + BEEP_DUR_S);

    square.connect(env);
    sine.connect(env);
    env.connect(input);

    square.start(at);
    square.stop(at + BEEP_DUR_S + 0.02);
    sine.start(at);
    sine.stop(at + BEEP_DUR_S + 0.02);

    oscs.push(square, sine);

    off += BEEP_DUR_S + BEEP_GAP_S;
    i++;
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
  tryVibrate(0);
}

/**
 * Fire the alarm: 5s of two-tone siren + matching vibration pattern.
 * Falls back to `playNewOrderChime()` if Web Audio is unavailable.
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

  // Vibration: alternating 380ms buzz / 120ms gap, ~5s total.
  tryVibrate([380, 120, 380, 120, 380, 120, 380, 120, 380, 120, 380]);

  let endTimer: number | null = null;
  let scheduled: { stop: () => void } | null = null;

  const run = () => {
    scheduled = scheduleAlarm(ctx, ALARM_MAX_AUDIO_S);
    endTimer = window.setTimeout(() => {
      endTimer = null;
      activeSession = null;
    }, ALARM_WALL_MS);
  };

  if (ctx.state === "suspended") {
    void ctx
      .resume()
      .then(run)
      .catch(run);
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

/**
 * Short two-note chime — used as a fallback when the Web Audio graph can't
 * be constructed (very old browsers). Kept intentionally simple.
 */
export function playNewOrderChime(): void {
  if (typeof window === "undefined" || isKitchenAlarmMuted()) return;
  const ctx = getSharedCtx();
  if (!ctx) return;

  const playTones = () => {
    const tones: Array<[number, number, number]> = [
      [880, 0, 0.16],
      [1174.66, 0.18, 0.18],
    ];
    const { input, cleanup } = buildOutputGraph(ctx);
    for (const [freq, tOff, dur] of tones) {
      const t0 = ctx.currentTime + tOff;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.6, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g);
      g.connect(input);
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    }
    window.setTimeout(cleanup, 800);
  };

  if (ctx.state === "suspended") {
    void ctx.resume().then(playTones).catch(playTones);
  } else {
    playTones();
  }
}

/**
 * "Test geluid" button — one short two-tone burst + a quick vibration.
 * Doubles as a manual unlock for mobile (the click itself is a gesture).
 */
export function playTestKitchenAlarm(): void {
  if (typeof window === "undefined") return;
  if (isKitchenAlarmMuted()) return;
  unlockKitchenAudio();
  const ctx = getSharedCtx();
  if (!ctx) return;

  tryVibrate(180);

  const fire = () => {
    scheduleAlarm(ctx, BEEP_DUR_S * 2 + BEEP_GAP_S);
  };

  if (ctx.state === "suspended") {
    void ctx.resume().then(fire).catch(fire);
  } else {
    fire();
  }
}

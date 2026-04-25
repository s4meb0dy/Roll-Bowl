/** @file Kitchen: sine beeps, exactly one 5.2s wall session; AudioContext + pre-scheduled timeline. */

const MUTE_KEY = "roll-bowl-kitchen-mute";

/** Wall-clock: hard stop + context close (audio beeps are pre-scheduled within 5s). */
const ALARM_WALL_MS = 5_000;
const BEEP_EVERY_S = 0.45;
const BEEP_DUR_S = 0.12;
const ALARM_MAX_AUDIO_S = 5;
const BEEP_FREQ = 900;

type Session = { stop: () => void };
let activeSession: Session | null = null;

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

function scheduleBeepsOnTimeline(ctx: AudioContext) {
  const t0 = ctx.currentTime;
  for (let off = 0; off + BEEP_DUR_S <= ALARM_MAX_AUDIO_S + 0.001; off += BEEP_EVERY_S) {
    const at = t0 + off;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = BEEP_FREQ;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.1, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + BEEP_DUR_S);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(at);
    o.stop(at + BEEP_DUR_S + 0.02);
  }
}

export function stopKitchenAlarmLoop(): void {
  if (typeof window === "undefined") return;
  if (!activeSession) return;
  try {
    activeSession.stop();
  } catch {
    /* ignore */
  }
}

/**
 * Beep train for 5s audio time, then wall-clock `ALARM_WALL_MS` hard stop. No setInterval
 * (avoids suspended-audio + timer desync). Call stop early to `AudioContext#close` (cancels all).
 */
export function startKitchenAlarmLoop(): void {
  if (typeof window === "undefined") return;
  if (isKitchenAlarmMuted()) return;
  stopKitchenAlarmLoop();

  let endTimer: number | null = null;
  let ctx: AudioContext | null = null;

  const run = () => {
    if (!ctx) return;
    scheduleBeepsOnTimeline(ctx);
    endTimer = window.setTimeout(() => {
      endTimer = null;
      if (ctx) {
        try {
          void ctx.close();
        } catch {
          /* ignore */
        }
        ctx = null;
      }
      activeSession = null;
    }, ALARM_WALL_MS);
  };

  try {
    const AC =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    if (ctx.state === "suspended") {
      void ctx
        .resume()
        .then(() => {
          if (ctx) run();
        })
        .catch(() => {
          if (ctx) run();
        });
    } else {
      run();
    }
    activeSession = {
      stop: () => {
        if (endTimer !== null) {
          clearTimeout(endTimer);
          endTimer = null;
        }
        if (ctx) {
          try {
            void ctx.close();
          } catch {
            /* ignore */
          }
          ctx = null;
        }
        activeSession = null;
      },
    };
  } catch {
    playNewOrderChime();
  }
}

export function playNewOrderChime(): void {
  if (typeof window === "undefined" || isKitchenAlarmMuted()) return;
  let ctx: AudioContext | null = null;
  try {
    const AC =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    const playTones = () => {
      if (!ctx) return;
      const play = (freq: number, tOff: number, dur: number) => {
        if (!ctx) return;
        const t0 = ctx.currentTime + tOff;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.1, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(t0);
        o.stop(t0 + dur + 0.05);
      };
      play(880, 0, 0.14);
      play(1174.66, 0.16, 0.16);
    };
    if (ctx.state === "suspended") {
      void ctx.resume().then(() => {
        playTones();
        window.setTimeout(() => {
          try {
            void ctx?.close();
          } catch {
            /* ignore */
          }
        }, 800);
      });
    } else {
      playTones();
      window.setTimeout(() => {
        try {
          void ctx?.close();
        } catch {
          /* ignore */
        }
      }, 800);
    }
  } catch {
    /* ignore */
  }
}

export function playTestKitchenAlarm(): void {
  if (typeof window === "undefined") return;
  if (isKitchenAlarmMuted()) return;
  let ctx: AudioContext | null = null;
  try {
    const AC =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    const oneBeep = () => {
      if (!ctx) return;
      const t0 = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = BEEP_FREQ;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.1, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + BEEP_DUR_S);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + BEEP_DUR_S + 0.02);
    };
    const finish = () => {
      window.setTimeout(() => {
        try {
          void ctx?.close();
        } catch {
          /* ignore */
        }
      }, 400);
    };
    if (ctx.state === "suspended") {
      void ctx.resume().then(() => {
        oneBeep();
        finish();
      });
    } else {
      oneBeep();
      finish();
    }
  } catch {
    playNewOrderChime();
  }
}

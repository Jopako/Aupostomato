let ctx: AudioContext | null = null;
let muted = false;

try {
  muted = localStorage.getItem('aupostomato:muted') === '1';
} catch {
  /* sem storage */
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(m: boolean): void {
  muted = m;
  try {
    localStorage.setItem('aupostomato:muted', m ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = ctx ?? new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.08, delay = 0, slideTo?: number) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export const sfx = {
  click: () => tone(520, 0.06, 'triangle', 0.05),
  card: () => tone(300, 0.05, 'square', 0.03),
  push: () => tone(330, 0.12, 'sawtooth', 0.04, 0, 520),
  pop: () => tone(520, 0.12, 'sawtooth', 0.04, 0, 300),
  chip: () => {
    tone(880, 0.07, 'triangle', 0.05);
    tone(1320, 0.09, 'triangle', 0.04, 0.05);
  },
  accept: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.06, i * 0.09)),
  reject: () => {
    tone(220, 0.25, 'sawtooth', 0.05, 0, 110);
  },
  win: () => [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.07, i * 0.11)),
  lose: () => [330, 262, 196, 147].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.05, i * 0.16)),
  coin: () => {
    tone(1200, 0.06, 'square', 0.04);
    tone(1700, 0.12, 'square', 0.04, 0.06);
  },
};

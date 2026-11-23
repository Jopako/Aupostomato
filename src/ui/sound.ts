/** Sons sintetizados com WebAudio (sem arquivos). Só iniciam após um gesto do usuário. */
let ctx: AudioContext | null = null;
let muted = false;
let musicTimer: number | null = null;
let musicOn = false;
let step = 0;

try {
  muted = localStorage.getItem('aupostomato:muted') === '1';
} catch {
  /* ignore */
}

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const C = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext });
    const Ctor = C.AudioContext ?? C.webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.08, delay = 0, slideTo?: number) {
  const a = ac();
  if (!a || muted) return;
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

export type Sfx = 'click' | 'card' | 'push' | 'pop' | 'accept' | 'reject' | 'win' | 'lose' | 'coin' | 'score';

export function sfx(name: Sfx): void {
  switch (name) {
    case 'click': tone(520, 0.05, 'square', 0.03); break;
    case 'card': tone(300, 0.06, 'triangle', 0.05, 0, 180); break;
    case 'push': tone(330, 0.12, 'triangle', 0.07, 0, 520); break;
    case 'pop': tone(520, 0.12, 'triangle', 0.07, 0, 300); break;
    case 'accept': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'sine', 0.07, i * 0.08)); break;
    case 'reject': tone(220, 0.25, 'sawtooth', 0.05, 0, 110); break;
    case 'win': [392, 494, 587, 784].forEach((f, i) => tone(f, 0.25, 'triangle', 0.08, i * 0.1)); break;
    case 'lose': [330, 262, 196, 131].forEach((f, i) => tone(f, 0.35, 'sawtooth', 0.05, i * 0.16)); break;
    case 'coin': tone(988, 0.07, 'square', 0.04); tone(1319, 0.14, 'square', 0.04, 0.07); break;
    case 'score': tone(660, 0.07, 'triangle', 0.05); break;
  }
}

// linha de baixo "noir" muito discreta
const BASS = [110, 0, 131, 0, 147, 0, 131, 0, 98, 0, 117, 0, 131, 0, 117, 0];
function musicTick() {
  const f = BASS[step % BASS.length];
  if (f) tone(f, 0.5, 'triangle', 0.035);
  if (step % 8 === 0) tone(f * 4 || 440, 0.9, 'sine', 0.012);
  step++;
}

export function startMusic(): void {
  if (musicOn || typeof window === 'undefined') return;
  musicOn = true;
  musicTimer = window.setInterval(() => {
    if (!muted) musicTick();
  }, 420);
}

export function stopMusic(): void {
  if (musicTimer !== null) window.clearInterval(musicTimer);
  musicTimer = null;
  musicOn = false;
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
  if (!m) startMusic();
}

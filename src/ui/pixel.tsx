import { ReactNode, useEffect, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Suit } from '../game/cards';

/* ------------------------------------------------------------------ *
 *  1) "Pixelizador": rasteriza uma arte vetorial numa grade pequena,
 *     reduz a paleta e entrega um PNG que a tela amplia sem suavizar.
 * ------------------------------------------------------------------ */
const cache = new Map<string, string>();
const LEVELS = 7; // níveis por canal → 343 cores

function posterize(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const q = (v: number) => Math.round((v / 255) * (LEVELS - 1)) * (255 / (LEVELS - 1));
  for (let i = 0; i < d.length; i += 4) {
    d[i] = q(d[i]);
    d[i + 1] = q(d[i + 1]);
    d[i + 2] = q(d[i + 2]);
    d[i + 3] = d[i + 3] > 110 ? 255 : 0;
  }
  ctx.putImageData(img, 0, 0);
}

function rasterize(markup: string, cw: number, ch: number): Promise<string> {
  const hit = cache.get(markup + cw);
  if (hit) return Promise.resolve(hit);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = cw;
        c.height = ch;
        const ctx = c.getContext('2d');
        if (!ctx) return reject(new Error('sem canvas'));
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(img, 0, 0, cw, ch);
        posterize(ctx, cw, ch);
        const url = c.toDataURL('image/png');
        cache.set(markup + cw, url);
        resolve(url);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('falha ao carregar SVG'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);
  });
}

/** Devolve um PNG pixelado (data URL) da arte `node`, desenhada num viewBox vbW×vbH e reduzida a cw×ch pixels. */
export function usePixelURL(node: ReactNode, vbW: number, vbH: number, cw: number, ch: number): string | null {
  const markup = renderToStaticMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${vbW} ${vbH}`} width={vbW} height={vbH}>
      {node}
    </svg>,
  );
  const [url, setUrl] = useState<string | null>(() => cache.get(markup + cw) ?? null);
  useEffect(() => {
    let alive = true;
    const hit = cache.get(markup + cw);
    if (hit) {
      setUrl(hit);
      return;
    }
    rasterize(markup, cw, ch)
      .then((u) => alive && setUrl(u))
      .catch(() => alive && setUrl(null));
    return () => {
      alive = false;
    };
  }, [markup, cw, ch]);
  return url;
}

/* ------------------------------------------------------------------ *
 *  2) Sprites desenhados à mão, pixel a pixel (data URI SVG nítido).
 * ------------------------------------------------------------------ */
export function sprite(rows: string[], pal: Record<string, string>): string {
  const h = rows.length;
  const w = rows[0].length;
  let rects = '';
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      const ch = rows[y][x];
      if (ch === '.' || !pal[ch]) {
        x++;
        continue;
      }
      let run = 1;
      while (x + run < w && rows[y][x + run] === ch) run++;
      rects += `<rect x='${x}' y='${y}' width='${run}' height='1' fill='${pal[ch]}'/>`;
      x += run;
    }
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}' shape-rendering='crispEdges'>${rects}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

// ---------- sprites 16×16 desenhados à mão (paleta com 3–4 tons por material) ----------
const WALL = sprite(
  [
    'hhhhhhhMhhhhhhhM',
    'bbbbbbbMbbbsbbbM',
    'bbbbbbdMbbbbbbdM',
    'MMMMMMMMMMMMMMMM',
    'hhhMhhhhhhhMhhhh',
    'bbbMbbbbbbbMbbbb',
    'bsbMbbbbbbdMbbsb',
    'MMMMMMMMMMMMMMMM',
    'hhhhhhhMhhhhhhhM',
    'bbbbbsbMbbbbbbbM',
    'bbbbbbdMbbbbbbdM',
    'MMMMMMMMMMMMMMMM',
    'hhhMhhhhhhhMhhhh',
    'bbbMbbbbbsbMbbbb',
    'bbdMbbbbbbdMbbbb',
    'MMMMMMMMMMMMMMMM',
  ],
  { M: '#0e0a1c', h: '#6b5cab', b: '#4b3d85', d: '#392d68', s: '#5a4a96' },
);
const FLOOR = sprite(
  [
    'lllllllglllllllg',
    'lfffffngluffffug',
    'lffnfffglffffnfg',
    'lfffffugluffffng',
    'lffffnfglffnfffg',
    'luffffngflffffug',
    'lffnfffglfffffng',
    'gggggggggggggggg',
    'lllgllllllllgllg',
    'lffgfffnlffgfffg',
    'lfngfuffnfgffnfg',
    'lffgffffffgfffug',
    'lfufgffnlffgffng',
    'lffgfffflffgfffg',
    'lnfgffuffnfgfffg',
    'gggggggggggggggg',
  ],
  { l: '#3a2d63', f: '#2d2352', u: '#322759', n: '#281f49', g: '#1b1433' },
);
const DOOR = sprite(
  [
    'kkkkkkkkkkkkkkkk',
    'ksssssssssssssSk',
    'ksddddddddddddsk',
    'ksdWwxWwwxWwwdsk',
    'ksdWwxWwwxWwwdsk',
    'ksdiiiiiiiiiidsk',
    'ksdWwxWwwxWwwdsk',
    'ksdWwxWwwxWyYdsk',
    'ksdWwxWwwxWYydsk',
    'ksdWwxWwwxWwwdsk',
    'ksdWwxWwwxWwwdsk',
    'ksdiiiiiiiiiidsk',
    'ksdWwxWwwxWwwdsk',
    'ksdWwxWwwxWwwdsk',
    'ksddddddddddddsk',
    'kkkkkkkkkkkkkkkk',
  ],
  { k: '#190c06', s: '#7a6db0', S: '#5a4d8c', d: '#3a2110', W: '#b07c3a', w: '#8c5c28', x: '#5e3a18', i: '#2c2c3c', y: '#ffd95a', Y: '#fff2a8' },
);
const DOOR_OPEN = sprite(
  [
    'kkkkkkkkkkkkkkkk',
    'ksssssssssssssSk',
    'kszzzzzzzzzzzzsk',
    'kszzzzzzzzzzzzsk',
    'kszqqqqqqqqqqzsk',
    'kszqzzzzzzzzqzsk',
    'kszqzzzzzzzzqzsk',
    'kszqzzzzzzzzqzsk',
    'kszqzzzzzzzzqzsk',
    'kszqzzzzzzzzqzsk',
    'kszqzzzzzzzzqzsk',
    'kszqzzzzzzzzqzsk',
    'kszqzzzzzzzzqzsk',
    'kszzzzzzzzzzzzsk',
    'ksffffffffffffsk',
    'kkkkkkkkkkkkkkkk',
  ],
  { k: '#190c06', s: '#5a4d8c', z: '#0a0612', q: '#150d26', f: '#3a2d63' },
);
/** Portal: vórtice em espiral calculado por pixel (paleta de 5 tons), 2 quadros. */
function portalFrame(frame: number): string {
  const ramp = ['#06202b', '#0e5470', '#1fb0c2', '#7ef0ff', '#e6ffff'];
  const rows: string[] = [];
  const pal: Record<string, string> = {};
  ramp.forEach((c, i) => (pal[String(i)] = c));
  pal.o = '#0a3a4a';
  for (let y = 0; y < 16; y++) {
    let row = '';
    for (let x = 0; x < 16; x++) {
      const dx = x - 7.5;
      const dy = y - 7.5;
      const r = Math.hypot(dx, dy);
      if (r > 7.6) { row += '.'; continue; }
      if (r > 6.7) { row += 'o'; continue; }
      if (r < 1.8) { row += '0'; continue; }
      const th = Math.atan2(dy, dx) / (Math.PI * 2);
      let v = (r * 0.55 + th * 3 + frame * 0.5) % 1;
      if (v < 0) v += 1;
      row += String(Math.min(4, 1 + Math.floor(v * 4)));
    }
    rows.push(row);
  }
  return sprite(rows, pal);
}
const PORTAL_A = portalFrame(0);
const PORTAL_B = portalFrame(1);
const CAPRI = sprite(
  [
    '................',
    '.....kkkkkk.....',
    '....krrrrrrk....',
    '...krrrrrrrrk...',
    '...krrsssssrk...',
    '...ksssssssSk...',
    '...kseSssseSk...',
    '...kssssssssk...',
    '....kSsssSsk....',
    '...kkcwxxwckk...',
    '..kcccwxxwcccck.',
    '..kcLccwwcccCck.',
    '..ksLcccccCcCsk.',
    '...kkccggccckk..',
    '....kccckcccck..',
    '....kooo.kooo...',
  ],
  { k: '#120c18', r: '#4a2c1a', s: '#eac393', S: '#c99a76', e: '#1a1020', c: '#6b6f7a', C: '#4a4e5a', L: '#8e93a2', w: '#f4efe6', x: '#d3202f', g: '#ffd95a', o: '#2a1a10' },
);
const CARD = sprite(
  [
    '................',
    '..kkkkkkkkkkkk..',
    '.kFFFFFFFFFFFFk.',
    '.kFfffffffffffk.',
    '.kFfffffffffffkd',
    '.kFfffffffffffkd',
    '.kFfffffffffffkd',
    '.kFfffffffffffkd',
    '.kFfffffffffffkd',
    '.kFfffffffffffkd',
    '.kFfffffffffffkd',
    '.kFfffffffffffkd',
    '.kFfffffffffffkd',
    '.kFfffffffffffkd',
    '..kkkkkkkkkkkkd.',
    '...dddddddddddd.',
  ],
  { k: '#1a1420', F: '#fffbea', f: '#f1e6c8', d: '#0a0612' },
);

const SUIT_ROWS: Record<Suit, string[]> = {
  H: ['.xx..xx.', 'xyxxxxxx', 'xxxxxxxx', 'xxxxxxxx', '.xxxxxx.', '..xxxx..', '...xx...', '........'],
  D: ['...xx...', '..xyxx..', '.xyxxxx.', 'xxxxxxxx', '.xxxxxx.', '..xxxx..', '...xx...', '........'],
  C: ['..xxxx..', '..xyxx..', '.xxxxxx.', 'xx.xx.xx', 'xyxxxxxx', '...xx...', '..xxxx..', '........'],
  S: ['...xx...', '..xyxx..', '.xyxxxx.', 'xxxxxxxx', 'xxxxxxxx', '...xx...', '..xxxx..', '........'],
};
const suitCache = new Map<string, string>();
export function suitSprite(suit: Suit): string {
  const red = suit === 'H' || suit === 'D';
  const k = suit;
  let s = suitCache.get(k);
  if (!s) {
    s = sprite(SUIT_ROWS[suit], red ? { x: '#d3202f', y: '#ff7a7a' } : { x: '#1a1420', y: '#5e5478' });
    suitCache.set(k, s);
  }
  return s;
}

/** Naipe em pixel art. Tamanho em `em`. */
export function SuitIcon({ suit, size = 1, className = '' }: { suit: Suit; size?: number; className?: string }) {
  return (
    <span
      className={`suit-px ${className}`}
      role="img"
      aria-label={{ H: 'copas', D: 'ouros', C: 'paus', S: 'espadas' }[suit]}
      style={{ width: `${size}em`, height: `${size}em`, backgroundImage: suitSprite(suit) }}
    />
  );
}

/** Variáveis CSS com os sprites, aplicadas no contêiner do mapa. */
export const MAP_SPRITES: Record<string, string> = {
  '--spr-wall': WALL,
  '--spr-floor': FLOOR,
  '--spr-door': DOOR,
  '--spr-door-open': DOOR_OPEN,
  '--spr-portal-a': PORTAL_A,
  '--spr-portal-b': PORTAL_B,
  '--spr-capri': CAPRI,
  '--spr-card': CARD,
};

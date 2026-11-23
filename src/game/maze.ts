import { Card } from './cards';
import { Config, initialConfig, stepSymbol, TraceStep } from '../pda/pda';
import { blockMessage, HAND_MAX, MESA_PDA } from '../pda/mesaPda';

export type Dir = 'up' | 'down' | 'left' | 'right';
export const DIRS: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export interface Pt {
  x: number;
  y: number;
}

/**
 * Legenda do mapa (ASCII):
 *   #  parede          .  chão          S  início       P  portal (símbolo c)
 *   a  carta (símbolo a, empilha)        o  carta extra: só aparece com "Colete"
 *   D  porta (símbolo b, entrega o topo da pilha na mão)
 *   T  lixo (símbolo d, descarta o topo da pilha)
 */
export interface LayoutDef {
  id: string;
  name: string;
  tagline: string;
  rows: string[];
}

export interface Slot extends Pt {
  idx: number;
  bonus: boolean;
}

export interface Parsed {
  id: string;
  name: string;
  tagline: string;
  w: number;
  h: number;
  wall: boolean[][];
  start: Pt;
  portal: Pt;
  trash: Pt;
  doors: Pt[];
  slots: Slot[];
  baseSlots: number;
  slotAt: Map<string, number>;
  doorSet: Set<string>;
}

export const key = (x: number, y: number) => `${x},${y}`;

export function parseLayout(def: LayoutDef): Parsed {
  const h = def.rows.length;
  const w = def.rows[0].length;
  const wall: boolean[][] = [];
  let start: Pt | null = null;
  let portal: Pt | null = null;
  let trash: Pt | null = null;
  const doors: Pt[] = [];
  const base: Pt[] = [];
  const bonus: Pt[] = [];
  def.rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`${def.id}: linha ${y} tem ${row.length} colunas, esperado ${w}`);
    wall.push([]);
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      wall[y].push(ch === '#' || ch === ' ');
      if (ch === 'S') start = { x, y };
      else if (ch === 'P') portal = { x, y };
      else if (ch === 'T') trash = { x, y };
      else if (ch === 'D') doors.push({ x, y });
      else if (ch === 'a') base.push({ x, y });
      else if (ch === 'o') bonus.push({ x, y });
      else if (ch !== '#' && ch !== ' ' && ch !== '.') throw new Error(`${def.id}: caractere inválido '${ch}'`);
    }
  });
  if (!start || !portal || !trash) throw new Error(`${def.id}: falta S, P ou T`);
  const slots: Slot[] = [...base.map((p) => ({ ...p, bonus: false })), ...bonus.map((p) => ({ ...p, bonus: true }))].map((s, idx) => ({ ...s, idx }));
  return {
    id: def.id,
    name: def.name,
    tagline: def.tagline,
    w,
    h,
    wall,
    start,
    portal,
    trash,
    doors,
    slots,
    baseSlots: base.length,
    slotAt: new Map(slots.map((s) => [key(s.x, s.y), s.idx])),
    doorSet: new Set(doors.map((d) => key(d.x, d.y))),
  };
}

export const LAYOUTS: LayoutDef[] = [
  {
    id: 'salao',
    name: 'Salão Aberto',
    tagline: 'Espaço livre: pegue o que quiser, entregue em qualquer porta.',
    rows: [
      '###############',
      '#a...a...D...a#',
      '#.###..T..###.#',
      '#...D..a..D...#',
      '#.a..#...#..a.#',
      '#o...#.D.#...o#',
      '#.###..a..###.#',
      '#S...a.....D.P#',
      '###############',
    ],
  },
  {
    id: 'alcovas',
    name: 'Corredor das Alcovas',
    tagline: 'Duas cartas no corredor são obrigatórias; escolha as outras nas alcovas.',
    rows: [
      '###############',
      '##a#D#a#a#D#a##',
      '##T#.#.#.#.#.##',
      '##.#.#.#.#.#.##',
      '#S...a...a.D.P#',
      '##.#.#.#.#.#.##',
      '##.#.#.#.#.#.##',
      '##D#a#o#D#a#o##',
      '###############',
    ],
  },
  {
    id: 'galeria',
    name: 'Galeria dos Pátios',
    tagline: 'Salas conectadas por passagens abertas: escolha seu caminho entre cartas e portas.',
    rows: [
      '###############',
      '#P..a..D..a...#',
      '#.###.T.###...#',
      '#D..a...D..a..#',
      '#...###.......#',
      '#a..D...a..D..#',
      '#...###...###.#',
      '#S..a..D..a..o#',
      '###############',
    ],
  },
  {
    id: 'automato',
    name: 'Sala do Autômato',
    tagline: 'Engrenagens por todo lado: a pilha precisa fechar na hora certa.',
    rows: [
      '###############',
      '##a#D#a#D#a#o##',
      '##T#.#.#.#.#.##',
      '##.#.#.#.#.#.##',
      '#S.a...D.a.a.P#',
      '##.#.#.#.#.#.##',
      '##.#.#.#.#.#.##',
      '##D#a#o#a#D#.##',
      '###############',
    ],
  },
  {
    id: 'vestibulo',
    name: 'Vestíbulo das Portas',
    tagline: 'Corredores amplos e portas distribuídas para facilitar as entregas.',
    rows: [
      '###############',
      '#S.a..D..a..a.#',
      '#.............#',
      '#a..D..a..D..a#',
      '#......T......#',
      '#D..a..D..a..P#',
      '#.............#',
      '#o...........o#',
      '###############',
    ],
  },
  {
    id: 'salafinal',
    name: 'Salão das Muitas Portas',
    tagline: 'Um salão aberto com nove portas: escolha caminhos curtos até o portal.',
    rows: [
      '###############',
      '#S..a..D..a..D#',
      '#......T......#',
      '#D..a..D..a..D#',
      '#.............#',
      '#..a.D..a.D..P#',
      '#.............#',
      '#a..D..a..D..o#',
      '###############',
    ],
  },
];

export const LAYOUT_BY_ID: Record<string, LayoutDef> = Object.fromEntries(LAYOUTS.map((l) => [l.id, l]));
const parsedCache = new Map<string, Parsed>();
export function getLayout(id: string): Parsed {
  let p = parsedCache.get(id);
  if (!p) {
    p = parseLayout(LAYOUT_BY_ID[id]);
    parsedCache.set(id, p);
  }
  return p;
}

// ---------------------------------------------------------------------------
// Percurso (walk): tudo é dado puro e imutável.
// ---------------------------------------------------------------------------

export interface Delivery {
  card: Card;
  /** cartas que ainda estavam empilhadas ABAIXO desta quando ela saiu */
  depthBelow: number;
  door: string;
}

export interface Walk {
  x: number;
  y: number;
  /** configuração do PDA: estado, nº de símbolos lidos e pilha (Z na base) */
  cfg: Config;
  /** cartas na pilha, da base ao topo (cfg.stack.length - 1 elementos) */
  stackCards: Card[];
  /** vaga de origem de cada carta ainda empilhada */
  stackSlots: number[];
  /** todas as cartas empilhadas nesta caminhada, incluindo as descartadas */
  pushedCards: Card[];
  /** índices dos slots já recolhidos (na pilha ou já entregues) */
  picked: number[];
  usedDoors: Record<string, number>;
  delivered: Delivery[];
  script: string;
  trace: TraceStep[];
  maxDepth: number;
  steps: number;
  done: boolean;
}

export function newWalk(p: Parsed): Walk {
  return {
    x: p.start.x,
    y: p.start.y,
    cfg: initialConfig(MESA_PDA),
    stackCards: [],
    stackSlots: [],
    pushedCards: [],
    picked: [],
    usedDoors: {},
    delivered: [],
    script: '',
    trace: [],
    maxDepth: 0,
    steps: 0,
    done: false,
  };
}

export type Symbol3 = 'a' | 'b' | 'c' | 'd';

export interface GameEvent {
  symbol: Symbol3;
  trace: TraceStep;
  slot?: number;
  card?: Card;
  door?: string;
  depthBelow?: number;
}

export type MoveResult =
  | { kind: 'wall' }
  | { kind: 'done' }
  | { kind: 'moved'; walk: Walk; event?: GameEvent }
  | { kind: 'blocked'; symbol: Symbol3; message: string; reason: string };

/** Qual símbolo o jogador dispararia ao pisar em (x, y), ou null se for chão comum. */
export function symbolAt(
  p: Parsed,
  slotCards: (Card | null)[],
  active: number,
  w: Walk,
  x: number,
  y: number,
  trashDiscards = 0,
): Symbol3 | null {
  const k = key(x, y);
  const slot = p.slotAt.get(k);
  if (slot !== undefined && slot < active && slotCards[slot] && !w.picked.includes(slot)) return 'a';
  if (p.doorSet.has(k) && !(k in w.usedDoors)) return 'b';
  if (x === p.trash.x && y === p.trash.y && w.stackCards.length > 0 && trashDiscards > 0) return 'd';
  if (x === p.portal.x && y === p.portal.y) return 'c';
  return null;
}

export function move(p: Parsed, slotCards: (Card | null)[], active: number, w: Walk, dir: Dir, trashDiscards = 0): MoveResult {
  if (w.done) return { kind: 'done' };
  const [dx, dy] = DIRS[dir];
  const nx = w.x + dx;
  const ny = w.y + dy;
  if (nx < 0 || ny < 0 || nx >= p.w || ny >= p.h || p.wall[ny][nx]) return { kind: 'wall' };
  const sym = symbolAt(p, slotCards, active, w, nx, ny, trashDiscards);
  if (!sym) return { kind: 'moved', walk: { ...w, x: nx, y: ny, steps: w.steps + 1 } };

  const r = stepSymbol(MESA_PDA, w.cfg, sym);
  if (!r.ok) return { kind: 'blocked', symbol: sym, message: blockMessage(sym, w.cfg), reason: r.reason };

  const base: Walk = { ...w, x: nx, y: ny, steps: w.steps + 1, cfg: r.next, script: w.script + sym, trace: [...w.trace, r.trace] };
  const k = key(nx, ny);
  if (sym === 'a') {
    const slot = p.slotAt.get(k) as number;
    const card = slotCards[slot] as Card;
    const stackCards = [...w.stackCards, card];
    return {
      kind: 'moved',
      walk: {
        ...base,
        stackCards,
        stackSlots: [...w.stackSlots, slot],
        pushedCards: [...w.pushedCards, card],
        picked: [...w.picked, slot],
        maxDepth: Math.max(w.maxDepth, stackCards.length),
      },
      event: { symbol: 'a', trace: r.trace, slot, card },
    };
  }
  if (sym === 'b') {
    const card = w.stackCards[w.stackCards.length - 1];
    const depthBelow = w.stackCards.length - 1;
    const delivered = [...w.delivered, { card, depthBelow, door: k }];
    return {
      kind: 'moved',
      walk: {
        ...base,
        stackCards: w.stackCards.slice(0, -1),
        stackSlots: w.stackSlots.slice(0, -1),
        delivered,
        usedDoors: { ...w.usedDoors, [k]: delivered.length - 1 },
      },
      event: { symbol: 'b', trace: r.trace, card, door: k, depthBelow },
    };
  }
  if (sym === 'd') {
    const card = w.stackCards[w.stackCards.length - 1];
    const slot = w.stackSlots[w.stackSlots.length - 1];
    return {
      kind: 'moved',
      walk: {
        ...base,
        stackCards: w.stackCards.slice(0, -1),
        stackSlots: w.stackSlots.slice(0, -1),
        picked: w.picked.filter((pickedSlot) => pickedSlot !== slot),
      },
      event: { symbol: 'd', trace: r.trace, slot, card },
    };
  }
  return { kind: 'moved', walk: { ...base, done: true }, event: { symbol: 'c', trace: r.trace } };
}

/** O que o autômato aceitaria agora (usado para acender portas/portal e cartas no mapa). */
export function available(w: Walk): Record<Symbol3, boolean> {
  return {
    a: stepSymbol(MESA_PDA, w.cfg, 'a').ok,
    b: stepSymbol(MESA_PDA, w.cfg, 'b').ok,
    c: stepSymbol(MESA_PDA, w.cfg, 'c').ok,
    d: stepSymbol(MESA_PDA, w.cfg, 'd').ok,
  };
}

/** Beco sem saída: há mais cartas na pilha do que portas/vagas para entregá-las. */
export function isStuck(p: Parsed, w: Walk, trashDiscards = 0): boolean {
  if (w.done) return false;
  const unused = p.doors.filter((d) => !(key(d.x, d.y) in w.usedDoors)).length;
  const room = Math.min(HAND_MAX - w.delivered.length, unused);
  return w.stackCards.length > room && !(trashDiscards > 0 && w.stackCards.length > 0);
}

export function activeSlotCount(p: Parsed, handSize: number): number {
  return Math.max(0, Math.min(p.slots.length, handSize));
}

/** Conteúdo da pilha (cartas, da base ao topo) depois de cada símbolo do roteiro. `pushed` = cartas empilhadas, na ordem. */
export function replayStacks(script: string, pushed: Card[]): Card[][] {
  const out: Card[][] = [];
  let st: Card[] = [];
  let k = 0;
  for (const ch of script) {
    if (ch === 'a') st = [...st, pushed[k++]];
    else if (ch === 'b' || ch === 'd') st = st.slice(0, -1);
    out.push(st);
  }
  return out;
}

/**
 * Menor caminho até (tx, ty) sem pisar em tiles de evento no meio do trajeto
 * (só o destino pode ser um evento). Usado pelo clique no mapa.
 */
export function pathTo(
  p: Parsed,
  slotCards: (Card | null)[],
  active: number,
  w: Walk,
  tx: number,
  ty: number,
  trashDiscards = 0,
): Dir[] | null {
  const prev = new Map<string, { from: string; dir: Dir } | null>([[key(w.x, w.y), null]]);
  const q: Pt[] = [{ x: w.x, y: w.y }];
  const goal = key(tx, ty);
  for (let i = 0; i < q.length; i++) {
    const c = q[i];
    if (key(c.x, c.y) === goal) break;
    for (const dir of Object.keys(DIRS) as Dir[]) {
      const nx = c.x + DIRS[dir][0];
      const ny = c.y + DIRS[dir][1];
      const nk = key(nx, ny);
      if (nx < 0 || ny < 0 || nx >= p.w || ny >= p.h || p.wall[ny][nx] || prev.has(nk)) continue;
      if (nk !== goal && symbolAt(p, slotCards, active, w, nx, ny, trashDiscards)) continue;
      prev.set(nk, { from: key(c.x, c.y), dir });
      q.push({ x: nx, y: ny });
    }
  }
  if (!prev.has(goal)) return null;
  const res: Dir[] = [];
  let cur = goal;
  for (;;) {
    const pr = prev.get(cur);
    if (!pr) break;
    res.push(pr.dir);
    cur = pr.from;
  }
  return res.reverse();
}

import { describe, it, expect } from 'vitest';
import { LAYOUTS, activeSlotCount, getLayout, isStuck, move, newWalk, parseLayout, symbolAt, Walk } from './maze';
import { Card, createDeck, shuffle } from './cards';
import { search } from './solver';
import { MESA_PDA, inMesaLanguage } from '../pda/mesaPda';
import { isAccepting, runPDA, stepSymbol } from '../pda/pda';

const cards = (n: number): Card[] => shuffle(createDeck()).slice(0, n);

describe('mapas', () => {
  it('adiciona mapas abertos e aumenta as portas nos últimos desafios', () => {
    expect(LAYOUTS).toHaveLength(6);
    expect(getLayout('vestibulo').doors.length).toBeGreaterThanOrEqual(5);
    expect(getLayout('salafinal').doors.length).toBeGreaterThanOrEqual(8);
    expect(getLayout('galeria').doors.length).toBeGreaterThanOrEqual(5);
  });
  for (const l of LAYOUTS) {
    it(`${l.id}: estrutura válida (8 cartas base, até 2 extras, portas, S e P conectados)`, () => {
      const p = parseLayout(l);
      expect(p.baseSlots).toBe(8);
      expect(p.slots.length).toBeGreaterThanOrEqual(8);
      expect(p.slots.length).toBeLessThanOrEqual(10);
      expect(p.doors.length).toBeGreaterThanOrEqual(5);
      // conectividade por BFS ignorando eventos
      const seen = new Set<string>([`${p.start.x},${p.start.y}`]);
      const q = [p.start];
      while (q.length) {
        const c = q.shift()!;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const x = c.x + dx, y = c.y + dy;
          if (x < 0 || y < 0 || x >= p.w || y >= p.h || p.wall[y][x] || seen.has(`${x},${y}`)) continue;
          seen.add(`${x},${y}`);
          q.push({ x, y });
        }
      }
      expect(seen.has(`${p.portal.x},${p.portal.y}`)).toBe(true);
      expect(seen.has(`${p.trash.x},${p.trash.y}`)).toBe(true);
      expect(l.rows.flatMap((row) => [...row]).filter((ch) => ch === 'T')).toHaveLength(1);
      for (const s of p.slots) expect(seen.has(`${s.x},${s.y}`)).toBe(true);
      for (const d of p.doors) expect(seen.has(`${d.x},${d.y}`)).toBe(true);
    });
    for (const hs of [8, 9, 10]) {
      it(`${l.id}: tem solução com ${hs} cartas no mapa (sempre, qualquer baralho)`, () => {
        const p = getLayout(l.id);
        for (let k = 0; k < 5; k++) {
          const cs = cards(p.slots.length);
          const r = search(p, cs, activeSlotCount(p, hs), (w) => w.delivered.length, { stopAtFirst: true, budget: 300000 });
          expect(r.best).not.toBeNull();
          // a palavra do percurso pertence à linguagem do PDA
          expect(inMesaLanguage(r.best!.walk.script)).toBe(true);
          expect(runPDA(MESA_PDA, r.best!.walk.script.split('')).accepted).toBe(true);
          expect(isAccepting(MESA_PDA, r.best!.walk.cfg)).toBe(true);
        }
      });
    }
  }
});

describe('motor de percurso', () => {
  const p = getLayout('salao');
  const cs = cards(10);
  it('pisar em carta empilha (a), em porta entrega (b); parede bloqueia', () => {
    let w: Walk = newWalk(p);
    expect(move(p, cs, 8, w, 'left').kind).toBe('wall');
    // caminha até a primeira carta que o solver ache e confere o script
    const r = search(p, cs, 8, (x) => x.delivered.length, { stopAtFirst: true, budget: 100000 });
    expect(r.best!.walk.script.startsWith('a')).toBe(true);
    expect(r.best!.walk.script.endsWith('c')).toBe(true);
    w = r.best!.walk;
    expect(w.done).toBe(true);
    expect(w.stackCards).toHaveLength(0);
    expect(w.delivered.length).toBeGreaterThanOrEqual(1);
    expect(move(p, cs, 8, w, 'up').kind).toBe('done');
  });
  it('o autômato bloqueia: porta sem carta na pilha / portal com pilha cheia', () => {
    const w = newWalk(p);
    // teleporta o jogador para junto da primeira porta
    const d = p.doors[0];
    const near = { ...w, x: d.x - 1, y: d.y };
    const r = move(p, cs, 8, near, 'right');
    if (r.kind === 'blocked') {
      expect(r.symbol).toBe('b');
      expect(r.message.length).toBeGreaterThan(5);
    } else {
      // pode haver parede à esquerda/direita; tenta outras direções
      const rs = (['up', 'down', 'left', 'right'] as const).map((dd) => move(p, cs, 8, near, dd)).find((x) => x.kind === 'blocked');
      expect(rs).toBeTruthy();
    }
    const pt = { ...w, x: p.portal.x - 1, y: p.portal.y };
    const rp = move(p, cs, 8, pt, 'right');
    expect(rp.kind).toBe('blocked'); // nada entregue ainda: portal exige ≥1 entrega
  });
  it('símbolos por tile', () => {
    const w = newWalk(p);
    expect(symbolAt(p, cs, 8, w, p.portal.x, p.portal.y)).toBe('c');
    expect(symbolAt(p, cs, 8, w, p.doors[0].x, p.doors[0].y)).toBe('b');
    expect(symbolAt(p, cs, 8, w, p.slots[0].x, p.slots[0].y)).toBe('a');
    expect(symbolAt(p, cs, 8, w, p.trash.x, p.trash.y, 1)).toBeNull();
    expect(symbolAt(p, cs, 8, w, p.start.x, p.start.y)).toBeNull();
    expect(isStuck(p, w)).toBe(false);
  });
  it('o lixo lê d, remove o topo sem entregar e libera a vaga da carta descartada', () => {
    const pushed = stepSymbol(MESA_PDA, newWalk(p).cfg, 'a');
    expect(pushed.ok).toBe(true);
    if (!pushed.ok) return;
    const w: Walk = {
      ...newWalk(p),
      x: p.trash.x - 1,
      y: p.trash.y,
      cfg: pushed.next,
      stackCards: [cs[0]],
      stackSlots: [0],
      pushedCards: [cs[0]],
      picked: [0],
      script: 'a',
      trace: [pushed.trace],
      maxDepth: 1,
    };
    const r = move(p, cs, 8, w, 'right', 1);
    expect(r.kind).toBe('moved');
    if (r.kind !== 'moved') return;
    expect(r.event?.symbol).toBe('d');
    expect(r.walk.stackCards).toHaveLength(0);
    expect(r.walk.stackSlots).toHaveLength(0);
    expect(r.walk.delivered).toHaveLength(0);
    expect(r.walk.picked).toHaveLength(0);
    expect(r.walk.script).toBe('ad');
  });
});

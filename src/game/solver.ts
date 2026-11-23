import { Card } from './cards';
import { Dir, DIRS, GameEvent, isStuck, key, move, newWalk, Parsed, Walk } from './maze';

const DIR_LIST: Dir[] = ['up', 'down', 'left', 'right'];

export interface Candidate {
  dirs: Dir[];
  walk: Walk;
  event: GameEvent;
}

/**
 * Próximos eventos alcançáveis a partir de `w`: caminha por chão comum (BFS) e
 * devolve cada tile de evento (carta, porta, portal) que o autômato aceita.
 */
export function legs(p: Parsed, cards: (Card | null)[], active: number, w: Walk): Candidate[] {
  const prev = new Map<string, { from: string; dir: Dir } | null>([[key(w.x, w.y), null]]);
  const queue: { x: number; y: number }[] = [{ x: w.x, y: w.y }];
  const seenEvt = new Set<string>();
  const out: Candidate[] = [];
  const pathTo = (k: string): Dir[] => {
    const res: Dir[] = [];
    let cur: string | undefined = k;
    for (;;) {
      const pr = prev.get(cur as string);
      if (!pr) break;
      res.push(pr.dir);
      cur = pr.from;
    }
    return res.reverse();
  };
  for (let qi = 0; qi < queue.length; qi++) {
    const c = queue[qi];
    const cw: Walk = { ...w, x: c.x, y: c.y };
    for (const dir of DIR_LIST) {
      const r = move(p, cards, active, cw, dir);
      if (r.kind !== 'moved') continue;
      const nk = key(r.walk.x, r.walk.y);
      if (!r.event) {
        if (!prev.has(nk)) {
          prev.set(nk, { from: key(c.x, c.y), dir });
          queue.push({ x: r.walk.x, y: r.walk.y });
        }
      } else if (!seenEvt.has(nk)) {
        seenEvt.add(nk);
        const dirs = [...pathTo(key(c.x, c.y)), dir];
        out.push({ dirs, walk: { ...r.walk, steps: w.steps + dirs.length }, event: r.event });
      }
    }
  }
  return out;
}

export interface SearchResult {
  best: { score: number; walk: Walk; dirs: Dir[] } | null;
  nodes: number;
  /** true se a busca terminou sem estourar o orçamento (resultado exato) */
  exhausted: boolean;
  /** índices de slots que apareceram em alguma mão completa */
  coveredSlots: Set<number>;
  completed: number;
}

export interface SearchOpts {
  budget?: number;
  stopAtFirst?: boolean;
  /** além do score, registra os slots entregues (para testar cobertura) */
  trackCoverage?: boolean;
}

function memoKey(w: Walk): string {
  const del = w.delivered.map((d) => `${d.card.id}${d.card.enh === 'deep' ? ':' + d.depthBelow : ''}`).sort().join(',');
  return `${w.x},${w.y}|${[...w.picked].sort((a, b) => a - b).join(',')}|${w.stackCards.map((c) => c.id).join(',')}|${del}|${w.maxDepth}|${Object.keys(w.usedDoors).sort().join(';')}`;
}

/** Procura percursos completos (até o portal) e devolve o de maior `score`. */
export function search(p: Parsed, cards: (Card | null)[], active: number, score: (w: Walk) => number, opts: SearchOpts = {}): SearchResult {
  const budget = opts.budget ?? 60000;
  const seen = new Set<string>();
  let nodes = 0;
  let completed = 0;
  let stop = false;
  let best: SearchResult['best'] = null;
  const covered = new Set<number>();

  const dfs = (w: Walk, dirs: Dir[]) => {
    if (stop) return;
    if (nodes++ >= budget) {
      stop = true;
      return;
    }
    const k = memoKey(w);
    if (seen.has(k)) return;
    seen.add(k);
    for (const c of legs(p, cards, active, w)) {
      if (stop) return;
      const nd = dirs.concat(c.dirs);
      if (c.walk.done) {
        completed++;
        const s = score(c.walk);
        if (!best || s > best.score) best = { score: s, walk: c.walk, dirs: nd };
        if (opts.trackCoverage) for (const sl of c.walk.picked) covered.add(sl);
        if (opts.stopAtFirst) {
          stop = true;
          return;
        }
        continue;
      }
      if (isStuck(p, c.walk)) continue;
      dfs(c.walk, nd);
    }
  };
  dfs(newWalk(p), []);
  return { best, nodes, exhausted: !stop, coveredSlots: covered, completed };
}

export function dirsToKeys(dirs: Dir[]): string[] {
  return dirs.map((d) => ({ up: 'w', down: 's', left: 'a', right: 'd' })[d]);
}

export { DIRS };

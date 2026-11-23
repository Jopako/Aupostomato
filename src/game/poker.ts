import { Card } from './cards';

export type HandType =
  | 'high'
  | 'pair'
  | 'twoPair'
  | 'three'
  | 'straight'
  | 'flush'
  | 'fullHouse'
  | 'four'
  | 'straightFlush';

export const HAND_TYPES: HandType[] = [
  'high', 'pair', 'twoPair', 'three', 'straight', 'flush', 'fullHouse', 'four', 'straightFlush',
];

export const HAND_NAME: Record<HandType, string> = {
  high: 'Carta Alta',
  pair: 'Par',
  twoPair: 'Dois Pares',
  three: 'Trinca',
  straight: 'Sequência',
  flush: 'Flush',
  fullHouse: 'Full House',
  four: 'Quadra',
  straightFlush: 'Sequência do mesmo naipe',
};

/** [fichas, mult] no nível 1 */
export const HAND_BASE: Record<HandType, [number, number]> = {
  high: [5, 1],
  pair: [10, 2],
  twoPair: [20, 2],
  three: [30, 3],
  straight: [30, 4],
  flush: [35, 4],
  fullHouse: [40, 4],
  four: [60, 7],
  straightFlush: [100, 8],
};

/** ganho por nível adicional [fichas, mult] */
export const HAND_LEVEL_GAIN: Record<HandType, [number, number]> = {
  high: [10, 1],
  pair: [15, 1],
  twoPair: [20, 1],
  three: [20, 2],
  straight: [30, 3],
  flush: [15, 2],
  fullHouse: [25, 2],
  four: [30, 3],
  straightFlush: [40, 4],
};

export function handValue(type: HandType, level: number): [number, number] {
  const [c, m] = HAND_BASE[type];
  const [gc, gm] = HAND_LEVEL_GAIN[type];
  return [c + gc * (level - 1), m + gm * (level - 1)];
}

export interface Evaluation {
  type: HandType;
  /** cartas que efetivamente pontuam (subconjunto de `cards`) */
  scoring: Card[];
}

function isStraight(ranks: number[]): boolean {
  if (ranks.length !== 5) return false;
  const s = Array.from(new Set(ranks)).sort((a, b) => a - b);
  if (s.length !== 5) return false;
  if (s[4] - s[0] === 4) return true;
  // A-2-3-4-5
  return s.join(',') === '2,3,4,5,14';
}

export function evaluate(cards: Card[]): Evaluation {
  if (cards.length === 0) return { type: 'high', scoring: [] };
  const byRank = new Map<number, Card[]>();
  for (const c of cards) {
    const g = byRank.get(c.rank) ?? [];
    g.push(c);
    byRank.set(c.rank, g);
  }
  const groups = Array.from(byRank.values()).sort((a, b) => b.length - a.length || b[0].rank - a[0].rank);
  const counts = groups.map((g) => g.length);
  const flush = cards.length === 5 && cards.every((c) => c.suit === cards[0].suit);
  const straight = isStraight(cards.map((c) => c.rank));

  if (straight && flush) return { type: 'straightFlush', scoring: cards.slice() };
  if (counts[0] === 4) return { type: 'four', scoring: groups[0] };
  if (counts[0] === 3 && counts[1] === 2) return { type: 'fullHouse', scoring: cards.slice() };
  if (flush) return { type: 'flush', scoring: cards.slice() };
  if (straight) return { type: 'straight', scoring: cards.slice() };
  if (counts[0] === 3) return { type: 'three', scoring: groups[0] };
  if (counts[0] === 2 && counts[1] === 2) return { type: 'twoPair', scoring: [...groups[0], ...groups[1]] };
  if (counts[0] === 2) return { type: 'pair', scoring: groups[0] };
  const top = cards.slice().sort((a, b) => b.rank - a.rank)[0];
  return { type: 'high', scoring: [top] };
}

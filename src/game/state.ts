import { Card, createDeck, Enhancement, Rng, shuffle } from './cards';
import { HAND_TYPES, HandType } from './poker';
import { MetaBonuses } from './match';

export type SceneId = 'rua' | 'beco' | 'salao' | 'servico' | 'escritorio';

export interface Story {
  scene: SceneId;
  flags: Record<string, boolean>;
  items: string[];
}

export interface RunStats {
  tablesWon: number;
  handsPlayed: number;
  pdaAccepts: number;
  bestHand: number;
}

export type Offer =
  | { kind: 'relic'; id: string; price: number; sold?: boolean }
  | { kind: 'hand'; hand: HandType; price: number; sold?: boolean }
  | { kind: 'stamp'; enh: Enhancement; price: number; sold?: boolean };

export interface ShopState {
  offers: Offer[];
  rerolls: number;
  removeUsed: boolean;
  cloneUsed: boolean;
}

export interface Run {
  money: number;
  debt: number;
  loan: number;
  deck: Card[];
  nextCardId: number;
  relics: string[];
  handLevels: Record<HandType, number>;
  tableIndex: number; // próxima mesa a enfrentar (0..7)
  cobrancaDone: boolean;
  stats: RunStats;
  shop: ShopState | null;
}

export interface Meta {
  gold: number;
  upgrades: Record<string, number>;
  runs: number;
  wins: number;
  endings: string[];
  enteredOnce: boolean;
  clues: string[];
  bestTable: number;
  discovered: string[];
}

export function defaultMeta(): Meta {
  return { gold: 0, upgrades: {}, runs: 0, wins: 0, endings: [], enteredOnce: false, clues: [], bestTable: 0, discovered: [] };
}

export function defaultStory(): Story {
  return { scene: 'rua', flags: {}, items: [] };
}

// ---------- meta-upgrades (persistem entre tentativas) ----------

export interface MetaUpgrade {
  id: string;
  name: string;
  desc: string;
  max: number;
  costs: number[];
}

export const META_UPGRADES: MetaUpgrade[] = [
  { id: 'mao', name: 'Mão Extra', desc: '+1 mão em todas as mesas.', max: 1, costs: [14] },
  { id: 'descarte', name: 'Descarte Extra', desc: '+1 descarte em todas as mesas.', max: 1, costs: [10] },
  { id: 'colete', name: 'Colete Emprestado', desc: '+1 carta no mapa.', max: 1, costs: [16] },
  { id: 'sapato', name: 'Dinheiro no Sapato', desc: 'Começa cada tentativa com +$60 por nível.', max: 3, costs: [5, 8, 12] },
  { id: 'marcado', name: 'Baralho Marcado', desc: 'Começa com 3 cartas carimbadas aleatórias.', max: 1, costs: [12] },
  { id: 'labia', name: 'Lábia com o Agiota', desc: 'Juros do empréstimo -10 pontos percentuais por nível.', max: 2, costs: [8, 12] },
];

export function metaLevel(meta: Meta, id: string): number {
  return meta.upgrades[id] ?? 0;
}

export function metaBonuses(meta: Meta): MetaBonuses {
  return {
    hands: metaLevel(meta, 'mao'),
    discards: metaLevel(meta, 'descarte'),
    handSize: metaLevel(meta, 'colete'),
  };
}

export function metaUpgradeCost(meta: Meta, u: MetaUpgrade): number | null {
  const lv = metaLevel(meta, u.id);
  return lv >= u.max ? null : u.costs[lv];
}

export function buyMetaUpgrade(meta: Meta, id: string): Meta | null {
  const u = META_UPGRADES.find((x) => x.id === id);
  if (!u) return null;
  const cost = metaUpgradeCost(meta, u);
  if (cost === null || meta.gold < cost) return null;
  return { ...meta, gold: meta.gold - cost, upgrades: { ...meta.upgrades, [id]: metaLevel(meta, id) + 1 } };
}

// ---------- empréstimo e nova tentativa ----------

export interface LoanOption {
  amount: number;
  rate: number;
}

export const LOAN_OPTIONS: LoanOption[] = [
  { amount: 300, rate: 0.5 },
  { amount: 500, rate: 0.7 },
  { amount: 800, rate: 0.9 },
];

export function loanDebt(opt: LoanOption, meta: Meta): number {
  const rate = Math.max(0.2, opt.rate - 0.1 * metaLevel(meta, 'labia'));
  return Math.ceil(opt.amount * (1 + rate));
}

export function initialHandLevels(): Record<HandType, number> {
  return Object.fromEntries(HAND_TYPES.map((h) => [h, 1])) as Record<HandType, number>;
}

const STAMPS: Enhancement[] = ['chip', 'mult', 'deep', 'gold'];

export function newRun(opt: LoanOption, meta: Meta, rng: Rng = Math.random): Run {
  let deck = createDeck(1);
  if (metaLevel(meta, 'marcado') > 0) {
    const picks = shuffle(deck, rng).slice(0, 3).map((c) => c.id);
    deck = deck.map((c) => (picks.includes(c.id) ? { ...c, enh: STAMPS[Math.floor(rng() * STAMPS.length)] } : c));
  }
  return {
    money: opt.amount + 60 * metaLevel(meta, 'sapato'),
    debt: loanDebt(opt, meta),
    loan: opt.amount,
    deck,
    nextCardId: 100,
    relics: [],
    handLevels: initialHandLevels(),
    tableIndex: 0,
    cobrancaDone: false,
    stats: { tablesWon: 0, handsPlayed: 0, pdaAccepts: 0, bestHand: 0 },
    shop: null,
  };
}

/** Fichas Douradas ganhas ao fim de uma tentativa (vitória ou derrota). */
export function runGold(run: Run, won: boolean): number {
  return 1 + 2 * run.stats.tablesWon + (won ? 15 : 0);
}

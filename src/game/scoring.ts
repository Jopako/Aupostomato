import { Card, cardChips, rankLabel, Rng, SUIT_GLYPH } from './cards';
import { evaluate, handValue, HandType } from './poker';
import { OpponentRules } from './opponents';
import { Effect, RELIC_BY_ID, RelicCtx } from './relics';

export interface ScoreInput {
  /** cartas entregues nas portas, na ordem de entrega */
  played: Card[];
  /** quantas cartas ainda estavam empilhadas embaixo de cada carta (id → n) quando ela foi entregue */
  depthBelow: Record<number, number>;
  /** profundidade máxima da pilha durante o percurso */
  maxDepth: number;
  /** palavra lida pelo PDA (a=empilhar, b=entregar, c=portal) */
  script: string;
  handLevels: Record<HandType, number>;
  relics: string[];
  rules: OpponentRules;
  firstHand: boolean;
  handsLeftAfter: number;
  inDebt: boolean;
  deckRemaining: number;
  lastHandType: HandType | null;
  rng?: Rng;
}

export type EventKind = 'base' | 'card' | 'debuff' | 'pda-pop' | 'relic' | 'pda-accept' | 'rule';

export interface ScoreEvent {
  kind: EventKind;
  label: string;
  chips?: number;
  mult?: number;
  xmult?: number;
  money?: number;
  cardId?: number;
}

export interface ScoreResult {
  handType: HandType;
  scoring: Card[];
  events: ScoreEvent[];
  chips: number;
  mult: number;
  total: number;
  money: number;
  pops: number;
  maxDepth: number;
  /** multiplicador de profundidade aplicado (1 se nenhum) */
  depthX: number;
  word: string;
}

export const POP_CHIPS = 10;
export const GOLD_MONEY = 20;
export const CHIP_ENH = 30;
export const MULT_ENH = 4;
export const DEEP_MULT = 3;
/** multiplicador de profundidade = 1 + DEPTH_STEP × (pilha máxima) + bônus de relíquias */
export const DEPTH_STEP = 0.5;

export function sumRelics<K extends 'hands' | 'discards' | 'handSize' | 'popChips' | 'pdaBonus' | 'endMoney'>(
  ids: string[],
  key: K,
): number {
  return ids.reduce((a, id) => a + ((RELIC_BY_ID[id]?.[key] as number | undefined) ?? 0), 0);
}

function isDebuffed(c: Card, rules: OpponentRules): boolean {
  if (rules.debuffSuits?.includes(c.suit)) return true;
  if (rules.debuffFaces && c.rank >= 11 && c.rank <= 13) return true;
  return false;
}

export function scoreHand(input: ScoreInput): ScoreResult {
  const rng = input.rng ?? Math.random;
  const { played, rules } = input;
  const ev = evaluate(played);
  const events: ScoreEvent[] = [];
  const level = input.handLevels[ev.type] ?? 1;
  const [baseChips, baseMult] = handValue(ev.type, level);
  let chips = baseChips;
  let mult = baseMult;
  let money = 0;
  events.push({ kind: 'base', label: `Nv.${level}`, chips: baseChips, mult: baseMult });

  const pops = played.length;
  const maxDepth = input.maxDepth;

  const ctx: RelicCtx = {
    played,
    scoring: ev.scoring,
    handType: ev.type,
    maxDepth,
    pops,
    handsLeft: input.handsLeftAfter,
    firstHand: input.firstHand,
    inDebt: input.inDebt,
    deckRemaining: input.deckRemaining,
    rng,
  };

  // 1) cartas que pontuam, na ordem jogada
  for (const c of played) {
    if (!ev.scoring.some((s) => s.id === c.id)) continue;
    const label = `${rankLabel(c.rank)}${SUIT_GLYPH[c.suit]}`;
    if (isDebuffed(c, rules)) {
      events.push({ kind: 'debuff', label: `${label} sem efeito`, cardId: c.id });
      continue;
    }
    let dc = cardChips(c);
    let dm = 0;
    let dmoney = 0;
    if (c.enh === 'chip') dc += CHIP_ENH;
    if (c.enh === 'mult') dm += MULT_ENH;
    if (c.enh === 'gold') dmoney += GOLD_MONEY;
    if (c.enh === 'deep') dm += DEEP_MULT * (input.depthBelow[c.id] ?? 0);
    for (const rid of input.relics) {
      const e: Effect | null | undefined = RELIC_BY_ID[rid]?.onCard?.(c, ctx);
      if (e) {
        dc += e.chips ?? 0;
        dm += e.mult ?? 0;
        dmoney += e.money ?? 0;
      }
    }
    chips += dc;
    mult += dm;
    money += dmoney;
    events.push({ kind: 'card', label, chips: dc, mult: dm || undefined, money: dmoney || undefined, cardId: c.id });
  }

  // 2) PDA: cada POP bem-sucedido rende fichas, mesmo se a palavra for rejeitada
  const half = !!rules.pdaHalf;
  if (pops > 0) {
    const per = Math.floor(((POP_CHIPS + sumRelics(input.relics, 'popChips')) * (half ? 0.5 : 1)));
    const gain = per * pops;
    chips += gain;
    events.push({ kind: 'pda-pop', label: `PDA: ${pops} POP × ${per}`, chips: gain });
  }

  // 3) relíquias de mão, na ordem dos slots
  for (const rid of input.relics) {
    const r = RELIC_BY_ID[rid];
    const e = r?.onHand?.(ctx);
    if (!e) continue;
    if (e.chips) chips += e.chips;
    if (e.mult) mult += e.mult;
    if (e.xmult) mult *= e.xmult;
    if (e.money) money += e.money;
    events.push({ kind: 'relic', label: r.name, chips: e.chips, mult: e.mult, xmult: e.xmult, money: e.money });
  }

  // 4) o PDA aceitou (chegou ao portal): multiplicador de profundidade da pilha
  let depthX = 1 + DEPTH_STEP * maxDepth + sumRelics(input.relics, 'pdaBonus');
  if (half) depthX = 1 + (depthX - 1) / 2;
  mult *= depthX;
  events.push({ kind: 'pda-accept', label: `PDA aceita ${input.script || 'ε'} · pilha máx. ${maxDepth}`, xmult: depthX });

  // 5) regras do adversário sobre o total
  let factor = 1;
  if (rules.firstHandHalf && input.firstHand) {
    factor *= 0.5;
    events.push({ kind: 'rule', label: 'A Casa: 1ª mão pela metade', xmult: 0.5 });
  }
  if (rules.noRepeatHand && input.lastHandType === ev.type) {
    factor *= 0.5;
    events.push({ kind: 'rule', label: 'Memória de Elefante: mão repetida', xmult: 0.5 });
  }

  const total = Math.floor(chips * mult * factor);
  return { handType: ev.type, scoring: ev.scoring, events, chips, mult, total, money, pops, maxDepth, depthX, word: input.script };
}

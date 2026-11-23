import { Card, Rng, shuffle } from './cards';
import { HandType } from './poker';
import { OpponentDef, OpponentRules } from './opponents';
import { scoreHand, ScoreResult, sumRelics } from './scoring';
import { getLayout, Walk } from './maze';

export const BASE_HANDS = 4;
export const BASE_DISCARDS = 3;
export const BASE_TRASH_DISCARDS = 4;
export const BASE_HAND_SIZE = 8;
export const MAX_PLAY = 5;
export const HAND_LEFT_BONUS = 15;

export interface MetaBonuses {
  hands: number;
  discards: number;
  handSize: number;
}

export interface MatchConfig {
  opponent: OpponentDef;
  rules: OpponentRules;
  deck: Card[];
  relics: string[];
  handLevels: Record<HandType, number>;
  inDebt: boolean;
  bonuses: MetaBonuses;
}

export interface MatchState {
  opponentId: string;
  rules: OpponentRules;
  target: number;
  reward: number;
  score: number;
  handsLeft: number;
  discardsLeft: number;
  trashDiscardsLeft: number;
  handSize: number;
  layoutId: string;
  drawPile: Card[];
  /** cartas espalhadas no mapa, uma por vaga ativa (índice = índice da vaga) */
  hand: Card[];
  discardPile: Card[];
  firstHand: boolean;
  lastHandType: HandType | null;
  handsPlayed: number;
  goldEarned: number;
  status: 'playing' | 'won' | 'lost';
  relics: string[];
  handLevels: Record<HandType, number>;
  inDebt: boolean;
  bestHand: number;
  pdaAccepts: number;
}

export function matchLimits(cfg: Pick<MatchConfig, 'relics' | 'rules' | 'bonuses'>) {
  const hands = Math.max(1, BASE_HANDS + sumRelics(cfg.relics, 'hands') + cfg.bonuses.hands - (cfg.rules.handsMinus ?? 0));
  const discards = Math.max(0, BASE_DISCARDS + sumRelics(cfg.relics, 'discards') + cfg.bonuses.discards - (cfg.rules.discardsMinus ?? 0));
  const handSize = Math.max(
    MAX_PLAY,
    BASE_HAND_SIZE + sumRelics(cfg.relics, 'handSize') + cfg.bonuses.handSize - (cfg.rules.handSizeMinus ?? 0),
  );
  return { hands, discards, handSize };
}

/** Nº de cartas efetivamente colocadas no mapa (limitado pelas vagas do mapa). */
export function dealSize(layoutId: string, handSize: number): number {
  return Math.min(handSize, getLayout(layoutId).slots.length);
}

/** Tira `size` cartas do monte; se faltar, reembaralha o descarte no monte. */
function deal(drawPile: Card[], discardPile: Card[], size: number, rng: Rng): { drawPile: Card[]; discardPile: Card[]; hand: Card[] } {
  let dp = drawPile;
  let dc = discardPile;
  if (dp.length < size) {
    dp = [...dp, ...shuffle(dc, rng)];
    dc = [];
  }
  return { hand: dp.slice(0, size), drawPile: dp.slice(size), discardPile: dc };
}

export function startMatch(cfg: MatchConfig, rng: Rng = Math.random): MatchState {
  const lim = matchLimits(cfg);
  const shuffled = shuffle(cfg.deck, rng);
  const layoutId = cfg.opponent.layout;
  const d = deal(shuffled, [], dealSize(layoutId, lim.handSize), rng);
  return {
    opponentId: cfg.opponent.id,
    rules: cfg.rules,
    target: cfg.opponent.target,
    reward: cfg.opponent.reward,
    score: 0,
    handsLeft: lim.hands,
    discardsLeft: lim.discards,
    trashDiscardsLeft: BASE_TRASH_DISCARDS,
    handSize: lim.handSize,
    layoutId,
    drawPile: d.drawPile,
    hand: d.hand,
    discardPile: d.discardPile,
    firstHand: true,
    lastHandType: null,
    handsPlayed: 0,
    goldEarned: 0,
    status: 'playing',
    relics: cfg.relics,
    handLevels: cfg.handLevels,
    inDebt: cfg.inDebt,
    bestHand: 0,
    pdaAccepts: 0,
  };
}

/**
 * Fecha uma rodada: o jogador chegou ao portal (PDA aceitou) com as cartas entregues em `walk`.
 * Todas as cartas do mapa vão para o descarte e um novo mapa é montado.
 */
export function playRound(m: MatchState, walk: Walk, rng: Rng = Math.random): { state: MatchState; result: ScoreResult } {
  if (m.status !== 'playing') throw new Error('mesa encerrada');
  if (m.handsLeft <= 0) throw new Error('sem mãos');
  if (!walk.done) throw new Error('o PDA ainda não aceitou (chegue ao portal)');
  const played = walk.delivered.map((d) => d.card);
  if (played.length < 1 || played.length > MAX_PLAY) throw new Error('entregue de 1 a 5 cartas');
  const depthBelow: Record<number, number> = {};
  for (const d of walk.delivered) depthBelow[d.card.id] = d.depthBelow;
  const handsLeftAfter = m.handsLeft - 1;
  const result = scoreHand({
    played,
    depthBelow,
    maxDepth: walk.maxDepth,
    script: walk.script,
    handLevels: m.handLevels,
    relics: m.relics,
    rules: m.rules,
    firstHand: m.firstHand,
    handsLeftAfter,
    inDebt: m.inDebt,
    deckRemaining: m.drawPile.length,
    lastHandType: m.lastHandType,
    rng,
  });
  const score = m.score + result.total;
  let status: MatchState['status'] = 'playing';
  if (score >= m.target) status = 'won';
  else if (handsLeftAfter <= 0) status = 'lost';
  let discardPile = [...m.discardPile, ...m.hand];
  let drawPile = m.drawPile;
  let hand: Card[] = [];
  if (status === 'playing') {
    const d = deal(drawPile, discardPile, dealSize(m.layoutId, m.handSize), rng);
    drawPile = d.drawPile;
    discardPile = d.discardPile;
    hand = d.hand;
  }
  return {
    result,
    state: {
      ...m,
      score,
      handsLeft: handsLeftAfter,
      hand,
      drawPile,
      discardPile,
      firstHand: false,
      lastHandType: result.handType,
      handsPlayed: m.handsPlayed + 1,
      goldEarned: m.goldEarned + result.money,
      status,
      bestHand: Math.max(m.bestHand, result.total),
      pdaAccepts: m.pdaAccepts + 1,
    },
  };
}

/** "Descartar" = embaralhar um mapa novo (gasta 1 descarte). O percurso atual é reiniciado pela interface. */
export function redeal(m: MatchState, rng: Rng = Math.random): MatchState {
  if (m.status !== 'playing') throw new Error('mesa encerrada');
  if (m.discardsLeft <= 0) throw new Error('sem descartes');
  const d = deal(m.drawPile, [...m.discardPile, ...m.hand], dealSize(m.layoutId, m.handSize), rng);
  return { ...m, discardsLeft: m.discardsLeft - 1, hand: d.hand, drawPile: d.drawPile, discardPile: d.discardPile };
}

/** Descarta uma carta do mapa e repõe sua vaga, consumindo um descarte da mesa. */
export function discardMapCard(m: MatchState, slot: number, rng: Rng = Math.random): MatchState {
  if (m.status !== 'playing') throw new Error('mesa encerrada');
  if (m.trashDiscardsLeft <= 0) throw new Error('sem descartes de carta');
  const discarded = m.hand[slot];
  if (!discarded) throw new Error('carta do mapa inválida');

  let drawPile = m.drawPile.slice();
  let discardPile = m.discardPile.slice();
  if (drawPile.length === 0) {
    drawPile = shuffle(discardPile, rng);
    discardPile = [];
  }
  const replacement = drawPile.shift();
  if (!replacement) throw new Error('não há cartas disponíveis para reposição');

  const hand = m.hand.slice();
  hand[slot] = replacement;
  discardPile.push(discarded);
  return {
    ...m,
    hand,
    drawPile,
    discardPile,
    trashDiscardsLeft: m.trashDiscardsLeft - 1,
  };
}

export function matchPayout(m: MatchState): { base: number; handsBonus: number; gold: number; relics: number; total: number } {
  const handsBonus = m.handsLeft * HAND_LEFT_BONUS;
  const relics = sumRelics(m.relics, 'endMoney');
  return { base: m.reward, handsBonus, gold: m.goldEarned, relics, total: m.reward + handsBonus + m.goldEarned + relics };
}

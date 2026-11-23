import { describe, it, expect } from 'vitest';
import { Card, createDeck, shuffle } from './cards';
import { evaluate, handValue } from './poker';
import { scoreHand } from './scoring';
import { dealSize, matchLimits, matchPayout, playRound, redeal, startMatch } from './match';
import { search } from './solver';
import { activeSlotCount, getLayout, Walk } from './maze';
import { OPPONENTS, effectiveRules } from './opponents';
import { createQuickStart } from './quickStart';
import { initialHandLevels, LOAN_OPTIONS, newRun, defaultMeta, buyMetaUpgrade, loanDebt } from './state';
import { buyHandUpgrade, buyRelic, cloneCard, generateShop, removeCard, sellRelic, buyStamp } from './shop';

let nid = 1000;
const mk = (rank: number, suit: Card['suit'], enh?: Card['enh']): Card => ({ id: nid++, rank, suit, enh });

describe('início rápido', () => {
  it('começa no salão com o menor empréstimo e destaca a primeira mesa', () => {
    const ctx = createQuickStart();
    expect(ctx.story.scene).toBe('salao');
    expect(ctx.story.flags.table_guidance).toBe(true);
    expect(ctx.run?.loan).toBe(300);
    expect(ctx.run?.money).toBe(300);
    expect(ctx.run?.debt).toBe(450);
    expect(ctx.meta.runs).toBe(1);
    expect(ctx.meta.enteredOnce).toBe(true);
  });
});

const base = (played: Card[], extra: Partial<Parameters<typeof scoreHand>[0]> = {}) =>
  scoreHand({
    played,
    depthBelow: {},
    maxDepth: 1,
    script: 'abc',
    handLevels: initialHandLevels(),
    relics: [],
    rules: {},
    firstHand: false,
    handsLeftAfter: 2,
    inDebt: false,
    deckRemaining: 30,
    lastHandType: null,
    rng: () => 0.5,
    ...extra,
  });

describe('avaliação de mãos', () => {
  it('reconhece cada tipo', () => {
    expect(evaluate([mk(2, 'H'), mk(5, 'D'), mk(9, 'S'), mk(11, 'C'), mk(13, 'H')]).type).toBe('high');
    expect(evaluate([mk(5, 'H'), mk(5, 'D'), mk(9, 'S')]).type).toBe('pair');
    expect(evaluate([mk(5, 'H'), mk(5, 'D'), mk(9, 'S'), mk(9, 'C')]).type).toBe('twoPair');
    expect(evaluate([mk(5, 'H'), mk(5, 'D'), mk(5, 'S')]).type).toBe('three');
    expect(evaluate([mk(5, 'H'), mk(6, 'D'), mk(7, 'S'), mk(8, 'C'), mk(9, 'H')]).type).toBe('straight');
    expect(evaluate([mk(14, 'H'), mk(2, 'D'), mk(3, 'S'), mk(4, 'C'), mk(5, 'H')]).type).toBe('straight');
    expect(evaluate([mk(10, 'H'), mk(11, 'D'), mk(12, 'S'), mk(13, 'C'), mk(14, 'H')]).type).toBe('straight');
    expect(evaluate([mk(2, 'H'), mk(5, 'H'), mk(9, 'H'), mk(11, 'H'), mk(13, 'H')]).type).toBe('flush');
    expect(evaluate([mk(5, 'H'), mk(5, 'D'), mk(5, 'S'), mk(9, 'C'), mk(9, 'H')]).type).toBe('fullHouse');
    expect(evaluate([mk(5, 'H'), mk(5, 'D'), mk(5, 'S'), mk(5, 'C')]).type).toBe('four');
    expect(evaluate([mk(5, 'H'), mk(6, 'H'), mk(7, 'H'), mk(8, 'H'), mk(9, 'H')]).type).toBe('straightFlush');
  });
  it('só 5 cartas formam sequência/flush; K-A-2-3-4 não é sequência', () => {
    expect(evaluate([mk(5, 'H'), mk(6, 'D'), mk(7, 'S'), mk(8, 'C')]).type).toBe('high');
    expect(evaluate([mk(13, 'H'), mk(14, 'D'), mk(2, 'S'), mk(3, 'C'), mk(4, 'H')]).type).toBe('high');
  });
  it('cartas que pontuam', () => {
    expect(evaluate([mk(5, 'H'), mk(5, 'D'), mk(9, 'S')]).scoring).toHaveLength(2);
    expect(evaluate([mk(5, 'H'), mk(5, 'D'), mk(9, 'S'), mk(9, 'C'), mk(2, 'S')]).scoring).toHaveLength(4);
    expect(evaluate([mk(2, 'H'), mk(14, 'D')]).scoring.map((c) => c.rank)).toEqual([14]);
  });
  it('níveis de mão', () => {
    expect(handValue('pair', 1)).toEqual([10, 2]);
    expect(handValue('pair', 3)).toEqual([40, 4]);
  });
});

describe('pontuação', () => {
  // par de 5: 10 base + 5 + 5 = 20 fichas, mult 2; 2 entregas = +20 fichas; pilha máx. 1 → ×1,5
  it('par de 5 com pilha máx. 1: (20 + 20) × (2 × 1,5) = 120', () => {
    const r = base([mk(5, 'H'), mk(5, 'D')]);
    expect(r.pops).toBe(2);
    expect(r.depthX).toBe(1.5);
    expect(r.total).toBe(120);
  });
  it('pilha mais funda multiplica mais (×(1 + 0,5 × profundidade))', () => {
    const r = base([mk(5, 'H'), mk(5, 'D')], { maxDepth: 4 });
    expect(r.depthX).toBe(3);
    expect(r.total).toBe(Math.floor(40 * 2 * 3));
  });
  it('Carta Fundo de Pilha: +3 mult por carta embaixo dela', () => {
    const a = mk(5, 'H', 'deep');
    const r = base([a, mk(5, 'D')], { depthBelow: { [a.id]: 2 } });
    expect(r.mult).toBe((2 + 6) * 1.5);
  });
  it('carimbos e ouro', () => {
    const r = base([mk(5, 'H', 'chip'), mk(5, 'D', 'gold')]);
    expect(r.money).toBe(20);
    expect(r.chips).toBe(10 + 5 + 30 + 5 + 20);
    const m = base([mk(5, 'H', 'mult'), mk(5, 'D')]);
    expect(m.mult).toBe(2 * 1.5 + 4 * 1.5);
  });
  it('relíquias: trevo +4 mult, dado +30, pilha profunda +1 no multiplicador de profundidade, âncora', () => {
    const r = base([mk(5, 'H'), mk(5, 'D')], { relics: ['trevo', 'dado'] });
    expect(r.mult).toBe((2 + 4) * 1.5);
    expect(r.chips).toBe(10 + 10 + 20 + 30);
    const p = base([mk(5, 'H'), mk(5, 'D')], { relics: ['pilha'] });
    expect(p.depthX).toBe(2.5);
    const c = mk(5, 'H', 'deep');
    expect(base([c, mk(5, 'D')], { relics: ['ancora'] }).mult).toBe((2 + 8) * 1.5);
  });
  it('regras: ouros sem efeito, figuras sem efeito, 1ª mão metade, PDA metade, repetição metade', () => {
    const d = base([mk(5, 'D'), mk(5, 'H')], { rules: { debuffSuits: ['D'] } });
    expect(d.events.some((e) => e.kind === 'debuff')).toBe(true);
    expect(d.chips).toBe(10 + 5 + 20);
    const f = base([mk(13, 'D'), mk(13, 'H')], { rules: { debuffFaces: true } });
    expect(f.chips).toBe(10 + 20);
    const h = base([mk(5, 'H'), mk(5, 'D')], { rules: { firstHandHalf: true }, firstHand: true });
    expect(h.total).toBe(Math.floor(40 * 3 * 0.5));
    const pd = base([mk(5, 'H'), mk(5, 'D')], { rules: { pdaHalf: true } });
    expect(pd.depthX).toBe(1.25);
    expect(pd.chips).toBe(10 + 5 + 5 + 10);
    const rep = base([mk(5, 'H'), mk(5, 'D')], { rules: { noRepeatHand: true }, lastHandType: 'pair' });
    expect(rep.total).toBe(Math.floor(40 * 3 * 0.5));
  });
  it('a chefe perde trapaças com as pistas', () => {
    const boss = OPPONENTS[7];
    expect(effectiveRules(boss, [])).toEqual({ handsMinus: 1, firstHandHalf: true, pdaHalf: true });
    expect(effectiveRules(boss, ['clue_guardanapo', 'clue_engrenagem', 'clue_baralho'])).toEqual({});
  });
});

describe('mesa', () => {
  const meta = defaultMeta();
  const run = newRun(LOAN_OPTIONS[0], meta, () => 0.3);
  const cfg = (i = 0) => ({
    opponent: OPPONENTS[i], rules: effectiveRules(OPPONENTS[i], []), deck: run.deck, relics: [], handLevels: run.handLevels,
    inDebt: true, bonuses: { hands: 0, discards: 0, handSize: 0 },
  });
  /** percurso completo qualquer (o primeiro que o solver achar) */
  const anyWalk = (m: ReturnType<typeof startMatch>): Walk => {
    const p = getLayout(m.layoutId);
    const r = search(p, m.hand, activeSlotCount(p, m.hand.length), (w) => w.delivered.length, { stopAtFirst: true, budget: 200000 });
    expect(r.best).not.toBeNull();
    return r.best!.walk;
  };
  it('limites padrão e modificados por regras/relíquias', () => {
    expect(matchLimits({ relics: [], rules: {}, bonuses: { hands: 0, discards: 0, handSize: 0 } })).toEqual({ hands: 4, discards: 3, handSize: 8 });
    expect(matchLimits({ relics: ['lupa', 'gasto', 'colete'], rules: { handsMinus: 1 }, bonuses: { hands: 1, discards: 0, handSize: 0 } })).toEqual({ hands: 5, discards: 4, handSize: 9 });
  });
  it('cada mesa tem um mapa; cartas do mapa = vagas ativas', () => {
    for (const o of OPPONENTS) expect(() => getLayout(o.layout)).not.toThrow();
    expect(dealSize('salao', 8)).toBe(8);
    expect(dealSize('salao', 10)).toBe(10);
    expect(dealSize('salao', 30)).toBe(getLayout('salao').slots.length);
  });
  it('fluxo completo: embaralha mapa novo, percorre, entrega, pontua', () => {
    let m = startMatch(cfg(), Math.random);
    expect(m.hand).toHaveLength(8);
    expect(m.drawPile).toHaveLength(44);
    m = redeal(m);
    expect(m.hand).toHaveLength(8);
    expect(m.discardsLeft).toBe(2);
    let guard = 0;
    while (m.status === 'playing' && guard++ < 10) {
      const r = playRound(m, anyWalk(m), Math.random);
      expect(r.result.total).toBeGreaterThan(0);
      m = r.state;
    }
    expect(['won', 'lost']).toContain(m.status);
    expect(m.handsPlayed).toBeLessThanOrEqual(4);
  });
  it('validações', () => {
    const m = startMatch(cfg(), Math.random);
    const w = anyWalk(m);
    expect(() => playRound(m, { ...w, done: false })).toThrow();
    let d = m;
    for (let i = 0; i < 3; i++) d = redeal(d);
    expect(() => redeal(d)).toThrow();
  });
  it('vitória paga recompensa + $15 por mão restante', () => {
    let m = startMatch({ ...cfg(), opponent: { ...OPPONENTS[0], target: 1 } }, Math.random);
    m = playRound(m, anyWalk(m)).state;
    expect(m.status).toBe('won');
    expect(matchPayout(m).total).toBe(100 + 15 * 3);
  });
  it('o baralho nunca duplica nem perde cartas', () => {
    let m = startMatch(cfg(), Math.random);
    while (m.status === 'playing') m = playRound(m, anyWalk(m)).state;
    const all = [...m.hand, ...m.drawPile, ...m.discardPile].map((c) => c.id).sort((a, b) => a - b);
    const expected = run.deck.map((c) => c.id).sort((a, b) => a - b);
    // ao ganhar/perder o mapa não é refeito: as cartas do mapa foram para o descarte
    expect(all).toEqual(expected);
  });
});

describe('loja e meta', () => {
  const meta = defaultMeta();
  const mkRun = () => ({ ...newRun(LOAN_OPTIONS[0], meta, () => 0.3), money: 1000 });
  it('empréstimo e juros', () => {
    expect(loanDebt(LOAN_OPTIONS[0], meta)).toBe(450);
    expect(loanDebt(LOAN_OPTIONS[1], meta)).toBe(850);
    expect(loanDebt(LOAN_OPTIONS[2], { ...meta, upgrades: { labia: 2 } })).toBe(Math.ceil(800 * 1.7));
  });
  it('compra de relíquia, limite de slots e venda', () => {
    let run = mkRun();
    let shop = generateShop(run, () => 0.1);
    const idx = shop.offers.findIndex((o) => o.kind === 'relic');
    const r = buyRelic(run, shop, idx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    run = r.value.run;
    shop = r.value.shop;
    expect(run.relics).toHaveLength(1);
    expect(buyRelic(run, shop, idx).ok).toBe(false); // já vendida
    const sold = sellRelic(run, run.relics[0]);
    expect(sold.relics).toHaveLength(0);
    expect(sold.money).toBeGreaterThan(run.money);
  });
  it('upgrade de mão, carimbo, remover e clonar', () => {
    const run = mkRun();
    const shop = generateShop(run, () => 0.1);
    const hi = shop.offers.findIndex((o) => o.kind === 'hand');
    const up = buyHandUpgrade(run, shop, hi);
    expect(up.ok).toBe(true);
    const si = shop.offers.findIndex((o) => o.kind === 'stamp');
    const st = buyStamp(run, shop, si, run.deck[0].id);
    expect(st.ok && st.value.run.deck[0].enh).toBeTruthy();
    const rm = removeCard(run, shop, run.deck[0].id);
    expect(rm.ok && rm.value.run.deck.length).toBe(51);
    const cl = cloneCard(run, shop, run.deck[0].id);
    expect(cl.ok && cl.value.run.deck.length).toBe(53);
    if (cl.ok) expect(new Set(cl.value.run.deck.map((c) => c.id)).size).toBe(53);
  });
  it('não compra sem dinheiro', () => {
    const run = { ...mkRun(), money: 5 };
    const shop = generateShop(run, () => 0.1);
    expect(buyRelic(run, shop, 0).ok).toBe(false);
    expect(removeCard(run, shop, run.deck[0].id).ok).toBe(false);
  });
  it('meta-upgrades custam fichas douradas', () => {
    expect(buyMetaUpgrade(defaultMeta(), 'mao')).toBeNull();
    const m = buyMetaUpgrade({ ...defaultMeta(), gold: 20 }, 'mao');
    expect(m?.gold).toBe(6);
    expect(m?.upgrades.mao).toBe(1);
    expect(buyMetaUpgrade(m!, 'mao')).toBeNull(); // nível máximo
  });
  it('baralho padrão tem 52 cartas únicas', () => {
    const d = createDeck();
    expect(d).toHaveLength(52);
    expect(new Set(d.map((c) => `${c.rank}${c.suit}`)).size).toBe(52);
    expect(shuffle(d)).toHaveLength(52);
  });
});

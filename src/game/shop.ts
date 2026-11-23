import { Card, ENH_INFO, Enhancement, Rng } from './cards';
import { HAND_TYPES, HandType } from './poker';
import { MAX_RELICS, RELICS, RELIC_BY_ID, relicSell } from './relics';
import { Offer, Run, ShopState } from './state';

export const REMOVE_COST = 50;
export const CLONE_COST = 90;
export const REROLL_BASE = 20;
export const MIN_DECK = 20;
export const MAX_DECK = 70;

const HAND_WEIGHTS: Record<HandType, number> = {
  high: 1, pair: 4, twoPair: 4, three: 3, straight: 3, flush: 3, fullHouse: 2, four: 1, straightFlush: 1,
};

export function handUpgradePrice(run: Run, hand: HandType): number {
  return 60 + 20 * (run.handLevels[hand] - 1);
}

function pickWeighted<T>(items: T[], weight: (t: T) => number, rng: Rng): T {
  const total = items.reduce((a, i) => a + weight(i), 0);
  let r = rng() * total;
  for (const i of items) {
    r -= weight(i);
    if (r <= 0) return i;
  }
  return items[items.length - 1];
}

export function generateShop(run: Run, rng: Rng = Math.random, rerolls = 0): ShopState {
  const offers: Offer[] = [];
  const pool = RELICS.filter((r) => !run.relics.includes(r.id));
  const used = new Set<string>();
  for (let i = 0; i < 2 && pool.length - used.size > 0; i++) {
    const avail = pool.filter((r) => !used.has(r.id));
    const r = avail[Math.floor(rng() * avail.length)];
    used.add(r.id);
    offers.push({ kind: 'relic', id: r.id, price: r.cost });
  }
  const hand = pickWeighted(HAND_TYPES, (h) => HAND_WEIGHTS[h], rng);
  offers.push({ kind: 'hand', hand, price: handUpgradePrice(run, hand) });
  const enhs: Enhancement[] = ['chip', 'mult', 'deep', 'gold'];
  offers.push({ kind: 'stamp', enh: enhs[Math.floor(rng() * enhs.length)], price: 60 });
  return { offers, rerolls, removeUsed: false, cloneUsed: false };
}

export function rerollPrice(shop: ShopState): number {
  return REROLL_BASE + 10 * shop.rerolls;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function setSold(shop: ShopState, idx: number): ShopState {
  return { ...shop, offers: shop.offers.map((o, i) => (i === idx ? ({ ...o, sold: true } as Offer) : o)) };
}

export function reroll(run: Run, shop: ShopState, rng: Rng = Math.random): Result<{ run: Run; shop: ShopState }> {
  const price = rerollPrice(shop);
  if (run.money < price) return { ok: false, error: 'Dinheiro insuficiente.' };
  const fresh = generateShop(run, rng, shop.rerolls + 1);
  return { ok: true, value: { run: { ...run, money: run.money - price }, shop: { ...fresh, removeUsed: shop.removeUsed, cloneUsed: shop.cloneUsed } } };
}

export function buyRelic(run: Run, shop: ShopState, idx: number): Result<{ run: Run; shop: ShopState }> {
  const o = shop.offers[idx];
  if (!o || o.kind !== 'relic' || o.sold) return { ok: false, error: 'Oferta indisponível.' };
  if (run.relics.length >= MAX_RELICS) return { ok: false, error: `Você só carrega ${MAX_RELICS} relíquias. Venda uma.` };
  if (run.money < o.price) return { ok: false, error: 'Dinheiro insuficiente.' };
  return { ok: true, value: { run: { ...run, money: run.money - o.price, relics: [...run.relics, o.id] }, shop: setSold(shop, idx) } };
}

export function buyHandUpgrade(run: Run, shop: ShopState, idx: number): Result<{ run: Run; shop: ShopState }> {
  const o = shop.offers[idx];
  if (!o || o.kind !== 'hand' || o.sold) return { ok: false, error: 'Oferta indisponível.' };
  if (run.money < o.price) return { ok: false, error: 'Dinheiro insuficiente.' };
  return {
    ok: true,
    value: {
      run: { ...run, money: run.money - o.price, handLevels: { ...run.handLevels, [o.hand]: run.handLevels[o.hand] + 1 } },
      shop: setSold(shop, idx),
    },
  };
}

export function buyStamp(run: Run, shop: ShopState, idx: number, cardId: number): Result<{ run: Run; shop: ShopState }> {
  const o = shop.offers[idx];
  if (!o || o.kind !== 'stamp' || o.sold) return { ok: false, error: 'Oferta indisponível.' };
  if (run.money < o.price) return { ok: false, error: 'Dinheiro insuficiente.' };
  if (!run.deck.some((c) => c.id === cardId)) return { ok: false, error: 'Carta inexistente.' };
  return {
    ok: true,
    value: {
      run: { ...run, money: run.money - o.price, deck: run.deck.map((c) => (c.id === cardId ? { ...c, enh: o.enh } : c)) },
      shop: setSold(shop, idx),
    },
  };
}

export function removeCard(run: Run, shop: ShopState, cardId: number): Result<{ run: Run; shop: ShopState }> {
  if (shop.removeUsed) return { ok: false, error: 'Serviço já usado nesta visita.' };
  if (run.money < REMOVE_COST) return { ok: false, error: 'Dinheiro insuficiente.' };
  if (run.deck.length <= MIN_DECK) return { ok: false, error: `O baralho precisa de ao menos ${MIN_DECK} cartas.` };
  if (!run.deck.some((c) => c.id === cardId)) return { ok: false, error: 'Carta inexistente.' };
  return {
    ok: true,
    value: { run: { ...run, money: run.money - REMOVE_COST, deck: run.deck.filter((c) => c.id !== cardId) }, shop: { ...shop, removeUsed: true } },
  };
}

export function cloneCard(run: Run, shop: ShopState, cardId: number): Result<{ run: Run; shop: ShopState }> {
  if (shop.cloneUsed) return { ok: false, error: 'Serviço já usado nesta visita.' };
  if (run.money < CLONE_COST) return { ok: false, error: 'Dinheiro insuficiente.' };
  if (run.deck.length >= MAX_DECK) return { ok: false, error: `O baralho já tem ${MAX_DECK} cartas.` };
  const src = run.deck.find((c) => c.id === cardId);
  if (!src) return { ok: false, error: 'Carta inexistente.' };
  const copy: Card = { ...src, id: run.nextCardId };
  return {
    ok: true,
    value: {
      run: { ...run, money: run.money - CLONE_COST, nextCardId: run.nextCardId + 1, deck: [...run.deck, copy] },
      shop: { ...shop, cloneUsed: true },
    },
  };
}

export function sellRelic(run: Run, relicId: string): Run {
  const r = RELIC_BY_ID[relicId];
  if (!r || !run.relics.includes(relicId)) return run;
  return { ...run, money: run.money + relicSell(r), relics: run.relics.filter((x) => x !== relicId) };
}

export { ENH_INFO };

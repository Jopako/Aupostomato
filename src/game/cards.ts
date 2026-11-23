export type Suit = 'H' | 'D' | 'C' | 'S';
export type Enhancement = 'chip' | 'mult' | 'deep' | 'gold';

export interface Card {
  id: number;
  rank: number; // 2..14 (11=J 12=Q 13=K 14=A)
  suit: Suit;
  enh?: Enhancement;
}

export const SUITS: Suit[] = ['H', 'D', 'C', 'S'];
export const SUIT_GLYPH: Record<Suit, string> = { H: '♥', D: '♦', C: '♣', S: '♠' };
export const SUIT_NAME: Record<Suit, string> = { H: 'Copas', D: 'Ouros', C: 'Paus', S: 'Espadas' };

export const ENH_INFO: Record<Enhancement, { name: string; desc: string }> = {
  chip: { name: 'Carimbo de Fichas', desc: '+30 fichas quando pontua.' },
  mult: { name: 'Carimbo de Mult', desc: '+4 mult quando pontua.' },
  deep: { name: 'Carta Fundo de Pilha', desc: '+3 Mult por carta que ainda estava empilhada embaixo dela quando foi entregue.' },
  gold: { name: 'Carimbo Dourado', desc: 'Ganha $20 quando pontua.' },
};

export function rankLabel(r: number): string {
  if (r <= 10) return String(r);
  return { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }[r] as string;
}

export function isRed(s: Suit): boolean {
  return s === 'H' || s === 'D';
}

export function cardChips(c: Card): number {
  if (c.rank === 14) return 11;
  if (c.rank >= 11) return 10;
  return c.rank;
}

export function createDeck(startId = 1): Card[] {
  const deck: Card[] = [];
  let id = startId;
  for (const suit of SUITS) for (let rank = 2; rank <= 14; rank++) deck.push({ id: id++, rank, suit });
  return deck;
}

export type Rng = () => number;

export function shuffle<T>(arr: T[], rng: Rng = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sortHand(cards: Card[], by: 'rank' | 'suit'): Card[] {
  const order: Record<Suit, number> = { H: 0, D: 1, C: 2, S: 3 };
  return cards.slice().sort((x, y) =>
    by === 'rank' ? y.rank - x.rank || order[x.suit] - order[y.suit] : order[x.suit] - order[y.suit] || y.rank - x.rank,
  );
}

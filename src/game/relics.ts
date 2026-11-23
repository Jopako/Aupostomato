import { Card } from './cards';
import { HandType } from './poker';

export interface Effect {
  chips?: number;
  mult?: number;
  xmult?: number;
  money?: number;
}

export interface RelicCtx {
  played: Card[];
  scoring: Card[];
  handType: HandType;
  /** profundidade máxima que a pilha atingiu no percurso */
  maxDepth: number;
  /** nº de entregas (POPs) */
  pops: number;
  handsLeft: number; // depois de gastar esta mão
  firstHand: boolean;
  inDebt: boolean;
  deckRemaining: number;
  rng: () => number;
}

export interface Relic {
  id: string;
  name: string;
  desc: string;
  flavor: string;
  cost: number;
  hands?: number;
  discards?: number;
  handSize?: number;
  popChips?: number;
  pdaBonus?: number;
  endMoney?: number;
  onCard?: (card: Card, ctx: RelicCtx) => Effect | null;
  onHand?: (ctx: RelicCtx) => Effect | null;
}

const PAIRISH: HandType[] = ['pair', 'twoPair', 'three', 'fullHouse', 'four'];

export const RELICS: Relic[] = [
  {
    id: 'trevo', name: 'Trevo de Quatro Folhas', cost: 70,
    desc: '+4 Mult em toda mão.', flavor: 'Achado num bueiro. Deu sorte para outra pessoa.',
    onHand: () => ({ mult: 4 }),
  },
  {
    id: 'dado', name: 'Dado Viciado', cost: 70,
    desc: '+30 Fichas em toda mão.', flavor: 'Cai sempre no seis. Menos quando você aposta nele.',
    onHand: () => ({ chips: 30 }),
  },
  {
    id: 'anel', name: 'Anel do Agiota', cost: 90,
    desc: '+10 Mult enquanto você ainda deve ao Tio Juros.', flavor: 'Aperta mais a cada dia que passa.',
    onHand: (c) => (c.inDebt ? { mult: 10 } : null),
  },
  {
    id: 'pilha', name: 'Pilha Profunda', cost: 150,
    desc: 'O multiplicador de profundidade do PDA ganha +1.',
    flavor: 'Quanto mais fundo, maior o eco.', pdaBonus: 1,
  },
  {
    id: 'fita', name: 'Fita de Equilíbrio', cost: 80,
    desc: 'Cada POP do PDA rende +20 fichas em vez de +10.', flavor: 'Um a um, bem arrumadinho.',
    popChips: 10,
  },
  {
    id: 'lupa', name: 'Lupa do Detetive', cost: 120,
    desc: '+1 mão por mesa.', flavor: 'Quem olha duas vezes joga uma vez a mais.', hands: 1,
  },
  {
    id: 'gasto', name: 'Baralho Gasto', cost: 90,
    desc: '+1 descarte por mesa.', flavor: 'As pontas macias escondem segredos.', discards: 1,
  },
  {
    id: 'colete', name: 'Colete de Veludo', cost: 110,
    desc: '+1 carta no mapa (aparece uma carta extra, se o mapa tiver vaga).', flavor: 'Tem bolso secreto. Na verdade, tem vários.', handSize: 1,
  },
  {
    id: 'copas', name: 'Coração Apaixonado', cost: 90,
    desc: '+3 Mult por carta ♥ ou ♦ que pontua.', flavor: 'Empilha tudo, não solta nada.',
    onCard: (c) => (c.suit === 'H' || c.suit === 'D' ? { mult: 3 } : null),
  },
  {
    id: 'faca', name: 'Faca Afiada', cost: 90,
    desc: '+25 Fichas por carta ♠ ou ♣ que pontua.', flavor: 'Corta a pilha rapidinho.',
    onCard: (c) => (c.suit === 'S' || c.suit === 'C' ? { chips: 25 } : null),
  },
  {
    id: 'par', name: 'Par Perfeito', cost: 100,
    desc: '+12 Mult em mãos com par (Par, Dois Pares, Trinca, Full House, Quadra).',
    flavor: 'Duas cabeças pensam melhor do que uma.',
    onHand: (c) => (PAIRISH.includes(c.handType) ? { mult: 12 } : null),
  },
  {
    id: 'escada', name: 'Sequência Real', cost: 90,
    desc: '+60 Fichas em Sequência ou Straight Flush.', flavor: 'Degrau por degrau, até o topo.',
    onHand: (c) => (c.handType === 'straight' || c.handType === 'straightFlush' ? { chips: 60 } : null),
  },
  {
    id: 'cofre', name: 'Cofre do Bar', cost: 100,
    desc: '+$30 ao fim de cada mesa vencida.', flavor: 'Lúcio jura que nunca viu esse cofre.', endMoney: 30,
  },
  {
    id: 'blefe', name: 'Máscara do Blefe', cost: 130,
    desc: '×2 Mult na primeira mão de cada mesa.', flavor: 'Primeiro impressione, depois se explique.',
    onHand: (c) => (c.firstHand ? { xmult: 2 } : null),
  },
  {
    id: 'ancora', name: 'Âncora', cost: 90,
    desc: '+8 Mult por Carta Fundo de Pilha que pontua.', flavor: 'Quem fica no fundo segura o resto.',
    onCard: (c) => (c.enh === 'deep' ? { mult: 8 } : null),
  },
  {
    id: 'montinho', name: 'Montinho de Fichas', cost: 80,
    desc: '+2 Fichas por carta restante no baralho.', flavor: 'Quanto mais para comprar, mais para contar.',
    onHand: (c) => ({ chips: 2 * c.deckRemaining }),
  },
  {
    id: 'moeda', name: 'Moeda Viciada', cost: 100,
    desc: '25% de chance de ×3 Mult.', flavor: 'Cara, coroa... ou o dedão do Lúcio.',
    onHand: (c) => (c.rng() < 0.25 ? { xmult: 3 } : null),
  },
  {
    id: 'ultima', name: 'A Última Ficha', cost: 110,
    desc: '×1.5 Mult na última mão da mesa.', flavor: 'Só mais uma. Prometo.',
    onHand: (c) => (c.handsLeft === 0 ? { xmult: 1.5 } : null),
  },
];

export const RELIC_BY_ID: Record<string, Relic> = Object.fromEntries(RELICS.map((r) => [r.id, r]));

export const MAX_RELICS = 5;

export function relicSell(r: Relic): number {
  return Math.floor(r.cost / 2);
}


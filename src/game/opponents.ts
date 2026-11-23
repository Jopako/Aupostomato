import { Suit } from './cards';

export interface OpponentRules {
  handsMinus?: number;
  discardsMinus?: number;
  handSizeMinus?: number;
  debuffSuits?: Suit[];
  debuffFaces?: boolean;
  noRepeatHand?: boolean;
  firstHandHalf?: boolean;
  pdaHalf?: boolean;
}

export interface PortraitSpec {
  skin: string;
  hair: string;
  suit: string;
  accent: string;
  style: 'dealer' | 'tycoon' | 'dame' | 'colonel' | 'countess' | 'accountant' | 'twins' | 'madame' | 'capri' | 'guard' | 'waiter' | 'barman' | 'lender' | 'vicio' | 'narrator' | 'driver' | 'guest';
}

export interface OpponentDef {
  id: string;
  name: string;
  title: string;
  target: number;
  reward: number;
  /** id do mapa (maze.ts) em que esta mesa é jogada */
  layout: string;
  rules: OpponentRules;
  ruleName: string;
  ruleDesc: string;
  intro: string[];
  win: string;
  portrait: PortraitSpec;
  boss?: boolean;
}

export const OPPONENTS: OpponentDef[] = [
  {
    id: 'cecilia', name: 'Cecília', title: 'Dealer da Mesa 1', target: 560, reward: 100, layout: 'salao', rules: {},
    ruleName: 'Mesa de Aquecimento', ruleDesc: 'Sem regras especiais.',
    intro: ['Cecília embaralha com mãos que nunca erram.', '"Sente, Capri. Vamos ver se você ainda sabe jogar."'],
    win: '"Hum. A mão ainda é boa."',
    portrait: { skin: '#e0b48f', hair: '#2a1a14', suit: '#7a1020', accent: '#d4af37', style: 'dealer' },
  },
  {
    id: 'herminio', name: 'Sr. Hermínio', title: 'Magnata dos Grãos', target: 1120, reward: 120, layout: 'alcovas',
    rules: { debuffSuits: ['D'] },
    ruleName: 'Alergia a Ouros', ruleDesc: 'Cartas de ♦ não dão fichas nem bônus ao pontuar.',
    intro: ['Hermínio tamborila os dedos gordos na mesa.', '"Odeio ouros. Me lembram meu ex-sócio."'],
    win: '"Perdi... para um moleque sem gravata?"',
    portrait: { skin: '#d9a77c', hair: '#c9c9c9', suit: '#1d3a2b', accent: '#d4af37', style: 'tycoon' },
  },
  {
    id: 'berenice', name: 'Dona Berenice', title: 'Viúva de Quatro Maridos', target: 2000, reward: 140, layout: 'galeria',
    rules: { discardsMinus: 2 },
    ruleName: 'Luvas de Seda', ruleDesc: '-2 descartes nesta mesa.',
    intro: ['Berenice ajeita as luvas, uma de cada vez.', '"Não troco de carta, querido. Nem de marido."'],
    win: '"Que charme perder para você."',
    portrait: { skin: '#e8c4a6', hair: '#8b1e3f', suit: '#3a1f4d', accent: '#e63946', style: 'dame' },
  },
  {
    id: 'braganca', name: 'Cel. Bragança', title: 'Militar Aposentado', target: 3200, reward: 160, layout: 'salao',
    rules: { noRepeatHand: true },
    ruleName: 'Memória de Elefante', ruleDesc: 'Repetir o mesmo tipo de mão da jogada anterior vale metade.',
    intro: ['O coronel bate continência para as próprias cartas.', '"Variedade, soldado! Quem se repete, se rende!"'],
    win: '"Desertou da minha estratégia, mas venceu."',
    portrait: { skin: '#c99a76', hair: '#e8e8e8', suit: '#3b4a2a', accent: '#d4af37', style: 'colonel' },
  },
  {
    id: 'ravena', name: 'Condessa Ravena', title: 'Herdeira da Mineradora', target: 4800, reward: 180, layout: 'alcovas',
    rules: { debuffFaces: true },
    ruleName: 'Desprezo pela Realeza', ruleDesc: 'Valetes, Damas e Reis não dão fichas nem bônus ao pontuar.',
    intro: ['Ravena sopra a fumaça do cigarro na sua direção.', '"Reis e rainhas? Que cafona."'],
    win: '"Você tem estilo. Isso é raro por aqui."',
    portrait: { skin: '#f0d4bc', hair: '#111111', suit: '#101028', accent: '#08d9d6', style: 'countess' },
  },
  {
    id: 'plinio', name: 'Dr. Plínio', title: 'Contador da Casa', target: 7200, reward: 200, layout: 'vestibulo',
    rules: { pdaHalf: true },
    ruleName: 'Auditoria da Pilha', ruleDesc: 'O bônus do PDA vale a metade (fichas por POP e multiplicador de profundidade).',
    intro: ['Plínio confere cada ficha com um lápis atrás da orelha.', '"Tudo precisa fechar. Principalmente as pilhas."'],
    win: '"Os números... não batem. Bom para você."',
    portrait: { skin: '#d8b090', hair: '#3a2f25', suit: '#2b2b33', accent: '#08d9d6', style: 'accountant' },
  },
  {
    id: 'gemeos', name: 'Os Gêmeos Aurélio', title: 'Jogam Como Um Só', target: 10000, reward: 240, layout: 'salafinal',
    rules: { handsMinus: 1 },
    ruleName: 'Dois Contra Um', ruleDesc: '-1 mão nesta mesa.',
    intro: ['Os dois erguem as sobrancelhas ao mesmo tempo.', '"Somos dois", dizem em coro. "Você é um só."'],
    win: '"Impossível..." / "...impossível."',
    portrait: { skin: '#d6a982', hair: '#222222', suit: '#4a1d1d', accent: '#d4af37', style: 'twins' },
  },
  {
    id: 'onix', name: 'Madame Ônix', title: 'Dona do Cassino e do Autômato', target: 11200, reward: 400, layout: 'salafinal',
    rules: { handsMinus: 1, firstHandHalf: true, pdaHalf: true },
    ruleName: 'A Casa Sempre Ganha',
    ruleDesc: 'Trapaças do Autômato: -1 mão, primeira mão vale metade, PDA pela metade. Cada pista que você achou desativa uma.',
    intro: ['O Autômato range atrás dela, lendo cada carta que você toca.', '"Vamos ver até onde vai a sua sorte, Capri."'],
    win: '"Impossível... eu desenhei cada engrenagem."',
    portrait: { skin: '#e6c3a8', hair: '#0a0a0a', suit: '#0d0d12', accent: '#d4af37', style: 'madame' },
    boss: true,
  },
];

export const OPPONENT_BY_ID: Record<string, OpponentDef> = Object.fromEntries(OPPONENTS.map((o) => [o.id, o]));

export const CLUE_FOR_CHEAT = {
  hands: 'clue_guardanapo',
  firstHand: 'clue_engrenagem',
  pda: 'clue_baralho',
} as const;

/** Regras efetivas: a chefe perde uma trapaça para cada pista correspondente. */
export function effectiveRules(o: OpponentDef, clues: string[]): OpponentRules {
  if (!o.boss) return { ...o.rules };
  const r: OpponentRules = { ...o.rules };
  if (clues.includes(CLUE_FOR_CHEAT.hands)) delete r.handsMinus;
  if (clues.includes(CLUE_FOR_CHEAT.firstHand)) delete r.firstHandHalf;
  if (clues.includes(CLUE_FOR_CHEAT.pda)) delete r.pdaHalf;
  return r;
}

export function describeRules(r: OpponentRules): string[] {
  const out: string[] = [];
  if (r.handsMinus) out.push(`-${r.handsMinus} mão`);
  if (r.discardsMinus) out.push(`-${r.discardsMinus} descartes`);
  if (r.handSizeMinus) out.push(`-${r.handSizeMinus} carta na mão`);
  if (r.debuffSuits?.length) out.push(`naipes sem efeito: ${r.debuffSuits.join('')}`);
  if (r.debuffFaces) out.push('figuras sem efeito');
  if (r.noRepeatHand) out.push('repetir mão vale metade');
  if (r.firstHandHalf) out.push('1ª mão vale metade');
  if (r.pdaHalf) out.push('PDA pela metade');
  return out;
}

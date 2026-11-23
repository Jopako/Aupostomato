export interface ItemDef {
  id: string;
  name: string;
  desc: string;
  glyph: string;
}

export const ITEMS: Record<string, ItemDef> = {
  isqueiro: { id: 'isqueiro', name: 'Isqueiro dourado', desc: 'Tem um "N" gravado. Ainda acende.', glyph: '🔥' },
  convite: { id: 'convite', name: 'Convite do Conde', desc: '"Conde Ottoni Brandão ou representante." Autêntico.', glyph: '✉️' },
};

export interface ClueDef {
  id: string;
  name: string;
  text: string;
  /** efeito mecânico contra a Madame Ônix, se houver */
  effect?: string;
}

export const CLUES: ClueDef[] = [
  {
    id: 'clue_guardanapo', name: 'Guardanapo do Lúcio',
    text: 'Lúcio anotou todos os que sentaram na mesa dos fundos: ninguém saiu ganhando. A casa joga com uma mão a menos para os convidados.',
    effect: 'Madame Ônix perde a trapaça "-1 mão".',
  },
  {
    id: 'clue_engrenagem', name: 'Caixa de engrenagens',
    text: 'Uma caixa do "Autômato P.D.A. — Pilha Dupla Automática". O manual diz que a primeira leitura da noite é sempre "corrigida para baixo".',
    effect: 'Madame Ônix perde a trapaça "1ª mão vale metade".',
  },
  {
    id: 'clue_baralho', name: 'Confissão de Cecília',
    text: 'Cecília admite: o Autômato só paga o bônus cheio para a casa. Para os convidados, a pilha sempre "escorrega" pela metade.',
    effect: 'Madame Ônix perde a trapaça "PDA pela metade".',
  },
  {
    id: 'clue_contrato', name: 'Contrato do Tio Juros',
    text: 'Madame Ônix deve uma fortuna ao Tio Juros. A Noite dos Magnatas é um golpe para esvaziar os bolsos dos convidados e pagar a dívida.',
    effect: 'Revela a verdade completa no final.',
  },
];

export const CLUE_BY_ID: Record<string, ClueDef> = Object.fromEntries(CLUES.map((c) => [c.id, c]));
export const CORE_CLUES = ['clue_guardanapo', 'clue_engrenagem', 'clue_baralho'];
export const PRIZE = 5000;

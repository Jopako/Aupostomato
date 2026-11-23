import { Card, ENH_INFO, isRed, rankLabel, SUIT_GLYPH } from '../game/cards';
import { SuitIcon } from './pixel';

interface Props {
  card: Card;
  selected?: boolean;
  order?: number;
  small?: boolean;
  debuffed?: boolean;
  scoring?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

const ENH_ICON: Record<string, string> = { chip: '●', mult: '✦', deep: '⇩', gold: '$' };

export function CardView({ card, selected, order, small, debuffed, scoring, onClick, disabled }: Props) {
  const cls = [
    'card',
    isRed(card.suit) ? 'red' : 'black',
    selected ? 'sel' : '',
    small ? 'small' : '',
    debuffed ? 'debuff' : '',
    scoring ? 'counts' : '',
    scoring === false ? 'not-counts' : '',
    card.enh ? `enh-${card.enh}` : '',
    onClick && !disabled ? 'clickable' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const scoreLabel = scoring ? ' — faz parte da combinação que pontua' : scoring === false ? ' — não pontua individualmente' : '';
  const title = `${rankLabel(card.rank)}${SUIT_GLYPH[card.suit]}${scoreLabel}${card.enh ? ` — ${ENH_INFO[card.enh].name}: ${ENH_INFO[card.enh].desc}` : ''}`;
  return (
    <button type="button" className={cls} onClick={onClick} disabled={disabled} title={title} aria-pressed={selected} aria-label={title}>
      <span className="rank">{rankLabel(card.rank)}</span>
      <span className="suit"><SuitIcon suit={card.suit} size={0.9} /></span>
      <span className="pip"><SuitIcon suit={card.suit} size={2.4} /></span>
      {card.enh && <span className="enh">{ENH_ICON[card.enh]}</span>}
      {order !== undefined && <span className="ord">{order}</span>}
    </button>
  );
}

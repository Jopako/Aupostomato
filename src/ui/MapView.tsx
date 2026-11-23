import type * as React from 'react';
import { Card, isRed, rankLabel, SUIT_GLYPH } from '../game/cards';
import { key, Parsed, Walk } from '../game/maze';
import { MAP_SPRITES, SuitIcon } from './pixel';

interface Props {
  layout: Parsed;
  cards: (Card | null)[];
  active: number;
  walk: Walk;
  can: { a: boolean; b: boolean; c: boolean };
  shake: number;
  debuffed: (c: Card) => boolean;
  onTile: (x: number, y: number) => void;
}

/** O mapa: carta = PUSH (a), porta = POP (b), portal = fim (c). */
export function MapView({ layout: p, cards, active, walk, can, shake, debuffed, onTile }: Props) {
  const tiles = [];
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      const k = key(x, y);
      const isWall = p.wall[y][x];
      let cls = isWall ? 'wall' : 'floor';
      let content: JSX.Element | string | null = null;
      let title = '';
      const slot = p.slotAt.get(k);
      const hasPlayer = walk.x === x && walk.y === y;
      if (!isWall) {
        if (x === p.start.x && y === p.start.y) cls += ' start';
        if (slot !== undefined && slot < active && cards[slot] && !walk.picked.includes(slot)) {
          const c = cards[slot] as Card;
          cls += ` cardtile ${isRed(c.suit) ? 'red' : 'black'} ${can.a ? '' : 'locked'} ${debuffed(c) ? 'debuff' : ''} ${c.enh ? 'enh-' + c.enh : ''}`;
          content = <><b>{rankLabel(c.rank)}</b><SuitIcon suit={c.suit} size={0.5} /></>;
          title = `Carta ${rankLabel(c.rank)}${SUIT_GLYPH[c.suit]} — pisar = símbolo a (PUSH X)`;
        } else if (p.doorSet.has(k)) {
          const used = k in walk.usedDoors;
          cls += ` door ${used ? 'open' : can.b ? 'ready' : 'locked'}`;
          content = null;
          title = used ? 'Porta já usada' : 'Porta — pisar = símbolo b (POP X: entrega a carta do topo)';
        } else if (x === p.portal.x && y === p.portal.y) {
          cls += ` portal ${can.c ? 'ready' : 'locked'}`;
          content = null;
          title = 'Portal — símbolo c (exige pilha vazia e ≥ 1 carta entregue)';
        }
      }
      tiles.push(
        <div key={k} className={`tile ${cls}`} title={title} onClick={() => !isWall && onTile(x, y)}>
          {content}
          {hasPlayer && <span key={shake} className={`player ${shake ? 'bump' : ''}`} aria-label="Capri" />}
        </div>,
      );
    }
  }
  return (
    <div className="map-wrap">
      <div className="map" style={{ gridTemplateColumns: `repeat(${p.w}, var(--tile))`, ['--cols' as string]: p.w, ...MAP_SPRITES } as React.CSSProperties} role="application" aria-label={`Mapa: ${p.name}`}>
        {tiles}
      </div>
    </div>
  );
}

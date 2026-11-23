import { useState } from 'react';
import { Card, ENH_INFO, SUIT_GLYPH, rankLabel, sortHand } from '../game/cards';
import { HAND_NAME, handValue } from '../game/poker';
import { MAX_RELICS, RELIC_BY_ID, relicSell } from '../game/relics';
import {
  buyHandUpgrade, buyRelic, buyStamp, cloneCard, CLONE_COST, MAX_DECK, MIN_DECK, removeCard, REMOVE_COST, reroll, rerollPrice, sellRelic,
} from '../game/shop';
import { Run } from '../game/state';
import { CardView } from './CardView';
import { Modal } from './Modals';
import { sfx } from './audio';

type Picker = { action: 'stamp'; idx: number } | { action: 'remove' } | { action: 'clone' } | null;

interface Props {
  run: Run;
  onChange: (r: Run) => void;
  onLeave: () => void;
}

export function ShopView({ run, onChange, onLeave }: Props) {
  const shop = run.shop!;
  const [picker, setPicker] = useState<Picker>(null);
  const [msg, setMsg] = useState('');
  const [view, setView] = useState(false);

  const apply = (res: { ok: true; value: { run: Run; shop: NonNullable<Run['shop']> } } | { ok: false; error: string }) => {
    if (!res.ok) {
      setMsg(res.error);
      return;
    }
    setMsg('');
    sfx.coin();
    onChange({ ...res.value.run, shop: res.value.shop });
  };

  const pick = (c: Card) => {
    if (!picker) return;
    if (picker.action === 'stamp') apply(buyStamp(run, shop, picker.idx, c.id));
    else if (picker.action === 'remove') apply(removeCard(run, shop, c.id));
    else apply(cloneCard(run, shop, c.id));
    setPicker(null);
  };

  const deck = sortHand(run.deck, 'suit');
  const pickerTitle = !picker ? '' : picker.action === 'stamp' ? 'Escolha a carta para carimbar' : picker.action === 'remove' ? `Remover carta ($${REMOVE_COST})` : `Clonar carta ($${CLONE_COST})`;

  return (
    <div className="shop">
      <header className="shop-head">
        <div>
          <h2>Bar do Lúcio — entre as mesas</h2>
          <div className="muted">Dívida: ${run.debt.toLocaleString('pt-BR')} · Próxima mesa: {run.tableIndex + 1}/8</div>
        </div>
        <div className="money big">$ {run.money.toLocaleString('pt-BR')}</div>
      </header>
      {msg && <div className="error">{msg}</div>}
      <div className="offers">
        {shop.offers.map((o, i) => {
          const sold = !!o.sold;
          const cant = !sold && run.money < o.price;
          let title = '';
          let desc = '';
          let extra = '';
          if (o.kind === 'relic') {
            const r = RELIC_BY_ID[o.id];
            title = r.name;
            desc = r.desc;
            extra = r.flavor;
          } else if (o.kind === 'hand') {
            const lv = run.handLevels[o.hand];
            const [c0, m0] = handValue(o.hand, lv);
            const [c1, m1] = handValue(o.hand, lv + 1);
            title = `${HAND_NAME[o.hand]} → nível ${lv + 1}`;
            desc = `${c0}×${m0} passa a ${c1}×${m1}.`;
          } else {
            title = ENH_INFO[o.enh].name;
            desc = `${ENH_INFO[o.enh].desc} Escolha uma carta do baralho.`;
          }
          return (
            <div key={i} className={`offer ${o.kind} ${sold ? 'sold' : ''}`}>
              <div className="kind">{o.kind === 'relic' ? 'Relíquia' : o.kind === 'hand' ? 'Melhoria de mão' : 'Carimbo'}</div>
              <h3>{title}</h3>
              <p>{desc}</p>
              {extra && <p className="flavor">{extra}</p>}
              <button
                className="btn primary"
                disabled={sold || cant}
                onClick={() => {
                  if (o.kind === 'relic') apply(buyRelic(run, shop, i));
                  else if (o.kind === 'hand') apply(buyHandUpgrade(run, shop, i));
                  else setPicker({ action: 'stamp', idx: i });
                }}
              >
                {sold ? 'Vendido' : `Comprar $${o.price}`}
              </button>
            </div>
          );
        })}
      </div>
      <div className="services">
        <button className="btn" disabled={run.money < rerollPrice(shop)} onClick={() => apply(reroll(run, shop))}>Renovar ofertas (${rerollPrice(shop)})</button>
        <button className="btn" disabled={shop.removeUsed || run.money < REMOVE_COST || run.deck.length <= MIN_DECK} onClick={() => setPicker({ action: 'remove' })}>
          Remover carta (${REMOVE_COST}){shop.removeUsed ? ' ✔' : ''}
        </button>
        <button className="btn" disabled={shop.cloneUsed || run.money < CLONE_COST || run.deck.length >= MAX_DECK} onClick={() => setPicker({ action: 'clone' })}>
          Clonar carta (${CLONE_COST}){shop.cloneUsed ? ' ✔' : ''}
        </button>
        <button className="btn" onClick={() => setView(true)}>Ver baralho ({run.deck.length})</button>
      </div>
      <div className="mine">
        <h3>Suas relíquias ({run.relics.length}/{MAX_RELICS})</h3>
        {run.relics.length === 0 && <p className="muted">Nenhuma ainda.</p>}
        <div className="relic-list">
          {run.relics.map((id) => {
            const r = RELIC_BY_ID[id];
            return (
              <div key={id} className="relic-own">
                <b>{r.name}</b>
                <span>{r.desc}</span>
                <button className="btn tiny" onClick={() => { sfx.coin(); onChange(sellRelic(run, id)); }}>Vender ${relicSell(r)}</button>
              </div>
            );
          })}
        </div>
      </div>
      <div className="shop-foot">
        <button className="btn primary big" onClick={onLeave}>Voltar ao salão ▸</button>
      </div>
      {(picker || view) && (
        <Modal title={view ? 'Seu baralho' : pickerTitle} onClose={() => { setPicker(null); setView(false); }} wide>
          <div className="deck-grid">
            {deck.map((c) => (
              <div key={c.id} className="deck-card" title={`${rankLabel(c.rank)}${SUIT_GLYPH[c.suit]}`}>
                <CardView card={c} small onClick={picker ? () => pick(c) : undefined} />
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

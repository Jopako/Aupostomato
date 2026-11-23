import { useState } from 'react';
import { SCENES, visibleHotspots } from '../story/scenes';
import { ITEMS } from '../story/data';
import { Ctx, Effect } from '../story/types';
import { PixelScene } from './Scenes';
import { OPPONENTS } from '../game/opponents';

interface Props {
  ctx: Ctx;
  locked: boolean;
  onEffects: (e: Effect[]) => void;
  onToast: (t: string) => void;
  onClues: () => void;
  onHelp: () => void;
  onMenu: () => void;
}

export function Explore({ ctx, locked, onEffects, onToast, onClues, onHelp, onMenu }: Props) {
  const [item, setItem] = useState<string | null>(null);
  const [hint, setHint] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const scene = SCENES[ctx.story.scene];
  const spots = visibleHotspots(scene, ctx);
  const run = ctx.run;
  const hovered = spots.find((s) => s.id === hover);

  const click = (id: string) => {
    if (locked) return;
    const h = spots.find((s) => s.id === id);
    if (!h) return;
    if (item) {
      const fn = h.use?.[item] ?? h.use?.['*'];
      setItem(null);
      if (!fn) return onToast('Isso não funciona aqui.');
      return onEffects(fn(ctx));
    }
    const effects = h.onClick(ctx);
    if (h.id === 'mesa' && ctx.story.flags.table_guidance) {
      onEffects([{ k: 'flag', key: 'table_guidance', value: false }, ...effects]);
      return;
    }
    onEffects(effects);
  };

  return (
    <div className="explore">
      <div className="topbar">
        <div className="where">
          <span className="loc">{scene.name}</span>
          {run && (
            <span className="progress" title="Mesas derrubadas">
              {OPPONENTS.map((o, i) => (
                <i key={o.id} className={i < run.tableIndex ? 'done' : i === run.tableIndex ? 'next' : ''} title={o.name} />
              ))}
            </span>
          )}
        </div>
        <div className="stats">
          {run ? (
            <>
              <span className="money" title="Dinheiro">$ {run.money.toLocaleString('pt-BR')}</span>
              <span className="debt" title="Dívida com o Tio Juros">Dívida $ {run.debt.toLocaleString('pt-BR')}</span>
            </>
          ) : (
            <span className="money muted">$ 0 — sem fichas</span>
          )}
        </div>
        <div className="tools">
          <button className="btn tiny" onClick={() => setHint((h) => !h)} aria-pressed={hint}>Dicas</button>
          <button className="btn tiny" onClick={onClues}>Pistas ({ctx.meta.clues.length})</button>
          <button className="btn tiny" onClick={onHelp}>? Regras</button>
          <button className="btn tiny" onClick={onMenu}>Menu</button>
        </div>
      </div>
      <div className={`stage ${item ? 'using' : ''}`}>
        <svg viewBox="0 0 1000 560" className="scene" role="img" aria-label={scene.name} preserveAspectRatio="xMidYMid meet">
          <PixelScene id={scene.id} />
          {spots.map((h) => (
            <g key={h.id}>
              <rect
                x={h.x}
                y={h.y}
                width={h.w}
                height={h.h}
                className={`hot ${h.exit ? 'exit' : ''} ${hint || hover === h.id ? 'show' : ''} ${h.id === 'mesa' && ctx.story.flags.table_guidance ? 'guided' : ''}`}
                onClick={() => click(h.id)}
                onMouseEnter={() => setHover(h.id)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(h.id)}
                onBlur={() => setHover(null)}
                tabIndex={locked ? -1 : 0}
                role="button"
                aria-label={`${h.label}${h.id === 'mesa' && ctx.story.flags.table_guidance ? ' — comece por aqui' : ''}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    click(h.id);
                  }
                }}
              />
              {h.id === 'mesa' && ctx.story.flags.table_guidance && (
                <g className="guided-callout" aria-hidden="true">
                  <text x={h.x + h.w / 2} y={h.y - 12} textAnchor="middle">COMECE AQUI</text>
                  <path d={`M${h.x + h.w / 2} ${h.y - 8} v14`} />
                </g>
              )}
            </g>
          ))}
        </svg>
        {hovered && (
          <div className="tooltip" style={{ left: `${((hovered.x + hovered.w / 2) / 1000) * 100}%`, top: `${(hovered.y / 560) * 100}%` }}>
            {item ? `Usar ${ITEMS[item]?.name} em ${hovered.label}` : hovered.label}
          </div>
        )}
      </div>
      <div className="inventory">
        <span className="inv-title">Inventário</span>
        {ctx.story.items.length === 0 && <span className="muted">vazio</span>}
        {ctx.story.items.map((id) => (
          <button key={id} className={`inv-item ${item === id ? 'sel' : ''}`} onClick={() => setItem(item === id ? null : id)} title={ITEMS[id]?.desc}>
            <span className="g">{ITEMS[id]?.glyph}</span>
            {ITEMS[id]?.name}
          </button>
        ))}
        {item && <span className="muted">Clique em um ponto da cena para usar o item.</span>}
      </div>
    </div>
  );
}

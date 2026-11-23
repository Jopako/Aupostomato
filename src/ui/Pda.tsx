import { formatTransition, PDADefinition, TraceStep, prettyStack, Transition } from '../pda/pda';
import { MESA_PDA, SYMBOL_INFO } from '../pda/mesaPda';

const R = 24;

function pos(def: PDADefinition, s: string, i: number): [number, number] {
  const p = def.layout?.positions[s];
  if (p) return p;
  return [60 + i * 110, 90];
}

function edgeText(ts: Transition[]) {
  return ts.map((t) => `${t.read ?? 'ε'},${t.pop}/${t.push.length ? t.push.join('') : 'ε'}`);
}

/** Diagrama de estados genérico: usa `def.layout` (ou uma linha reta) e agrupa transições com mesma origem/destino. */
export function PdaDiagram({ def = MESA_PDA, active, activeT }: { def?: PDADefinition; active: string; activeT: string | null }) {
  const W = def.layout?.width ?? 60 + def.states.length * 110;
  const H = def.layout?.height ?? 180;
  const groups = new Map<string, Transition[]>();
  for (const t of def.transitions) {
    const k = `${t.from}>${t.to}`;
    groups.set(k, [...(groups.get(k) ?? []), t]);
  }
  const idx = (s: string) => def.states.indexOf(s);
  const P = (s: string) => pos(def, s, idx(s));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="pda-diagram" role="img" aria-label="Diagrama de estados do autômato">
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="currentColor" />
        </marker>
      </defs>
      {(() => {
        const [x, y] = P(def.initialState);
        return <line x1={x - R - 26} y1={y} x2={x - R - 2} y2={y} className="edge" markerEnd="url(#arr)" />;
      })()}
      {[...groups.entries()].map(([k, ts]) => {
        const [a, b] = k.split('>');
        const hot = ts.some((t) => t.id === activeT);
        const [x1, y1] = P(a);
        const [x2, y2] = P(b);
        const lab = edgeText(ts);
        if (a === b) {
          return (
            <g key={k} className={`edge-g ${hot ? 'hot' : ''}`}>
              <path d={`M ${x1 - 12} ${y1 - R + 2} C ${x1 - 34} ${y1 - R - 40}, ${x1 + 34} ${y1 - R - 40}, ${x1 + 12} ${y1 - R + 2}`} className="edge" markerEnd="url(#arr)" />
              {lab.map((l, i) => (
                <text key={i} x={x1} y={y1 - R - 28 - (lab.length - 1 - i) * 11 + 8} textAnchor="middle">{l}</text>
              ))}
            </g>
          );
        }
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        const ux = dx / len;
        const uy = dy / len;
        const sx = x1 + ux * R;
        const sy = y1 + uy * R;
        const ex = x2 - ux * (R + 4);
        const ey = y2 - uy * (R + 4);
        const mx = (sx + ex) / 2;
        const my = (sy + ey) / 2;
        const horizontal = Math.abs(dy) < 1;
        return (
          <g key={k} className={`edge-g ${hot ? 'hot' : ''}`}>
            <line x1={sx} y1={sy} x2={ex} y2={ey} className="edge" markerEnd="url(#arr)" />
            <text x={horizontal ? mx : mx + 6} y={horizontal ? my - 6 : my - 2} textAnchor={horizontal ? 'middle' : 'start'}>{lab.join(' ')}</text>
          </g>
        );
      })}
      {def.states.map((s) => {
        const [x, y] = P(s);
        return (
          <g key={s} className={`state ${active === s ? 'on' : ''}`}>
            <circle cx={x} cy={y} r={R} />
            {def.finalStates.includes(s) && <circle cx={x} cy={y} r={R - 5} className="final" />}
            <text x={x} y={y + 5} textAnchor="middle" className="sname">{s}</text>
          </g>
        );
      })}
    </svg>
  );
}

export interface PdaPanelProps {
  def?: PDADefinition;
  state: string;
  /** pilha, da base ao topo (inclui o Z da base) */
  stack: string[];
  /** rótulo de cada X da pilha (ex.: "7♥"), da base ao topo, sem o Z */
  stackLabels?: string[];
  script: string;
  /** posição (0-based) do símbolo em processamento / último processado, ou -1 */
  head: number;
  lastTrace: TraceStep | null;
  /** mensagem de bloqueio quando o autômato não tem transição para o movimento tentado */
  blocked?: string | null;
  verdict?: { ok: boolean; text: string } | null;
  compact?: boolean;
  title?: string;
  recent?: { t: Transition; note: string }[];
}

export function PdaPanel(p: PdaPanelProps) {
  const def = p.def ?? MESA_PDA;
  const op = p.lastTrace?.op;
  const sym = p.head >= 0 ? p.script[p.head] : null;
  const stack = p.stack.slice().reverse();
  const nX = p.stack.length - 1;
  return (
    <div className={`pda ${p.compact ? 'compact' : ''}`}>
      <div className="pda-title">
        <strong>{p.title ?? 'Autômato com Pilha'}</strong>
        <span className="pda-lang">{def.states.length} estados</span>
      </div>
      <PdaDiagram def={def} active={p.state} activeT={p.lastTrace?.transitionId ?? null} />
      <div className="pda-live" aria-live="polite">
        <div><span className="lbl">Estado atual</span><b className="st">{p.state}</b></div>
        <div>
          <span className="lbl">Símbolo processado</span>
          <b className={`sy ${sym ? 'sym-' + sym : ''}`}>{sym ?? '—'}</b>
          {sym && <span className="muted sy-info"> {SYMBOL_INFO[sym]?.name}</span>}
        </div>
        <div><span className="lbl">Topo / profundidade</span><b>{p.stack[p.stack.length - 1] === 'Z' ? 'Z₀' : 'X'} · {nX}</b></div>
      </div>
      <div className="pda-row">
        <div className="tape-wrap">
          <div className="lbl">Roteiro (fita de entrada)</div>
          <div className="tape">
            {p.script.length === 0 && <span className="tape-empty">ε — ande pelo mapa (WASD / setas)</span>}
            {p.script.split('').map((s, i) => (
              <span key={i} className={`cell sym-${s} ${i === p.head ? 'head' : ''}`}>{s}</span>
            ))}
          </div>
          {p.lastTrace && (
            <div className="log-line">
              <code>{formatTransition(def.transitions.find((t) => t.id === p.lastTrace!.transitionId)!)}</code>
            </div>
          )}
          {p.recent && p.recent.length > 0 && (
            <div className="pda-log">
              {p.recent.map((r, i) => (
                <div key={i} className="log-line"><code>{formatTransition(r.t)}</code><span>{r.note}</span></div>
              ))}
            </div>
          )}
        </div>
        <div className="stack-wrap">
          <div className="lbl">Pilha (topo ↑)</div>
          <div className={`stack ${op ?? ''}`}>
            {stack.map((s, i) => {
              const fromBase = p.stack.length - 1 - i;
              const lab = s === 'Z' ? undefined : p.stackLabels?.[fromBase - 1];
              return (
                <span key={`${fromBase}-${s}`} className={`slot ${s === 'Z' ? 'base' : 'a'} ${i === 0 && op === 'PUSH' ? 'pushed' : ''}`}>
                  {s === 'Z' ? prettyStack('Z') : lab ? `X ${lab}` : s}
                </span>
              );
            })}
          </div>
        </div>
      </div>
      {p.blocked ? <div className="verdict no">⛔ {p.blocked}</div> : p.verdict ? <div className={`verdict ${p.verdict.ok ? 'ok' : 'no'}`}>{p.verdict.text}</div> : <div className="verdict muted">Em andamento…</div>}
    </div>
  );
}

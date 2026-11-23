import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, rankLabel, SUIT_GLYPH } from '../game/cards';
import { discardMapCard, MatchState, MAX_PLAY, playRound, redeal } from '../game/match';
import { available, Dir, isStuck, move, newWalk, pathTo, replayStacks, Walk, getLayout } from '../game/maze';
import { describeRules, OpponentDef } from '../game/opponents';
import { HAND_NAME, HAND_TYPES, handValue } from '../game/poker';
import { RELIC_BY_ID } from '../game/relics';
import { scoreHand, ScoreEvent, ScoreResult } from '../game/scoring';
import { MESA_PDA } from '../pda/mesaPda';
import { CardView } from './CardView';
import { MapView } from './MapView';
import { PdaPanel } from './Pda';
import { Portrait } from './Portrait';
import { sfx } from './audio';

interface Anim {
  result: ScoreResult;
  next: MatchState;
  walk: Walk;
  pushed: Card[];
  stage: 'pda' | 'score' | 'total';
  i: number;
}

interface HistoryEntry {
  walk: Walk;
  match: MatchState;
}

export function running(events: ScoreEvent[], upTo: number) {
  let chips = 0;
  let mult = 0;
  let factor = 1;
  for (let k = 0; k <= upTo && k < events.length; k++) {
    const e = events[k];
    if (e.kind === 'base') {
      chips = e.chips ?? 0;
      mult = e.mult ?? 0;
    } else if (e.kind === 'card') {
      chips += e.chips ?? 0;
      mult += e.mult ?? 0;
    } else if (e.kind === 'pda-pop') chips += e.chips ?? 0;
    else if (e.kind === 'relic') {
      chips += e.chips ?? 0;
      mult += e.mult ?? 0;
      if (e.xmult) mult *= e.xmult;
    } else if (e.kind === 'pda-accept') mult *= e.xmult ?? 1;
    else if (e.kind === 'rule') factor *= e.xmult ?? 1;
  }
  return { chips, mult, factor };
}

function fmtEvent(e: ScoreEvent): string {
  const parts: string[] = [];
  if (e.chips) parts.push(`+${e.chips} fichas`);
  if (e.mult) parts.push(`+${e.mult} mult`);
  if (e.xmult) parts.push(`×${Number.isInteger(e.xmult) ? e.xmult : e.xmult.toFixed(2)} mult`);
  if (e.money) parts.push(`+$${e.money}`);
  return parts.join(' · ');
}

const lab = (c: Card) => `${rankLabel(c.rank)}${SUIT_GLYPH[c.suit]}`;
const KEYS: Record<string, Dir> = { w: 'up', a: 'left', s: 'down', d: 'right', arrowup: 'up', arrowleft: 'left', arrowdown: 'down', arrowright: 'right' };

interface Props {
  opponent: OpponentDef;
  initial: MatchState;
  showTutorial: boolean;
  onEnd: (m: MatchState) => void;
  onHelp: () => void;
  onAuto: () => void;
  onForfeit: () => void;
  onTutorialDone: () => void;
}

const GUIDE_STEPS = [
  {
    title: '1. Pegue cartas',
    text: 'Ande pelo mapa usando WASD, as setas ou clique em um tile. Pisar numa carta lê o símbolo a (PUSH) e empilha essa carta. Você pode pegar até cinco.',
  },
  {
    title: '2. Entregue pelas portas',
    text: 'Cada porta lê b (POP): tira a carta do topo da pilha e a entrega à sua mão. O lixo lê d: descarta essa carta e repõe a vaga com outra do baralho. Você tem 4 descartes para dividir entre todas as mãos da mesa.',
  },
  {
    title: '3. Saia pelo portal',
    text: 'O portal lê c e só aceita quando a pilha está vazia e você entregou ao menos uma carta. Z desfaz a última ação importante, R reinicia o caminho; depois, pressione Enter para jogar a mão.',
  },
];

export function MatchView({ opponent, initial, showTutorial, onEnd, onHelp, onAuto, onForfeit, onTutorialDone }: Props) {
  const [m, setM] = useState<MatchState>(initial);
  const layout = getLayout(m.layoutId);
  const [walk, setWalk] = useState<Walk>(() => newWalk(getLayout(initial.layoutId)));
  const [hist, setHist] = useState<HistoryEntry[]>([]);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [anim, setAnim] = useState<Anim | null>(null);
  const [levels, setLevels] = useState(false);
  const [showAutomaton, setShowAutomaton] = useState(true);
  const [focusAutomaton, setFocusAutomaton] = useState(false);
  const [guideStep, setGuideStep] = useState<number | null>(showTutorial ? 0 : null);
  const endedRef = useRef(false);
  const queue = useRef<Dir[]>([]);

  const cards = m.hand as (Card | null)[];
  const active = m.hand.length;
  const isDebuffed = (c: Card) => !!(m.rules.debuffSuits?.includes(c.suit) || (m.rules.debuffFaces && c.rank >= 11 && c.rank <= 13));

  // refs para o teclado / clique-para-andar sempre verem o estado atual
  const live = useRef({ m, walk, hist, anim });
  live.current = { m, walk, hist, anim };

  const resetWalk = useCallback((mm: MatchState) => {
    queue.current = [];
    setWalk(newWalk(getLayout(mm.layoutId)));
    setHist([]);
    setBlocked(null);
  }, []);

  const step = useCallback((dir: Dir) => {
    const { m: mm, walk: w, anim: an } = live.current;
    if (an || mm.status !== 'playing') return;
    const p = getLayout(mm.layoutId);
    const hasReplacement = mm.drawPile.length > 0 || mm.discardPile.length > 0;
    const trashDiscards = hasReplacement ? mm.trashDiscardsLeft : 0;
    const r = move(p, mm.hand, mm.hand.length, w, dir, trashDiscards);
    if (r.kind === 'wall' || r.kind === 'done') return;
    if (r.kind === 'blocked') {
      queue.current = [];
      setBlocked(r.message);
      setShake((s) => s + 1);
      sfx.reject();
      return;
    }
    setBlocked(null);
    if (r.event) {
      setHist((h) => [...h, { walk: w, match: mm }]);
      if (r.event.symbol === 'd' && r.event.slot !== undefined) {
        const nextMatch = discardMapCard(mm, r.event.slot);
        setM(nextMatch);
        live.current = { ...live.current, m: nextMatch };
      }
      r.event.symbol === 'a' ? sfx.push() : r.event.symbol === 'b' || r.event.symbol === 'd' ? sfx.pop() : sfx.accept();
    }
    setWalk(r.walk);
  }, []);

  // andar clicando no mapa: executa o caminho, um passo por vez
  useEffect(() => {
    const id = setInterval(() => {
      const d = queue.current.shift();
      if (d) step(d);
    }, 85);
    return () => clearInterval(id);
  }, [step]);

  const undo = useCallback(() => {
    const { hist: h, anim: an } = live.current;
    if (an || h.length === 0) return;
    queue.current = [];
    const previous = h[h.length - 1];
    setWalk(previous.walk);
    setM(previous.match);
    live.current = { ...live.current, m: previous.match, walk: previous.walk };
    setHist(h.slice(0, -1));
    setBlocked(null);
    sfx.click();
  }, []);

  const restart = useCallback(() => {
    if (live.current.anim) return;
    resetWalk(live.current.m);
    sfx.click();
  }, [resetWalk]);

  const finish = useCallback((a: Anim) => {
    setM(a.next);
    setAnim(null);
    resetWalk(a.next);
    if (a.next.status !== 'playing' && !endedRef.current) {
      endedRef.current = true;
      a.next.status === 'won' ? sfx.win() : sfx.lose();
      setTimeout(() => onEnd(a.next), 900);
    }
  }, [onEnd, resetWalk]);

  const doPlay = useCallback(() => {
    const { m: mm, walk: w, anim: an } = live.current;
    if (an) {
      if (an.stage === 'total') finish(an);
      return;
    }
    if (!w.done) return;
    try {
      const { state, result } = playRound(mm, w);
      setAnim({ result, next: state, walk: w, pushed: w.pushedCards, stage: 'pda', i: -1 });
    } catch (e) {
      setBlocked((e as Error).message);
    }
  }, [finish]);

  const doRedeal = () => {
    if (anim || m.discardsLeft <= 0 || m.status !== 'playing') return;
    const nm = redeal(m);
    setM(nm);
    resetWalk(nm);
    sfx.card();
  };

  const dismissGuide = () => {
    setGuideStep(null);
    onTutorialDone();
  };

  // teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('.modal-back')) return;
      const k = e.key.toLowerCase();
      const dir = KEYS[k];
      if (dir && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        queue.current = [];
        step(dir);
      } else if (k === 'enter') {
        e.preventDefault();
        doPlay();
      } else if (k === 'z' || k === 'backspace') {
        undo();
      } else if (k === 'r') {
        restart();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, doPlay, undo, restart]);

  const onTile = (x: number, y: number) => {
    if (anim || walk.done) return;
    const canReplace = m.drawPile.length > 0 || m.discardPile.length > 0;
    const path = pathTo(layout, cards, active, walk, x, y, canReplace ? m.trashDiscardsLeft : 0);
    if (path && path.length) queue.current = path;
  };

  // sequenciador da animação (reproduz o roteiro no PDA e depois a pontuação)
  useEffect(() => {
    if (!anim) return;
    const { result, stage, i, walk: w } = anim;
    const nTr = w.trace.length;
    const nEv = result.events.length;
    let t: ReturnType<typeof setTimeout> | undefined;
    if (stage === 'pda') {
      if (i < nTr - 1) {
        t = setTimeout(() => {
          const s = w.trace[i + 1];
          s.op === 'PUSH' ? sfx.push() : s.op === 'POP' ? sfx.pop() : sfx.click();
          setAnim({ ...anim, i: i + 1 });
        }, i < 0 ? 250 : 260);
      } else {
        t = setTimeout(() => {
          sfx.accept();
          setAnim({ ...anim, stage: 'score', i: -1 });
        }, 500);
      }
    } else if (stage === 'score') {
      if (i < nEv - 1) {
        t = setTimeout(() => {
          sfx.chip();
          setAnim({ ...anim, i: i + 1 });
        }, i < 0 ? 500 : 400);
      } else t = setTimeout(() => setAnim({ ...anim, stage: 'total' }), 450);
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [anim]); // eslint-disable-line react-hooks/exhaustive-deps

  const estimate = useMemo(() => {
    if (walk.delivered.length === 0) return null;
    const depthBelow: Record<number, number> = {};
    walk.delivered.forEach((d) => (depthBelow[d.card.id] = d.depthBelow));
    return scoreHand({
      played: walk.delivered.map((d) => d.card), depthBelow, maxDepth: walk.maxDepth, script: walk.script,
      handLevels: m.handLevels, relics: m.relics, rules: m.rules, firstHand: m.firstHand,
      handsLeftAfter: m.handsLeft - 1, inDebt: m.inDebt, deckRemaining: m.drawPile.length, lastHandType: m.lastHandType, rng: () => 1,
    });
  }, [walk, m]);

  const availableSymbols = useMemo(() => available(walk), [walk]);
  const canReplace = m.drawPile.length > 0 || m.discardPile.length > 0;
  const can = {
    ...availableSymbols,
    d: availableSymbols.d && m.trashDiscardsLeft > 0 && canReplace,
  };
  const stuck = isStuck(layout, walk, can.d ? m.trashDiscardsLeft : 0);
  const shownScore = anim && anim.stage === 'total' ? anim.next.score : m.score;
  const pct = Math.min(100, (shownScore / m.target) * 100);
  const tally = anim ? running(anim.result.events, anim.stage === 'pda' ? -1 : anim.stage === 'total' ? anim.result.events.length - 1 : anim.i) : null;
  const ruleTxt = describeRules(m.rules);
  const scoringIds = new Set(estimate?.scoring.map((c) => c.id) ?? []);
  const scoringCards = walk.delivered.filter((d) => scoringIds.has(d.card.id));
  const remainingCards = walk.delivered.filter((d) => !scoringIds.has(d.card.id));
  const remainingLabel = estimate && ['high', 'pair', 'twoPair', 'three', 'four'].includes(estimate.handType)
    ? 'Kickers sem pontos próprios'
    : 'Cartas restantes sem pontos próprios';

  // o que o painel do PDA mostra: a caminhada ao vivo ou a reprodução da animação
  let pda;
  if (anim && anim.stage === 'pda') {
    const stacks = replayStacks(anim.walk.script, anim.pushed);
    const i = anim.i;
    const tr = i >= 0 ? anim.walk.trace[i] : null;
    pda = {
      state: tr ? tr.to : MESA_PDA.initialState,
      stack: tr ? tr.stackAfter : [MESA_PDA.initialStack],
      labels: i >= 0 ? stacks[i].map(lab) : [],
      script: anim.walk.script,
      head: i,
      lastTrace: tr,
      verdict: null as { ok: boolean; text: string } | null,
    };
  } else {
    const w = anim ? anim.walk : walk;
    const labels = w.stackCards.map(lab);
    pda = {
      state: w.cfg.state,
      stack: w.cfg.stack,
      labels,
      script: w.script,
      head: w.script.length - 1,
      lastTrace: w.trace.length ? w.trace[w.trace.length - 1] : null,
      verdict: w.done
        ? { ok: true, text: `✔ ACEITA — estado ${w.cfg.state} (final), pilha Z₀` }
        : stuck
          ? { ok: false, text: '✘ Sem saída: há mais cartas na pilha do que portas livres. Desfaça (Z) ou reinicie (R).' }
          : null,
    };
  }

  const automatonPanel = (
    <PdaPanel
      state={pda.state}
      stack={pda.stack}
      stackLabels={pda.labels}
      script={pda.script}
      head={pda.head}
      lastTrace={pda.lastTrace}
      blocked={anim ? null : blocked}
      verdict={pda.verdict}
    />
  );

  return (
    <div className="match">
      <header className="m-head">
        <div className="opp">
          <Portrait spec={opponent.portrait} size={74} />
          <div className="opp-info">
            <h2>{opponent.name}</h2>
            <div className="muted">{opponent.title} · {layout.name}</div>
            <div className="rule" title={opponent.ruleDesc}>
              <b>{opponent.ruleName}:</b> {opponent.boss ? (ruleTxt.length ? ruleTxt.join(', ') : 'sem trapaças (pistas!)') : opponent.ruleDesc}
            </div>
          </div>
        </div>
        <div className="scorebox">
          <div className="lbl">Meta {m.target.toLocaleString('pt-BR')}</div>
          <div className="bar"><i style={{ width: `${pct}%` }} /></div>
          <div className="score">{shownScore.toLocaleString('pt-BR')}</div>
        </div>
        <div className="counters">
          <div><b>{m.handsLeft}</b><span>mãos</span></div>
          <div><b>{m.discardsLeft}</b><span>mapas novos</span></div>
          <div><b>{m.trashDiscardsLeft}</b><span>descartes de carta</span></div>
        </div>
      </header>

      <div className="automaton-controls">
        <label className="automaton-toggle">
          <input
            type="checkbox"
            checked={showAutomaton}
            onChange={(e) => {
              setShowAutomaton(e.target.checked);
              if (!e.target.checked) setFocusAutomaton(false);
            }}
          />
          Mostrar autômato
        </label>
        {showAutomaton && (
          <button className="btn tiny" onClick={() => setFocusAutomaton(true)} disabled={focusAutomaton}>
            Ampliar autômato
          </button>
        )}
        <button className="btn tiny" onClick={() => setGuideStep(0)}>Guia rápido</button>
      </div>

      {guideStep !== null && (
        <div className="modal-back">
          <section className="modal tutorial-modal" role="dialog" aria-modal="true" aria-labelledby="match-guide-title">
            <header className="modal-head">
              <h2 id="match-guide-title">Como jogar esta mesa</h2>
              <span className="muted">{guideStep + 1}/{GUIDE_STEPS.length}</span>
            </header>
            <div className="modal-body">
              <div className="guide-progress" aria-hidden="true">
                {GUIDE_STEPS.map((_, i) => <i key={i} className={i <= guideStep ? 'active' : ''} />)}
              </div>
              <h3>{GUIDE_STEPS[guideStep].title}</h3>
              <p>{GUIDE_STEPS[guideStep].text}</p>
              <p className="guide-hint">O mapa e o painel do autômato mostram em tempo real o que cada passo faz.</p>
              <div className="guide-actions">
                <button className="btn" onClick={dismissGuide}>Pular guia</button>
                <button
                  className="btn primary"
                  onClick={() => guideStep === GUIDE_STEPS.length - 1 ? dismissGuide() : setGuideStep(guideStep + 1)}
                >
                  {guideStep === GUIDE_STEPS.length - 1 ? 'Começar a jogar' : 'Próximo'}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      <div className={`m-body ${showAutomaton ? '' : 'pda-hidden'} ${focusAutomaton ? 'automaton-focused' : ''}`}>
        {showAutomaton && !focusAutomaton && (
          <section className="pda-col">
            {automatonPanel}
          </section>
        )}
        <section className="play-col">
          {anim && anim.stage !== 'pda' ? (
            <div className="scoring" role="status" aria-live="polite">
              <div className="played">
                {anim.walk.delivered.map((d) => (
                  <CardView key={d.card.id} card={d.card} small scoring={anim.result.scoring.some((s) => s.id === d.card.id)} />
                ))}
              </div>
              <div className="handname">{HAND_NAME[anim.result.handType]} <span className="muted">· roteiro "{anim.result.word}"</span></div>
              <div className="score-labels">
                <span>Fichas</span>
                <span>Multiplicador</span>
                {tally!.factor !== 1 && <span>Regra da mesa</span>}
                {anim.stage === 'total' && <span>Total</span>}
              </div>
              <div className="calc">
                <span className="chips">{Math.round(tally!.chips)}</span> × <span className="mult">{Number.isInteger(tally!.mult) ? tally!.mult : tally!.mult.toFixed(1)}</span>
                {tally!.factor !== 1 && <span className="factor"> × {tally!.factor}</span>}
                {anim.stage === 'total' && <span className="totalpts"> = {anim.result.total.toLocaleString('pt-BR')}</span>}
              </div>
              <div className="score-notes">
                <span>{anim.result.pops} {anim.result.pops === 1 ? 'carta entregue' : 'cartas entregues'}</span>
                <span>Pilha máxima {anim.result.maxDepth} · bônus do PDA ×{anim.result.depthX.toFixed(2).replace(/\.?0+$/, '')}</span>
                {anim.result.money > 0 && <span>Dinheiro ganho: +${anim.result.money}</span>}
              </div>
              <ul className="events">
                {anim.result.events.slice(0, anim.stage === 'total' ? undefined : anim.i + 1).map((e, k) => (
                  <li key={k} className={`ev-${e.kind}`}>
                    <b>{e.kind === 'base' ? `${HAND_NAME[anim.result.handType]} ${e.label}` : e.label}</b>
                    <span>{fmtEvent(e)}</span>
                  </li>
                ))}
              </ul>
              {anim.stage === 'total' ? (
                <button className="btn primary" onClick={() => finish(anim)}>Próxima mão ▶ (Enter)</button>
              ) : (
                <div className="muted skip">Acompanhe a execução do autômato e a pontuação…</div>
              )}
            </div>
          ) : (
            <>
              <MapView layout={layout} cards={cards} active={active} walk={anim ? anim.walk : walk} can={can} shake={shake} debuffed={isDebuffed} onTile={onTile} />
              <div className="dpad" aria-label="Direções">
                <button className="btn tiny" onClick={() => step('up')} aria-label="Cima">▲</button>
                <div>
                  <button className="btn tiny" onClick={() => step('left')} aria-label="Esquerda">◀</button>
                  <button className="btn tiny" onClick={() => step('down')} aria-label="Baixo">▼</button>
                  <button className="btn tiny" onClick={() => step('right')} aria-label="Direita">▶</button>
                </div>
              </div>
              <div className="map-legend muted">
                <span className="lg card">carta</span> = a (PUSH) · <span className="lg door">porta</span> = b (entrega) · <span className="lg trash">lixo</span> = d (descarta) · <span className="lg portal">portal</span> = c
              </div>
            </>
          )}
          <div className="relics">
            {m.relics.length === 0 && <span className="muted">Sem relíquias.</span>}
            {m.relics.map((id) => (
              <span key={id} className="relic" title={`${RELIC_BY_ID[id].name}: ${RELIC_BY_ID[id].desc}`}>{RELIC_BY_ID[id].name}</span>
            ))}
            <button className="btn tiny" onClick={() => setLevels((l) => !l)}>{levels ? 'Ocultar níveis' : 'Níveis das mãos'}</button>
            <button className="btn tiny" onClick={onAuto}>⚙ Autômato</button>
            <button className="btn tiny" onClick={onHelp}>? Regras</button>
          </div>
          {levels && (
            <table className="tbl levels">
              <tbody>
                {HAND_TYPES.map((h) => {
                  const [c, mu] = handValue(h, m.handLevels[h]);
                  return (
                    <tr key={h}><td>{HAND_NAME[h]}</td><td>nv. {m.handLevels[h]}</td><td>{c} × {mu}</td></tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
      {focusAutomaton && showAutomaton && (
        <div className="automaton-focus-back">
          <section className="automaton-focus">
            <div className="automaton-focus-head">
              <strong>Autômato com Pilha — visualização ampliada</strong>
              <button className="btn" onClick={() => setFocusAutomaton(false)}>Diminuir</button>
            </div>
            {automatonPanel}
          </section>
        </div>
      )}

      <footer className="m-foot">
        <div className="deliv-title muted">
          Mão montada pelo caminho ({walk.delivered.length}/{MAX_PLAY}) — na ordem de entrega
          {estimate && <> · {HAND_NAME[estimate.handType]} · pilha máx. {walk.maxDepth} (×{estimate.depthX.toFixed(2).replace(/\.?0+$/, '')}) · <b>≈ {estimate.total.toLocaleString('pt-BR')}</b></>}
        </div>
        <div className="hand delivered" role="group" aria-label="Cartas entregues">
          {Array.from({ length: MAX_PLAY }).map((_, i) => {
            const d = walk.delivered[i];
            return d ? (
              <CardView
                key={d.card.id}
                card={d.card}
                small
                order={i + 1}
                debuffed={isDebuffed(d.card)}
                scoring={scoringIds.has(d.card.id)}
              />
            ) : <span key={i} className="card-ph">{i + 1}</span>;
          })}
        </div>
        {estimate && walk.delivered.length > 0 && (
          <div className="hand-explanation" aria-live="polite">
            <div><i className="score-key" /> <b>Cartas da combinação:</b> {scoringCards.map((d) => lab(d.card)).join(', ')}</div>
            {remainingCards.length > 0 && (
              <div><b>{remainingLabel}:</b> {remainingCards.map((d) => lab(d.card)).join(', ')} — não adicionam fichas próprias.</div>
            )}
            {scoringCards.some((d) => isDebuffed(d.card)) && (
              <div className="debuff-note">Uma ou mais cartas da combinação estão enfraquecidas pela regra da mesa e não somam seus efeitos.</div>
            )}
          </div>
        )}
        <div className="actions">
          <button className="btn primary" onClick={doPlay} disabled={!!anim || !walk.done || m.handsLeft <= 0}>{walk.done ? 'Jogar mão ▶ (Enter)' : 'Chegue ao portal'}</button>
          <button className="btn" onClick={undo} disabled={!!anim || hist.length === 0}>Desfazer (Z)</button>
          <button className="btn" onClick={restart} disabled={!!anim || walk.steps === 0}>Reiniciar (R)</button>
          <button className="btn" onClick={doRedeal} disabled={!!anim || m.discardsLeft <= 0} title="Gasta 1 descarte: embaralha cartas novas no mapa">Novo mapa ({m.discardsLeft})</button>
          <span className="sep" />
          <button className="btn tiny danger" onClick={() => window.confirm('Desistir da tentativa? Você perde a mesa atual e a campanha.') && onForfeit()}>Desistir</button>
        </div>
        <div className="legend muted">
          WASD / setas movem · clique num tile para andar até lá · cartas pisadas são empilhadas à força · {rankLabel(14)} vale 11 fichas
        </div>
      </footer>
    </div>
  );
}

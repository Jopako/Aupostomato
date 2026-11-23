import { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { formatDefinition, formatTransition, runPDA, toJFF } from '../pda/pda';
import { explainReject, MESA_PDA, SYMBOL_INFO } from '../pda/mesaPda';
import { PdaPanel } from './Pda';
import { CLUES, CORE_CLUES } from '../story/data';
import { buyMetaUpgrade, META_UPGRADES, Meta, metaLevel, metaUpgradeCost } from '../game/state';
import { OPPONENTS } from '../game/opponents';
import { HAND_BASE, HAND_NAME, HAND_TYPES } from '../game/poker';
import { RELICS } from '../game/relics';

export function Modal({ title, onClose, children, wide, className = '' }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean; className?: string }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className={`modal ${wide ? 'wide' : ''} ${className}`.trim()} role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn tiny" onClick={onClose} aria-label="Fechar">✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export const EXAMPLES: { script: string; title: string; story: string }[] = [
  { script: 'aabbc', title: 'Duas cartas, duas portas', story: 'Capri pega 2 cartas, entrega as 2 (a última pega é a primeira entregue) e cruza o portal. Pilha vazia no fim: ACEITA.' },
  { script: 'ababc', title: 'Pega e entrega, uma a uma', story: 'Pega, entrega, pega, entrega: a pilha nunca passa de 1 carta. ACEITA, mas rende pouco multiplicador de profundidade.' },
  { script: 'abbc', title: 'Porta sem carta', story: 'Capri tenta entregar uma 2ª carta com a pilha vazia: não existe δ(q1, b, Z). REJEITADA.' },
  { script: 'aabc', title: 'Portal com carta na pilha', story: 'Sobrou uma carta na pilha: o portal exige o topo Z₀ e o autômato não tem δ(q1, c, X). REJEITADA.' },
  { script: 'aaaaaabbbbbbc', title: 'Mão cheia (6 cartas)', story: 'O estado só conta até q5: com 5 cartas entregues não há δ(q5, b, X). REJEITADA — a mão máxima é 5.' },
];

function downloadJff() {
  const blob = new Blob([toJFF(MESA_PDA)], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'aupostomato-pda.jff';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Laboratório: digite um roteiro (letras a/b/c) e veja o autômato processá-lo passo a passo. */
export function ScriptLab({ initial = 'aabbc' }: { initial?: string }) {
  const [text, setText] = useState(initial);
  const [step, setStep] = useState(-1);
  const [auto, setAuto] = useState(false);
  const word = useMemo(() => text.replace(/[^a-z]/gi, '').toLowerCase().split(''), [text]);
  const res = useMemo(() => runPDA(MESA_PDA, word), [word]);
  const n = res.steps.length;
  const finished = step >= n - 1;

  useEffect(() => {
    setStep(-1);
    setAuto(false);
  }, [text]);
  useEffect(() => {
    if (!auto) return;
    if (step >= n - 1) {
      setAuto(false);
      return;
    }
    const t = setTimeout(() => setStep((s) => s + 1), 520);
    return () => clearTimeout(t);
  }, [auto, step, n]);

  const cur = step >= 0 ? res.steps[step] : null;
  const prev = res.steps.slice(Math.max(0, step - 2), step + 1);
  const showVerdict = finished && (step >= 0 || n === 0);
  return (
    <div className="lab">
      <div className="lab-in">
        <label htmlFor="roteiro">Roteiro (letras a, b, c):</label>
        <input id="roteiro" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} autoComplete="off" maxLength={40} />
        <button className="btn primary" onClick={() => { setStep(-1); setAuto(true); }}>▶ Executar</button>
        <button className="btn" onClick={() => setStep((s) => Math.min(n - 1, s + 1))} disabled={finished}>Passo →</button>
        <button className="btn" onClick={() => { setAuto(false); setStep(-1); }}>↺</button>
      </div>
      <div className="lab-ex">
        {EXAMPLES.map((e) => (
          <button key={e.script} className={`btn tiny ${text === e.script ? 'primary' : ''}`} onClick={() => setText(e.script)} title={e.story}>{e.script}</button>
        ))}
      </div>
      <p className="muted lab-sym">
        {Object.entries(SYMBOL_INFO).map(([k, v]) => (
          <span key={k}><b>{k}</b> = {v.name} ({v.what}) </span>
        ))}
      </p>
      <PdaPanel
        title="Execução do roteiro"
        state={cur ? cur.to : MESA_PDA.initialState}
        stack={cur ? cur.stackAfter : [MESA_PDA.initialStack]}
        script={word.join('')}
        head={cur?.readPos ?? -1}
        lastTrace={cur}
        recent={prev.map((s) => ({ t: MESA_PDA.transitions.find((t) => t.id === s.transitionId)!, note: s.note }))}
        verdict={
          showVerdict
            ? res.accepted
              ? { ok: true, text: `✔ ACEITA — terminou em ${res.finalConfig.state} (estado final) com a pilha em Z₀.` }
              : { ok: false, text: `✘ REJEITADA — ${explainReject(res)}` }
            : null
        }
      />
      {EXAMPLES.find((e) => e.script === text) && <p className="lab-story">{EXAMPLES.find((e) => e.script === text)!.story}</p>}
    </div>
  );
}

export function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Como jogar" onClose={onClose} wide className="readable">
      <section>
        <h3>A mesa é um mapa</h3>
        <ul>
          <li>As cartas da rodada estão <b>espalhadas pelo mapa</b>. Ande com <b>WASD</b> ou as <b>setas</b> (ou clique num tile) e monte a melhor mão de poker, de 1 a 5 cartas, entregando-as nas portas.</li>
          <li>Pontuação = <b>fichas × mult</b>, como no Balatro. A categoria de poker é definida pelo conjunto de cartas entregues, independentemente da ordem; a ordem afeta a pilha e os bônus de profundidade.</li>
          <li>Você tem um número limitado de <b>mãos</b> e <b>mapas novos</b> (embaralha cartas novas). Chegue à meta antes que as mãos acabem.</li>
          <li>Entre as mesas há uma loja. Se perder, a tentativa acaba e você ganha Fichas Douradas para o Caderno do Lúcio.</li>
        </ul>
        <h3>O autômato com pilha (PDA) manda no caminho</h3>
        <ul>
          <li>Pisar numa <b>carta</b> = símbolo <b>a</b> (PUSH X): a carta vai para o <b>topo da pilha</b>. Pisar é obrigatório: não dá para passar por cima de uma carta.</li>
          <li>Pisar numa <b>porta</b> = símbolo <b>b</b> (POP X): sai a carta do <b>topo</b> da pilha e vai para a sua mão. Cada porta abre uma vez. Sem carta na pilha, a porta fica trancada.</li>
          <li>O <b>portal</b> = símbolo <b>c</b>: só abre com a <b>pilha vazia</b> e ao menos 1 carta entregue. Chegar nele = o PDA <b>aceita</b> e a mão é jogada.</li>
          <li>A pilha é <b>LIFO</b>: a última carta que você pegou é a primeira a ser entregue. Planeje a ordem!</li>
          <li>Cada entrega rende <b>+10 fichas</b>. Quanto <b>mais funda</b> a pilha chegou, maior o multiplicador final: <b>×(1 + 0,5 × profundidade)</b>.</li>
          <li>A <b>Carta Fundo de Pilha</b> dá +3 mult por carta que ainda estava embaixo dela ao ser entregue.</li>
          <li>Sem saída? <b>Z</b> desfaz a última ação, <b>R</b> reinicia o percurso (de graça).</li>
        </ul>
        <h3>Exploração</h3>
        <ul>
          <li>Clique nos pontos da cena. O botão <b>Dicas</b> destaca tudo o que é clicável. Clique em um item do inventário para usá-lo na cena.</li>
          <li>Converse com todo mundo: as pistas enfraquecem as trapaças da Madame Ônix no final.</li>
        </ul>
        <p className="muted">Atalhos nos diálogos: Enter/Espaço avançam, 1–4 escolhem uma opção. Em <b>⚙ Autômato</b> você digita roteiros e vê o PDA em ação.</p>
      </section>
    </Modal>
  );
}

export function AutomatonModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'lab' | 'def'>('lab');
  return (
    <Modal title="O autômato com pilha" onClose={onClose} wide className="automaton-modal">
      <div className="tabs">
        <button className={`btn tiny ${tab === 'lab' ? 'primary' : ''}`} onClick={() => setTab('lab')}>Laboratório de roteiros</button>
        <button className={`btn tiny ${tab === 'def' ? 'primary' : ''}`} onClick={() => setTab('def')}>Definição formal</button>
        <button className="btn tiny" onClick={downloadJff} title="Abra no JFLAP: File → Open">⬇ Baixar .jff (JFLAP)</button>
      </div>
      {tab === 'lab' ? (
        <ScriptLab />
      ) : (
        <>
          <p>P = (Q, Σ, Γ, δ, q₀, Z₀, F), reconhecendo <b>{MESA_PDA.name}</b> por estado final.</p>
          <ul className="defn">
            {formatDefinition(MESA_PDA).map((l) => (
              <li key={l}><code>{l}</code></li>
            ))}
          </ul>
          <h3>Função de transição δ</h3>
          <ul className="defn cols">
            {MESA_PDA.transitions.map((t) => (
              <li key={t.id}><code>{formatTransition(t)}</code></li>
            ))}
          </ul>
          <p className="muted">
            Convenção: o primeiro símbolo à esquerda do que é empilhado vira o topo da pilha. O estado <code>qi</code> conta quantas cartas já foram entregues
            (memória finita, máx. 5); a pilha guarda as cartas ainda não entregues. Linguagem: palavras de parênteses balanceados (a abre, b fecha) com 1 a 5
            pares, seguidas de <code>c</code>. O módulo é independente da interface: <code>src/pda/pda.ts</code> e <code>src/pda/mesaPda.ts</code>.
          </p>
        </>
      )}
    </Modal>
  );
}

export function CluesModal({ meta, onClose }: { meta: Meta; onClose: () => void }) {
  return (
    <Modal title="Pistas" onClose={onClose} className="clues-modal">
      <p className="muted">
        Cada pista das três primeiras desativa uma trapaça da Madame Ônix na luta final ({CORE_CLUES.filter((c) => meta.clues.includes(c)).length}/3).
        Elas persistem entre tentativas.
      </p>
      <ul className="clues">
        {CLUES.map((c) => {
          const got = meta.clues.includes(c.id);
          return (
            <li key={c.id} className={got ? 'got' : 'locked'}>
              <strong>{got ? c.name : '???'}</strong>
              <p>{got ? c.text : 'Ainda não descoberta. Continue explorando e derrubando mesas.'}</p>
              {got && c.effect && <em>{c.effect}</em>}
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}

export function MetaShopModal({ meta, onBuy, onClose }: { meta: Meta; onBuy: (m: Meta) => void; onClose: () => void }) {
  return (
    <Modal title="Caderno do Lúcio" onClose={onClose} className="meta-modal">
      <p className="muted">Melhorias permanentes. Pague com Fichas Douradas, que você ganha ao fim de cada tentativa.</p>
      <div className="gold">Fichas Douradas: <b>{meta.gold}</b></div>
      <ul className="meta-list">
        {META_UPGRADES.map((u) => {
          const lv = metaLevel(meta, u.id);
          const cost = metaUpgradeCost(meta, u);
          return (
            <li key={u.id}>
              <div>
                <strong>{u.name}</strong> <span className="muted">nv. {lv}/{u.max}</span>
                <p>{u.desc}</p>
              </div>
              <button
                className="btn"
                disabled={cost === null || meta.gold < cost}
                onClick={() => {
                  const m = buyMetaUpgrade(meta, u.id);
                  if (m) onBuy(m);
                }}
              >
                {cost === null ? 'Máximo' : `${cost} ◈`}
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}

export function CodexModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Tabelas de referência" onClose={onClose} wide className="reference-modal">
      <h3>Mãos (nível 1)</h3>
      <table className="tbl">
        <tbody>
          {HAND_TYPES.map((h) => (
            <tr key={h}><td>{HAND_NAME[h]}</td><td>{HAND_BASE[h][0]} fichas</td><td>× {HAND_BASE[h][1]}</td></tr>
          ))}
        </tbody>
      </table>
      <h3>Adversários</h3>
      <table className="tbl">
        <tbody>
          {OPPONENTS.map((o) => (
            <tr key={o.id}><td>{o.name}</td><td>meta {o.target.toLocaleString('pt-BR')}</td><td>{o.ruleName}</td></tr>
          ))}
        </tbody>
      </table>
      <h3>Relíquias</h3>
      <ul className="clues">
        {RELICS.map((r) => (
          <li key={r.id} className="got"><strong>{r.name}</strong> — ${r.cost}<p>{r.desc}</p></li>
        ))}
      </ul>
    </Modal>
  );
}

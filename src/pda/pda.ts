/**
 * Autômato com Pilha (PDA) — módulo independente de UI e de regras de jogo.
 *
 * Definição formal: P = (Q, Σ, Γ, δ, q0, Z0, F)
 *   Q  = conjunto de estados
 *   Σ  = alfabeto de entrada
 *   Γ  = alfabeto da pilha
 *   δ  : Q × (Σ ∪ {ε}) × Γ → P(Q × Γ*)   (função de transição)
 *   q0 = estado inicial, Z0 = símbolo inicial da pilha, F = estados finais
 *
 * Aceitação por estado final: a entrada foi totalmente consumida e o estado
 * atual pertence a F.
 *
 * Convenção de pilha: array com a BASE no índice 0 e o TOPO no último índice.
 * Convenção de `push`: `push[0]` passa a ser o novo topo (como na notação AZ
 * de livros-texto, em que o símbolo mais à esquerda fica no topo).
 */

export interface Transition {
  id: string;
  from: string;
  /** símbolo lido; null representa ε (não consome entrada) */
  read: string | null;
  /** símbolo exigido no topo da pilha (sempre desempilhado) */
  pop: string;
  to: string;
  /** símbolos empilhados após o POP; push[0] vira o topo. [] = ε */
  push: string[];
}

/** Metadados só para desenhar o diagrama (não afetam o autômato). */
export interface DiagramLayout {
  width: number;
  height: number;
  positions: Record<string, [number, number]>;
}

export interface PDADefinition {
  name: string;
  states: string[];
  inputAlphabet: string[];
  stackAlphabet: string[];
  initialState: string;
  initialStack: string;
  finalStates: string[];
  transitions: Transition[];
  layout?: DiagramLayout;
}

export interface Config {
  state: string;
  pos: number;
  stack: string[];
}

export type StackOp = 'PUSH' | 'POP' | 'NOP';

export interface TraceStep {
  index: number;
  from: string;
  to: string;
  transitionId: string;
  read: string | null;
  /** índice do símbolo consumido na entrada (null se ε) */
  readPos: number | null;
  pop: string;
  push: string[];
  stackBefore: string[];
  stackAfter: string[];
  /** classificação para a UI: empilhou, desempilhou ou só trocou o topo */
  op: StackOp;
  note: string;
}

export type RejectReason =
  | 'empty-input'
  | 'no-transition'
  | 'not-final'
  | 'stack-mismatch';

export interface RunResult {
  accepted: boolean;
  input: string[];
  steps: TraceStep[];
  finalConfig: Config;
  reason: 'accepted' | RejectReason;
  /** explicação legível do resultado */
  message: string;
}

export function formatTransition(t: Transition): string {
  const r = t.read ?? 'ε';
  const p = t.push.length ? t.push.join('') : 'ε';
  return `δ(${t.from}, ${r}, ${t.pop}) = (${t.to}, ${p})`;
}

export function formatDefinition(d: PDADefinition): string[] {
  return [
    `Q = {${d.states.join(', ')}}`,
    `Σ = {${d.inputAlphabet.join(', ')}}`,
    `Γ = {${d.stackAlphabet.join(', ')}}`,
    `q0 = ${d.initialState}`,
    `Z0 = ${d.initialStack}`,
    `F = {${d.finalStates.join(', ')}}`,
  ];
}

/** Verifica a consistência interna da definição. Retorna a lista de erros. */
export function validateDefinition(d: PDADefinition): string[] {
  const errs: string[] = [];
  const Q = new Set(d.states);
  const S = new Set(d.inputAlphabet);
  const G = new Set(d.stackAlphabet);
  if (!Q.has(d.initialState)) errs.push('estado inicial fora de Q');
  if (!G.has(d.initialStack)) errs.push('Z0 fora de Γ');
  for (const f of d.finalStates) if (!Q.has(f)) errs.push(`estado final ${f} fora de Q`);
  const ids = new Set<string>();
  for (const t of d.transitions) {
    if (ids.has(t.id)) errs.push(`id duplicado ${t.id}`);
    ids.add(t.id);
    if (!Q.has(t.from) || !Q.has(t.to)) errs.push(`${t.id}: estado fora de Q`);
    if (t.read !== null && !S.has(t.read)) errs.push(`${t.id}: símbolo ${t.read} fora de Σ`);
    if (!G.has(t.pop)) errs.push(`${t.id}: pop ${t.pop} fora de Γ`);
    for (const p of t.push) if (!G.has(p)) errs.push(`${t.id}: push ${p} fora de Γ`);
  }
  return errs;
}

function applyTransition(c: Config, t: Transition): Config {
  const stack = c.stack.slice(0, -1);
  for (let i = t.push.length - 1; i >= 0; i--) stack.push(t.push[i]);
  return { state: t.to, pos: t.read === null ? c.pos : c.pos + 1, stack };
}

function applicable(d: PDADefinition, c: Config, input: string[]): Transition[] {
  if (c.stack.length === 0) return [];
  const top = c.stack[c.stack.length - 1];
  return d.transitions.filter(
    (t) =>
      t.from === c.state &&
      t.pop === top &&
      (t.read === null || (c.pos < input.length && t.read === input[c.pos])),
  );
}

function classify(t: Transition): StackOp {
  if (t.push.length > 1) return 'PUSH';
  if (t.push.length === 0) return 'POP';
  return 'NOP';
}

function describeStep(t: Transition, read: string | null): string {
  const op = classify(t);
  const what =
    op === 'PUSH'
      ? `PUSH ${t.push.slice(0, t.push.length - 1).join('')}`
      : op === 'POP'
        ? `POP ${t.pop}`
        : 'topo mantido';
  const lido = read === null ? 'ε (sem ler)' : `lê '${read}'`;
  return `${t.from} ${lido} → ${t.to}; ${what}`;
}

const MAX_EXTRA = 64;

/**
 * Executa o PDA sobre a entrada. Busca por DFS em todos os ramos (o modelo é
 * não-determinístico em geral) e devolve o primeiro caminho de aceitação; se
 * não houver, devolve o caminho que mais avançou, para a UI explicar a falha.
 */
export function runPDA(def: PDADefinition, input: string[]): RunResult {
  const maxSteps = input.length * 2 + MAX_EXTRA;
  const start: Config = { state: def.initialState, pos: 0, stack: [def.initialStack] };
  const finals = new Set(def.finalStates);

  let best: { steps: TraceStep[]; config: Config } = { steps: [], config: start };
  let found: { steps: TraceStep[]; config: Config } | null = null;

  const better = (a: { steps: TraceStep[]; config: Config }, b: { steps: TraceStep[]; config: Config }) =>
    a.config.pos > b.config.pos || (a.config.pos === b.config.pos && a.steps.length > b.steps.length);

  const seen = new Set<string>();

  function dfs(c: Config, steps: TraceStep[]): boolean {
    if (found) return true;
    if (better({ steps, config: c }, best)) best = { steps: steps.slice(), config: c };
    if (c.pos === input.length && finals.has(c.state)) {
      found = { steps: steps.slice(), config: c };
      return true;
    }
    if (steps.length >= maxSteps) return false;
    const key = `${c.state}|${c.pos}|${c.stack.join('')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    for (const t of applicable(def, c, input)) {
      const next = applyTransition(c, t);
      const step: TraceStep = {
        index: steps.length,
        from: c.state,
        to: next.state,
        transitionId: t.id,
        read: t.read,
        readPos: t.read === null ? null : c.pos,
        pop: t.pop,
        push: t.push.slice(),
        stackBefore: c.stack.slice(),
        stackAfter: next.stack.slice(),
        op: classify(t),
        note: describeStep(t, t.read),
      };
      steps.push(step);
      if (dfs(next, steps)) return true;
      steps.pop();
    }
    return false;
  }

  dfs(start, []);

  if (found) {
    const f = found as { steps: TraceStep[]; config: Config };
    return {
      accepted: true,
      input: input.slice(),
      steps: f.steps,
      finalConfig: f.config,
      reason: 'accepted',
      message: `Aceita: entrada consumida e estado final ${f.config.state} alcançado.`,
    };
  }

  const c = best.config;
  let reason: RejectReason;
  let message: string;
  if (input.length === 0) {
    reason = 'empty-input';
    message = 'Rejeita: entrada vazia (n ≥ 1 exige ao menos um par).';
  } else if (c.pos < input.length) {
    const top = c.stack.length ? c.stack[c.stack.length - 1] : '∅';
    const sym = input[c.pos];
    reason = c.stack.length === 0 ? 'stack-mismatch' : 'no-transition';
    message = `Rejeita: sem transição em ${c.state} lendo '${sym}' com topo '${top}'.`;
  } else {
    reason = 'not-final';
    message = `Rejeita: entrada consumida, mas ${c.state} não é estado final (pilha: ${c.stack.join('') || '∅'}).`;
  }
  return {
    accepted: false,
    input: input.slice(),
    steps: best.steps,
    finalConfig: c,
    reason,
    message,
  };
}

/** Quantos POP bem-sucedidos (pares casados) ocorreram no trace. */
export function countPops(steps: TraceStep[]): number {
  return steps.filter((s) => s.op === 'POP').length;
}

// ---------------------------------------------------------------------------
// Execução passo a passo (tempo real): o jogo envia um símbolo por vez.
// ---------------------------------------------------------------------------

export function initialConfig(def: PDADefinition): Config {
  return { state: def.initialState, pos: 0, stack: [def.initialStack] };
}

export type StepResult =
  | { ok: true; transition: Transition; next: Config; trace: TraceStep }
  | { ok: false; reason: string };

/**
 * Processa UM símbolo a partir de `cfg`. Só considera transições que leem o
 * símbolo (sem ε). Quando não há transição, o autômato "trava" e o símbolo é
 * recusado — é isso que o jogo usa para bloquear a ação do jogador.
 */
export function stepSymbol(def: PDADefinition, cfg: Config, symbol: string): StepResult {
  if (cfg.stack.length === 0) return { ok: false, reason: 'pilha vazia (sem Z)' };
  const top = cfg.stack[cfg.stack.length - 1];
  const t = def.transitions.find((x) => x.from === cfg.state && x.read === symbol && x.pop === top);
  if (!t) return { ok: false, reason: `sem transição δ(${cfg.state}, ${symbol}, ${top})` };
  const next = applyTransition(cfg, t);
  const trace: TraceStep = {
    index: cfg.pos,
    from: cfg.state,
    to: next.state,
    transitionId: t.id,
    read: symbol,
    readPos: cfg.pos,
    pop: t.pop,
    push: t.push.slice(),
    stackBefore: cfg.stack.slice(),
    stackAfter: next.stack.slice(),
    op: classify(t),
    note: describeStep(t, symbol),
  };
  return { ok: true, transition: t, next, trace };
}

export function isAccepting(def: PDADefinition, cfg: Config): boolean {
  return def.finalStates.includes(cfg.state);
}

/** Z → Z₀ (só para exibir; os dados usam 'Z', o padrão do JFLAP). */
export function prettyStack(s: string): string {
  return s.replace(/Z/g, 'Z₀');
}

/** Exporta a definição no formato .jff do JFLAP (autômato com pilha). */
export function toJFF(def: PDADefinition): string {
  const idx = new Map(def.states.map((s, i) => [s, i] as const));
  const lay = def.layout;
  const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
    '<structure>',
    '\t<type>pda</type>',
    '\t<automaton>',
  ];
  for (const st of def.states) {
    const [x, y] = lay?.positions[st] ?? [60 + 110 * (idx.get(st) as number), 100];
    lines.push(`\t\t<state id="${idx.get(st)}" name="${esc(st)}">`);
    lines.push(`\t\t\t<x>${x.toFixed(1)}</x>`);
    lines.push(`\t\t\t<y>${y.toFixed(1)}</y>`);
    if (st === def.initialState) lines.push('\t\t\t<initial/>');
    if (def.finalStates.includes(st)) lines.push('\t\t\t<final/>');
    lines.push('\t\t</state>');
  }
  for (const t of def.transitions) {
    lines.push('\t\t<transition>');
    lines.push(`\t\t\t<from>${idx.get(t.from)}</from>`);
    lines.push(`\t\t\t<to>${idx.get(t.to)}</to>`);
    lines.push(t.read === null ? '\t\t\t<read/>' : `\t\t\t<read>${esc(t.read)}</read>`);
    lines.push(`\t\t\t<pop>${esc(t.pop)}</pop>`);
    lines.push(t.push.length ? `\t\t\t<push>${esc(t.push.join(''))}</push>` : '\t\t\t<push/>');
    lines.push('\t\t</transition>');
  }
  lines.push('\t</automaton>', '</structure>', '');
  return lines.join('\n');
}

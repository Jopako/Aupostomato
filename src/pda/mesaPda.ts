import { Config, PDADefinition, RunResult, Transition } from './pda';

/** Máximo de cartas na mão (= número de portas e de estados q1..q5). */
export const HAND_MAX = 5;

/**
 * PDA da mesa de caminhos.
 *
 *   Σ = { a, b, c }
 *     a = pisar numa carta       → PUSH X (a carta vai para o topo da pilha)
 *     b = pisar numa porta       → POP  X (a carta do TOPO vai para a mão)
 *     c = entrar no portal       → só com a pilha vazia (topo = Z)
 *   Γ = { X, Z }          Z = símbolo inicial da pilha (o "Z₀" dos livros)
 *   Q = { q0, q1, q2, q3, q4, q5, qf }
 *     qi = "i cartas já entregues na mão"; qf = percurso concluído (aceita)
 *
 * A pilha guarda as cartas ainda NÃO entregues. O estado conta as entregues
 * (memória finita). Como não existe δ(q5, a, ·) nem δ(q5, b, ·), a mão nunca
 * passa de 5 cartas.
 *
 * Linguagem aceita: u·c, onde u ∈ {a,b}* é uma palavra de parênteses
 * balanceados (a = abre, b = fecha, todo prefixo com #b ≤ #a) com de 1 a 5
 * pares.
 */
function build(): PDADefinition {
  const states = ['q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'qf'];
  const transitions: Transition[] = [];
  for (let i = 0; i < HAND_MAX; i++) {
    transitions.push({ id: `pZ${i}`, from: `q${i}`, read: 'a', pop: 'Z', to: `q${i}`, push: ['X', 'Z'] });
    transitions.push({ id: `pX${i}`, from: `q${i}`, read: 'a', pop: 'X', to: `q${i}`, push: ['X', 'X'] });
    transitions.push({ id: `d${i}`, from: `q${i}`, read: 'b', pop: 'X', to: `q${i + 1}`, push: [] });
  }
  for (let i = 1; i <= HAND_MAX; i++) {
    transitions.push({ id: `c${i}`, from: `q${i}`, read: 'c', pop: 'Z', to: 'qf', push: ['Z'] });
  }
  const positions: Record<string, [number, number]> = { qf: [375, 212] };
  for (let i = 0; i <= HAND_MAX; i++) positions[`q${i}`] = [50 + i * 130, 100];
  return {
    name: 'Mesa de caminhos: parênteses balanceados (1 a 5 pares) + portal',
    states,
    inputAlphabet: ['a', 'b', 'c'],
    stackAlphabet: ['X', 'Z'],
    initialState: 'q0',
    initialStack: 'Z',
    finalStates: ['qf'],
    transitions,
    layout: { width: 760, height: 250, positions },
  };
}

export const MESA_PDA: PDADefinition = build();

/** Significado de cada símbolo de entrada no jogo. */
export const SYMBOL_INFO: Record<string, { name: string; what: string }> = {
  a: { name: 'pegar carta', what: 'PUSH X — a carta vai para o topo da pilha' },
  b: { name: 'abrir porta', what: 'POP X — a carta do topo vai para a mão' },
  c: { name: 'entrar no portal', what: 'exige pilha vazia (topo = Z) e fecha o percurso' },
};

/** Predicado independente do autômato, usado nos testes para conferi-lo. */
export function inMesaLanguage(w: string): boolean {
  if (w.length < 2 || w[w.length - 1] !== 'c') return false;
  let bal = 0;
  let pops = 0;
  for (const ch of w.slice(0, -1)) {
    if (ch === 'a') {
      if (pops >= HAND_MAX) return false;
      bal++;
    } else if (ch === 'b') {
      if (bal === 0 || pops >= HAND_MAX) return false;
      bal--;
      pops++;
    } else return false;
  }
  return bal === 0 && pops >= 1;
}

const handCount = (cfg: Config) => (cfg.state === 'qf' ? HAND_MAX : Number(cfg.state.slice(1)));

/** Mensagem para quando o autômato não tem transição para o símbolo. */
export function blockMessage(symbol: string, cfg: Config): string {
  const top = cfg.stack[cfg.stack.length - 1];
  const pending = cfg.stack.length - 1;
  if (cfg.state === 'qf') return 'O percurso já terminou.';
  if (symbol === 'a') {
    return handCount(cfg) >= HAND_MAX ? 'Mão cheia: as 5 cartas já foram entregues.' : 'Não dá para pegar essa carta agora.';
  }
  if (symbol === 'b') {
    if (top === 'Z') return 'Porta trancada: a pilha está vazia. Pegue uma carta antes.';
    return 'Mão cheia: as 5 cartas já foram entregues.';
  }
  if (symbol === 'c') {
    if (pending > 0) return `Portal fechado: ainda há ${pending} carta${pending > 1 ? 's' : ''} na pilha. Entregue ${pending > 1 ? 'todas' : 'a carta'} nas portas.`;
    return 'Portal fechado: entregue ao menos 1 carta nas portas.';
  }
  return `Símbolo '${symbol}' não existe neste autômato.`;
}

/** Explica, em português, por que um roteiro foi rejeitado. */
export function explainReject(res: RunResult): string {
  if (res.accepted) return '';
  const cfg = res.finalConfig;
  const word = res.input;
  if (word.length === 0) return 'Roteiro vazio: é preciso ao menos pegar uma carta, entregá-la e entrar no portal.';
  const bad = word.find((s) => !MESA_PDA.inputAlphabet.includes(s));
  if (bad !== undefined) return `Símbolo '${bad}' não pertence ao alfabeto {a, b, c}.`;
  if (cfg.pos < word.length) {
    const sym = word[cfg.pos];
    return `Travou no ${cfg.pos + 1}º símbolo ('${sym}'): ${blockMessage(sym, cfg)}`;
  }
  const pending = cfg.stack.length - 1;
  return `O roteiro acabou antes do portal${pending > 0 ? ` e ainda restam ${pending} carta(s) na pilha` : ''}: falta o símbolo 'c'.`;
}

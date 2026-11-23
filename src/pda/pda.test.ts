import { describe, it, expect } from 'vitest';
import { runPDA, validateDefinition, countPops, formatTransition } from './pda';
import { ANBN } from './samples';

const run = (s: string) => runPDA(ANBN, s.split(''));
const inLang = (s: string) => {
  const m = /^(a+)(b+)$/.exec(s);
  return !!m && m[1].length === m[2].length;
};

describe('PDA aⁿbⁿ', () => {
  it('definição é consistente', () => {
    expect(validateDefinition(ANBN)).toEqual([]);
  });

  it('aceita ab, aabb, aaabbb', () => {
    for (const w of ['ab', 'aabb', 'aaabbb', 'aaaabbbb']) expect(run(w).accepted).toBe(true);
  });

  it('rejeita vazia (n ≥ 1)', () => {
    const r = run('');
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe('empty-input');
  });

  it('rejeita desbalanceadas e fora de ordem', () => {
    for (const w of ['a', 'b', 'ba', 'abab', 'aab', 'abb', 'aabbb', 'bbaa', 'abba', 'aaabb']) {
      expect(run(w).accepted, w).toBe(false);
    }
  });

  it('concorda com a linguagem em TODAS as palavras de até 10 símbolos', () => {
    for (let len = 0; len <= 10; len++) {
      for (let m = 0; m < 1 << len; m++) {
        let w = '';
        for (let i = 0; i < len; i++) w += (m >> i) & 1 ? 'b' : 'a';
        expect(run(w).accepted, `"${w}"`).toBe(inLang(w));
      }
    }
  });

  it('trace de aabb: PUSH, PUSH, POP, POP, ε→qf, pilha final = Z', () => {
    const r = run('aabb');
    expect(r.steps.map((s) => s.op)).toEqual(['PUSH', 'PUSH', 'POP', 'POP', 'NOP']);
    expect(r.steps.map((s) => s.to)).toEqual(['q0', 'q0', 'q1', 'q1', 'qf']);
    expect(r.steps[1].stackAfter).toEqual(['Z', 'A', 'A']);
    expect(r.finalConfig.stack).toEqual(['Z']);
    expect(countPops(r.steps)).toBe(2);
  });

  it('explica a rejeição', () => {
    // aab: entrada consumida, sobra um A na pilha em q1 → não é final
    expect(run('aab').reason).toBe('not-final');
    expect(run('aab').finalConfig.stack).toEqual(['Z', 'A']);
    // abb: o segundo b não encontra A no topo
    expect(run('abb').reason).toBe('no-transition');
    expect(run('ba').message).toMatch(/sem transição/);
  });

  it('formata transições na notação δ', () => {
    expect(formatTransition(ANBN.transitions[0])).toBe('δ(q0, a, Z) = (q0, AZ)');
    expect(formatTransition(ANBN.transitions[4])).toBe('δ(q1, ε, Z) = (qf, Z)');
  });
});

import { describe, expect, it } from 'vitest';
import { initialConfig, isAccepting, runPDA, stepSymbol, toJFF, validateDefinition, Config } from './pda';
import { blockMessage, explainReject, HAND_MAX, inMesaLanguage, MESA_PDA } from './mesaPda';

/** Execução determinística símbolo a símbolo (a mesma usada no jogo). */
function runSteps(w: string): { accepted: boolean; cfg: Config; failedAt: number } {
  let cfg = initialConfig(MESA_PDA);
  for (let i = 0; i < w.length; i++) {
    const r = stepSymbol(MESA_PDA, cfg, w[i]);
    if (!r.ok) return { accepted: false, cfg, failedAt: i };
    cfg = r.next;
  }
  return { accepted: isAccepting(MESA_PDA, cfg), cfg, failedAt: -1 };
}

describe('definição do PDA da mesa', () => {
  it('é consistente e tem de 5 a 10 estados (exigência do T2)', () => {
    expect(validateDefinition(MESA_PDA)).toEqual([]);
    expect(MESA_PDA.states.length).toBe(7);
    expect(MESA_PDA.states.length).toBeGreaterThanOrEqual(5);
    expect(MESA_PDA.states.length).toBeLessThanOrEqual(10);
  });
  it('tem 5×3 + 5 = 20 transições, todas determinísticas', () => {
    expect(MESA_PDA.transitions).toHaveLength(HAND_MAX * 3 + HAND_MAX);
    const keys = MESA_PDA.transitions.map((t) => `${t.from}|${t.read}|${t.pop}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(MESA_PDA.transitions.every((t) => t.read !== null)).toBe(true);
  });
});

describe('linguagem', () => {
  it('stepSymbol concorda com o predicado em TODAS as palavras de até 12 símbolos de {a,b,c}', () => {
    const alpha = ['a', 'b', 'c'];
    let checked = 0;
    const rec = (w: string) => {
      expect(runSteps(w).accepted, `"${w}"`).toBe(inMesaLanguage(w));
      checked++;
      if (w.length === 12) return;
      for (const ch of alpha) rec(w + ch);
    };
    rec('');
    expect(checked).toBe((3 ** 13 - 1) / 2);
  });
  it('runPDA (DFS) concorda com o predicado em todas as palavras de até 8 símbolos', () => {
    const alpha = ['a', 'b', 'c'];
    const rec = (w: string) => {
      expect(runPDA(MESA_PDA, w.split('')).accepted, `"${w}"`).toBe(inMesaLanguage(w));
      if (w.length === 8) return;
      for (const ch of alpha) rec(w + ch);
    };
    rec('');
  });
  it('exemplos da interface', () => {
    expect(runSteps('aabbc').accepted).toBe(true);
    expect(runSteps('ababc').accepted).toBe(true);
    expect(runSteps('aaaaabbbbbc').accepted).toBe(true);
    expect(runSteps('abbc').accepted).toBe(false);
    expect(runSteps('aabc').accepted).toBe(false);
    expect(runSteps('aaaaaabbbbbbc').accepted).toBe(false); // 6ª porta: mão cheia
    expect(runSteps('c').accepted).toBe(false);
    expect(runSteps('abca').accepted).toBe(false); // nada depois do portal
  });
  it('a pilha fica Z + um X por carta pendente, e o estado conta as entregues', () => {
    const r = runSteps('aaab');
    expect(r.cfg.state).toBe('q1');
    expect(r.cfg.stack).toEqual(['Z', 'X', 'X']);
    expect(runSteps('aabbc').cfg.stack).toEqual(['Z']);
  });
});

describe('mensagens', () => {
  it('bloqueios têm texto específico', () => {
    expect(blockMessage('b', initialConfig(MESA_PDA))).toMatch(/pilha está vazia/);
    expect(blockMessage('c', initialConfig(MESA_PDA))).toMatch(/ao menos 1 carta/);
    const r = runSteps('aac'); // trava no portal com 2 X pendentes
    expect(r.failedAt).toBe(2);
    expect(blockMessage('c', r.cfg)).toMatch(/2 cartas/);
  });
  it('explainReject', () => {
    expect(explainReject(runPDA(MESA_PDA, 'abbc'.split('')))).toMatch(/Travou no 3º símbolo \('b'\).*vazia/);
    expect(explainReject(runPDA(MESA_PDA, 'aabb'.split('')))).toMatch(/falta o símbolo 'c'/);
    expect(explainReject(runPDA(MESA_PDA, []))).toMatch(/vazio/);
    expect(explainReject(runPDA(MESA_PDA, 'aabbc'.split('')))).toBe('');
  });
});

describe('exportação JFLAP', () => {
  it('gera um .jff com 7 estados e 20 transições, inicial e final', () => {
    const x = toJFF(MESA_PDA);
    expect(x).toContain('<type>pda</type>');
    expect((x.match(/<state /g) ?? []).length).toBe(7);
    expect((x.match(/<transition>/g) ?? []).length).toBe(20);
    expect((x.match(/<initial\/>/g) ?? []).length).toBe(1);
    expect((x.match(/<final\/>/g) ?? []).length).toBe(1);
    expect(x).toContain('<read>a</read>');
    expect(x).toContain('<pop>Z</pop>');
    expect(x).toContain('<push>XZ</push>');
    expect(x).toContain('<push/>');
  });
});

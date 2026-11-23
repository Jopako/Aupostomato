import { describe, it, expect } from 'vitest';
import { DIALOGUES, dialogueStart, nodeLines } from './dialogues';
import { SCENES } from './scenes';
import { applyEffects } from './engine';
import { Choice, Ctx, DNode, Effect, UiCmd } from './types';
import { defaultMeta, defaultStory } from '../game/state';
import { CLUES } from './data';

const fresh = (): Ctx => ({ story: defaultStory(), run: null, meta: defaultMeta() });

/** Percorre um diálogo escolhendo opções por prefixo de texto; segue comandos 'dialogue'. */
function talk(ctx: Ctx, id: string, picks: string[] = [], cmdsOut: UiCmd[] = []): Ctx {
  const dlg = DIALOGUES[id];
  expect(dlg, `diálogo ${id}`).toBeTruthy();
  let nodeId: string | null = dialogueStart(dlg, ctx);
  let guard = 0;
  while (nodeId && guard++ < 50) {
    const node: DNode = dlg.nodes[nodeId];
    expect(node, `${id}.${nodeId}`).toBeTruthy();
    nodeLines(node.lines, ctx); // não pode lançar
    const run = (effects: Effect[]) => {
      const r = applyEffects(ctx, effects, () => 0);
      ctx = r.ctx;
      for (const c of r.cmds) {
        cmdsOut.push(c);
        if (c.t === 'dialogue') ctx = talk(ctx, c.id, picks, cmdsOut);
      }
    };
    if (node.effects) run(node.effects);
    if (node.choices) {
      const avail: Choice[] = node.choices.filter((c: Choice) => !c.if || c.if(ctx));
      const pick: Choice | undefined = picks.length ? avail.find((c: Choice) => c.text.startsWith(picks[0])) : avail[avail.length - 1];
      expect(pick, `escolha disponível em ${id}.${nodeId}: ${picks[0]}`).toBeTruthy();
      if (picks.length) picks.shift();
      if (pick!.effects) run(pick!.effects);
      nodeId = pick!.next;
    } else nodeId = node.next ?? null;
  }
  return ctx;
}
const click = (ctx: Ctx, sceneId: keyof typeof SCENES, hot: string, picks: string[] = [], cmds: UiCmd[] = []): Ctx => {
  const h = SCENES[sceneId].hotspots.find((x) => x.id === hot);
  expect(h, `${sceneId}.${hot}`).toBeTruthy();
  const r = applyEffects(ctx, h!.onClick(ctx), () => 0);
  ctx = r.ctx;
  for (const c of r.cmds) {
    cmds.push(c);
    if (c.t === 'dialogue') ctx = talk(ctx, c.id, picks, cmds);
  }
  return ctx;
};

describe('integridade do roteiro', () => {
  it('todos os nós e destinos existem; todo diálogo referenciado existe', () => {
    const refs = new Set<string>();
    const scan = (effects?: Effect[]) => effects?.forEach((e) => e.k === 'dialogue' && refs.add(e.id));
    for (const [id, d] of Object.entries(DIALOGUES)) {
      const start = typeof d.start === 'string' ? [d.start] : ['a', 'menu', 'clue', 'pega', 'fogo', 'tem_fogo', 'bloqueado', 'vazio', 'ja', 'trancado', 'pos_ajuda', 'pos_vestido'];
      for (const s of start) if (typeof d.start === 'string') expect(d.nodes[s], `${id}.${s}`).toBeTruthy();
      for (const [nid, n] of Object.entries(d.nodes)) {
        scan(n.effects);
        if (n.next) expect(d.nodes[n.next], `${id}.${nid}->${n.next}`).toBeTruthy();
        for (const c of n.choices ?? []) {
          scan(c.effects);
          if (c.next) expect(d.nodes[c.next], `${id}.${nid} choice -> ${c.next}`).toBeTruthy();
        }
      }
    }
    for (const sc of Object.values(SCENES)) {
      const ids = sc.hotspots.map((h) => h.id);
      expect(new Set(ids).size).toBe(ids.length);
      const ctx = fresh();
      for (const h of sc.hotspots) h.onClick(ctx).forEach((e) => e.k === 'dialogue' && refs.add(e.id));
      for (const h of sc.hotspots)
        for (const f of Object.values(h.use ?? {})) f(ctx).forEach((e) => e.k === 'dialogue' && refs.add(e.id));
    }
    for (const r of refs) expect(DIALOGUES[r], `referência a ${r}`).toBeTruthy();
  });
  it('hotspots cabem no quadro 1000×560', () => {
    for (const sc of Object.values(SCENES))
      for (const h of sc.hotspots) {
        expect(h.x).toBeGreaterThanOrEqual(0);
        expect(h.y).toBeGreaterThanOrEqual(0);
        expect(h.x + h.w).toBeLessThanOrEqual(1000);
        expect(h.y + h.h).toBeLessThanOrEqual(560);
      }
  });
});

describe('puzzle de entrada', () => {
  it('solução completa: isqueiro → Nando → smoking → Brutus → salão → empréstimo', () => {
    let c = fresh();
    c = click(c, 'rua', 'banco');
    expect(c.story.items).toContain('isqueiro');
    c = click(c, 'beco', 'nando', ['Entregar']);
    expect(c.story.items).toEqual(['convite']);
    expect(c.story.flags.nandoHelped).toBe(true);
    c = click(c, 'beco', 'furgao');
    expect(c.story.flags.smoking).toBe(true);
    const cmds: UiCmd[] = [];
    c = click(c, 'rua', 'porta', ['Mostrar', 'Sou o sobrinho'.replace('Sou', '"Sou')], cmds);
    expect(c.story.scene).toBe('salao');
    expect(c.meta.enteredOnce).toBe(true);
    expect(cmds.some((x) => x.t === 'dialogue' && x.id === 'agiota_emprestimo')).toBe(true);
  });
  it('sem convite ou sem smoking, Brutus barra', () => {
    let c = fresh();
    c = click(c, 'rua', 'porta', ['"Capri']);
    expect(c.story.scene).toBe('rua');
    c = click(c, 'rua', 'banco');
    c = click(c, 'beco', 'nando', ['Entregar']);
    c = click(c, 'rua', 'porta', ['Mostrar']); // sem smoking
    expect(c.story.scene).toBe('rua');
    c = click(c, 'beco', 'furgao');
    c = click(c, 'rua', 'porta', ['Mostrar', '"Eu sou o Conde']);
    expect(c.story.scene).toBe('rua');
  });
  it('furgão bloqueado antes de ajudar Nando', () => {
    const c = click(fresh(), 'beco', 'furgao');
    expect(c.story.flags.smoking).toBeUndefined();
  });
  it('depois de uma derrota Brutus deixa entrar direto', () => {
    const c0 = fresh();
    c0.meta.enteredOnce = true;
    const c = click(c0, 'rua', 'porta');
    expect(c.story.scene).toBe('salao');
  });
});

describe('empréstimo e dívida', () => {
  const inSalao = () => click(click(click(fresh(), 'rua', 'banco'), 'beco', 'nando', ['Entregar']), 'beco', 'furgao');
  it('cada opção de empréstimo cria uma tentativa com dívida correta', () => {
    for (const [i, [amount, debt]] of ([[300, 450], [500, 850], [800, 1520]] as const).entries()) {
      let c = inSalao();
      c = talk(c, 'agiota_emprestimo', [['Pegar $300', 'Pegar $500', 'Pegar $800'][i]]);
      expect(c.run?.loan).toBe(amount);
      expect(c.run?.money).toBe(amount);
      expect(c.run?.debt).toBe(debt);
      expect(c.meta.runs).toBe(1);
    }
  });
  it('recusar o empréstimo não cria tentativa', () => {
    const c = talk(fresh(), 'agiota_emprestimo', ['Ainda']);
    expect(c.run).toBeNull();
  });
  it('mesa não abre sem tentativa; abre com tutorial e depois direto', () => {
    let c = fresh();
    const cmds: UiCmd[] = [];
    c = click(c, 'salao', 'mesa', [], cmds);
    expect(cmds.some((x) => x.t === 'match')).toBe(false);
    c = talk(c, 'agiota_emprestimo', ['Pegar $500']);
    const cmds2: UiCmd[] = [];
    c = click(c, 'salao', 'mesa', [], cmds2);
    expect(cmds2.some((x) => x.t === 'match')).toBe(true);
    expect(c.story.flags.tutorial_done).toBe(true);
    const cmds3: UiCmd[] = [];
    click(c, 'salao', 'mesa', [], cmds3);
    expect(cmds3.filter((x) => x.t === 'match')).toHaveLength(1);
  });
  it('cobrança: quitar, pagar metade, não pagar (relíquia ou juros)', () => {
    const mk = (money: number, relics: string[]) => {
      let c = talk(fresh(), 'agiota_emprestimo', ['Pegar $300']);
      c = { ...c, run: { ...c.run!, money, relics, tableIndex: 3 } };
      expect(SCENES.salao.autoEvent!(c)).toBe('cobranca');
      return c;
    };
    let c = talk(mk(1000, []), 'cobranca', ['Quitar']);
    expect(c.run!.debt).toBe(0);
    expect(c.run!.money).toBe(550);
    expect(c.run!.cobrancaDone).toBe(true);
    expect(SCENES.salao.autoEvent!(c)).toBeNull();
    c = talk(mk(300, []), 'cobranca', ['Pagar a metade']);
    expect(c.run!.debt).toBe(Math.ceil(225 * 1.15));
    expect(c.run!.money).toBe(75);
    c = talk(mk(10, ['trevo']), 'cobranca', ['Não tenho']);
    expect(c.run!.relics).toEqual([]);
    expect(c.run!.debt).toBe(450);
    c = talk(mk(10, []), 'cobranca', ['Não tenho']);
    expect(c.run!.debt).toBe(540);
  });
});

describe('investigação', () => {
  const withRun = (tableIndex: number): Ctx => {
    const c = talk(fresh(), 'agiota_emprestimo', ['Pegar $300']);
    return { ...c, run: { ...c.run!, tableIndex, cobrancaDone: true } };
  };
  it('cada pista só aparece no momento certo e é guardada na meta', () => {
    let c = click(withRun(0), 'salao', 'bar', ['Sair']);
    expect(c.meta.clues).toEqual([]);
    c = click(withRun(1), 'salao', 'bar');
    expect(c.meta.clues).toContain('clue_guardanapo');
    c = click(withRun(1), 'servico', 'caixote');
    expect(c.meta.clues).toEqual([]);
    c = click(c, 'servico', 'caixote');
    c = click(withRun(2), 'servico', 'caixote');
    expect(c.meta.clues).toContain('clue_engrenagem');
    c = click(withRun(3), 'salao', 'mesa');
    expect(c.meta.clues).toContain('clue_baralho');
    c = click(withRun(4), 'salao', 'agiota');
    expect(c.meta.clues).toContain('clue_contrato');
    expect(CLUES).toHaveLength(4);
  });
  it('escritório só abre com as sete mesas vencidas e dispara a chefe', () => {
    let c = click(withRun(6), 'salao', 'porta_escritorio');
    expect(c.story.scene).not.toBe('escritorio');
    c = click(withRun(7), 'salao', 'porta_escritorio');
    expect(c.story.scene).toBe('escritorio');
    expect(SCENES.escritorio.autoEvent!(c)).toBe('onix_confronto');
    const cmds: UiCmd[] = [];
    c = talk(c, 'onix_confronto', [], cmds);
    expect(cmds.some((x) => x.t === 'match')).toBe(true);
    expect(SCENES.escritorio.autoEvent!(c)).toBeNull();
  });
  it('finais: sair ou apostar mais uma vez', () => {
    for (const [pick, id] of [['Quitar', 'sair'], ['Só mais', 'ultima']] as const) {
      const cmds: UiCmd[] = [];
      talk(withRun(7), 'boss_win', [pick], cmds);
      expect(cmds.find((x) => x.t === 'ending')).toEqual({ t: 'ending', id });
    }
  });
});

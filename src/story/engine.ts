import { Rng } from '../game/cards';
import { LOAN_OPTIONS, Meta, Run, newRun } from '../game/state';
import { CLUE_BY_ID, ITEMS } from './data';
import { Ctx, Effect, UiCmd } from './types';

export interface EffectResult {
  ctx: Ctx;
  cmds: UiCmd[];
}

function payDebt(run: Run, amount: number): { run: Run; paid: number } {
  const paid = Math.max(0, Math.min(amount, run.money, run.debt));
  return { run: { ...run, money: run.money - paid, debt: run.debt - paid }, paid };
}

/** Aplica um efeito de forma pura. A UI executa os comandos (`cmds`) devolvidos. */
export function applyEffect(ctx: Ctx, e: Effect, rng: Rng = Math.random): EffectResult {
  const cmds: UiCmd[] = [];
  let { story, run, meta } = ctx;
  switch (e.k) {
    case 'flag':
      story = { ...story, flags: { ...story.flags, [e.key]: e.value ?? true } };
      break;
    case 'give':
      if (!story.items.includes(e.item)) {
        story = { ...story, items: [...story.items, e.item] };
        cmds.push({ t: 'toast', text: `Item: ${ITEMS[e.item]?.name ?? e.item}` });
      }
      break;
    case 'remove':
      story = { ...story, items: story.items.filter((i) => i !== e.item) };
      break;
    case 'clue':
      if (!meta.clues.includes(e.id)) {
        meta = { ...meta, clues: [...meta.clues, e.id] };
        cmds.push({ t: 'toast', text: `Pista: ${CLUE_BY_ID[e.id]?.name ?? e.id}` });
      }
      break;
    case 'goto':
      story = { ...story, scene: e.scene };
      break;
    case 'enter':
      meta = { ...meta, enteredOnce: true };
      story = { ...story, scene: 'salao', flags: { ...story.flags, entrou: true } };
      break;
    case 'loan': {
      const opt = LOAN_OPTIONS[e.option];
      if (opt && !run) {
        run = newRun(opt, meta, rng);
        meta = { ...meta, runs: meta.runs + 1 };
        cmds.push({ t: 'toast', text: `Empréstimo: $${opt.amount}` });
      }
      break;
    }
    case 'pay':
      if (run) {
        const r = payDebt(run, e.amount === 'all' ? run.debt : e.amount);
        run = r.run;
        if (r.paid > 0) cmds.push({ t: 'toast', text: `Dívida paga: $${r.paid}` });
      }
      break;
    case 'cobranca':
      if (run) {
        if (e.mode === 'all') {
          run = payDebt(run, run.debt).run;
          cmds.push({ t: 'toast', text: 'Dívida quitada.' });
        } else if (e.mode === 'half') {
          const r = payDebt(run, Math.ceil(run.debt / 2));
          run = { ...r.run, debt: Math.ceil(r.run.debt * 1.15) };
          cmds.push({ t: 'toast', text: `Pago $${r.paid}. Resta $${run.debt}.` });
        } else if (run.relics.length > 0) {
          const lost = run.relics[Math.floor(rng() * run.relics.length)];
          run = { ...run, relics: run.relics.filter((r) => r !== lost) };
          cmds.push({ t: 'toast', text: 'Os capangas levaram uma relíquia.' });
        } else {
          run = { ...run, debt: Math.ceil(run.debt * 1.2) };
          cmds.push({ t: 'toast', text: `Juros sobem: devendo $${run.debt}.` });
        }
        run = { ...run, cobrancaDone: true };
      }
      break;
    case 'dialogue':
      cmds.push({ t: 'dialogue', id: e.id });
      break;
    case 'match':
      cmds.push({ t: 'match' });
      break;
    case 'metashop':
      cmds.push({ t: 'metashop' });
      break;
    case 'ending':
      cmds.push({ t: 'ending', id: e.id });
      break;
    case 'toast':
      cmds.push({ t: 'toast', text: e.text });
      break;
  }
  return { ctx: { story, run, meta } as Ctx, cmds };
}

export function applyEffects(ctx: Ctx, effects: Effect[], rng: Rng = Math.random): EffectResult {
  let cur = ctx;
  const cmds: UiCmd[] = [];
  for (const e of effects) {
    const r = applyEffect(cur, e, rng);
    cur = r.ctx;
    cmds.push(...r.cmds);
  }
  return { ctx: cur, cmds };
}

export type { Meta };

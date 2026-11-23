import { matchPayout, playRound, redeal, startMatch, MatchState } from '../src/game/match';
import { getLayout, Walk } from '../src/game/maze';
import { search } from '../src/game/solver';
import { OPPONENTS, effectiveRules } from '../src/game/opponents';
import { scoreHand } from '../src/game/scoring';
import { defaultMeta, LOAN_OPTIONS, newRun, metaBonuses, Run } from '../src/game/state';
import { buyHandUpgrade, buyRelic, buyStamp, generateShop } from '../src/game/shop';
import { MAX_RELICS, RELIC_BY_ID } from '../src/game/relics';

const N = Number(process.argv[2] ?? 400);
const loanIdx = Number(process.argv[3] ?? 1);
const clueCount = Number(process.argv[4] ?? 0);
const CLUES = ['clue_guardanapo', 'clue_engrenagem', 'clue_baralho'].slice(0, clueCount);
if (process.argv[5]) JSON.parse(process.argv[5]).forEach((t: number, i: number) => { OPPONENTS[i].target = t; });

const BUDGET = Number(process.env.BUDGET ?? 6000);

/** Melhor percurso que o robô acha (busca com orçamento: um piso do que um humano atento consegue). */
function best(m: MatchState) {
  const p = getLayout(m.layoutId);
  const total = (w: Walk) => {
    const depthBelow: Record<number, number> = {};
    w.delivered.forEach((d) => (depthBelow[d.card.id] = d.depthBelow));
    return scoreHand({
      played: w.delivered.map((d) => d.card), depthBelow, maxDepth: w.maxDepth, script: w.script,
      handLevels: m.handLevels, relics: m.relics, rules: m.rules, firstHand: m.firstHand,
      handsLeftAfter: m.handsLeft - 1, inDebt: m.inDebt, deckRemaining: m.drawPile.length, lastHandType: m.lastHandType, rng: () => 0.5,
    }).total;
  };
  const r = search(p, m.hand, m.hand.length, total, { budget: BUDGET });
  return r.best ? { walk: r.best.walk, total: r.best.score } : null;
}

function playMatch(m: MatchState): MatchState {
  let guard = 0;
  while (m.status === 'playing' && guard++ < 30) {
    const b = best(m);
    const need = (m.target - m.score) / m.handsLeft;
    if (m.discardsLeft > 0 && (!b || (m.score + b.total < m.target && b.total < need * 0.7))) {
      m = redeal(m);
      continue;
    }
    if (!b) { m = playRound(m, anyWalk(m)).state; continue; }
    m = playRound(m, b.walk, Math.random).state;
  }
  return m;
}

function anyWalk(m: MatchState): Walk {
  const p = getLayout(m.layoutId);
  return search(p, m.hand, m.hand.length, (w) => w.delivered.length, { stopAtFirst: true, budget: 400000 }).best!.walk;
}

const PRIORITY = ['pilha', 'par', 'blefe', 'trevo', 'ultima', 'lupa', 'fita', 'dado', 'copas', 'faca', 'montinho', 'colete', 'gasto', 'escada', 'moeda', 'anel', 'cofre', 'ancora'];

function shopBot(run: Run): Run {
  let shop = generateShop(run, Math.random);
  for (let pass = 0; pass < 6; pass++) {
    const idxs = shop.offers.map((o, i) => ({ o, i })).filter((x) => !x.o.sold);
    idxs.sort((a, b) => {
      const pa = a.o.kind === 'relic' ? PRIORITY.indexOf(a.o.id) : 3;
      const pb = b.o.kind === 'relic' ? PRIORITY.indexOf(b.o.id) : 3;
      return pa - pb;
    });
    let bought = false;
    for (const { o, i } of idxs) {
      if (o.price > run.money) continue;
      const res =
        o.kind === 'relic' ? buyRelic(run, shop, i)
        : o.kind === 'hand' ? buyHandUpgrade(run, shop, i)
        : buyStamp(run, shop, i, run.deck[Math.floor(Math.random() * run.deck.length)].id);
      if (res.ok) { run = res.value.run; shop = res.value.shop; bought = true; break; }
    }
    if (!bought) break;
  }
  return run;
}

const reached = new Array(9).fill(0);
const wins = new Array(8).fill(0);
const ratio: number[][] = OPPONENTS.map(() => []);
for (let n = 0; n < N; n++) {
  const meta = { ...defaultMeta(), clues: CLUES };
  let run = newRun(LOAN_OPTIONS[loanIdx], meta);
  for (let t = 0; t < 8; t++) {
    reached[t]++;
    const opp = OPPONENTS[t];
    let m = startMatch({
      opponent: opp, rules: effectiveRules(opp, CLUES), deck: run.deck, relics: run.relics, handLevels: run.handLevels,
      inDebt: true, bonuses: metaBonuses(meta),
    });
    m = playMatch(m);
    ratio[t].push(m.score / m.target);
    if (m.status !== 'won') break;
    wins[t]++;
    run = { ...run, money: run.money + matchPayout(m).total, tableIndex: t + 1 };
    if (t === 2) run = { ...run, money: Math.max(0, run.money - run.debt * 0.4) }; // cobrança parcial simulada
    run = shopBot(run);
  }
}
console.log(`runs=${N} loan=${LOAN_OPTIONS[loanIdx].amount} clues=${clueCount}`);
OPPONENTS.forEach((o, t) => {
  const r = ratio[t];
  const avg = r.length ? r.reduce((a, b) => a + b, 0) / r.length : 0;
  console.log(`${t + 1}. ${o.name.padEnd(18)} alvo=${String(o.target).padStart(5)}  chegou=${String(reached[t]).padStart(4)}  venceu=${String(wins[t]).padStart(4)}  taxa(cond)=${reached[t] ? ((100 * wins[t]) / reached[t]).toFixed(0) : '-'}%  pont/alvo=${avg.toFixed(2)}`);
});
console.log(`completou tudo: ${((100 * wins[7]) / N).toFixed(1)}%`);
void RELIC_BY_ID; void MAX_RELICS;

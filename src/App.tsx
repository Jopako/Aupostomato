import { useCallback, useEffect, useRef, useState } from 'react';
import { createDeck, shuffle } from './game/cards';
import { matchPayout, MatchState, startMatch } from './game/match';
import { effectiveRules, OPPONENTS, OpponentDef } from './game/opponents';
import { createQuickStart } from './game/quickStart';
import { generateShop } from './game/shop';
import { clearSave, hasSave, loadSave, loadSkipStory, writeSave, writeSkipStory } from './game/save';
import { defaultMeta, defaultStory, LOAN_OPTIONS, Meta, metaBonuses, newRun, Run, runGold } from './game/state';
import { DIALOGUES, dialogueStart, nodeLines } from './story/dialogues';
import { applyEffects } from './story/engine';
import { SCENES } from './story/scenes';
import { CLUES, PRIZE } from './story/data';
import { Ctx, Effect, UiCmd } from './story/types';
import { DialogueBox } from './ui/DialogueBox';
import { Explore } from './ui/Explore';
import { MatchView } from './ui/MatchView';
import { AutomatonModal, CluesModal, CodexModal, HelpModal, MetaShopModal } from './ui/Modals';
import { EndingInfo, EndingScreen, ResultInfo, ResultScreen, TitleScreen } from './ui/Screens';
import { ShopView } from './ui/ShopView';
import { isMuted, setMuted, sfx } from './ui/audio';

type Screen = 'title' | 'explore' | 'match' | 'shop' | 'result' | 'ending';
type ModalId = 'help' | 'auto' | 'clues' | 'meta' | 'codex' | null;
interface Dlg { id: string; nodeId: string; line: number }

function initialCtx(): { ctx: Ctx; screen: Screen } {
  return { ctx: { story: defaultStory(), run: null, meta: defaultMeta() }, screen: 'title' };
}

export default function App() {
  const init = useRef(initialCtx()).current;
  const [screen, setScreen] = useState<Screen>(init.screen);
  const [ctx, setCtx] = useState<Ctx>(init.ctx);
  const ctxRef = useRef<Ctx>(init.ctx);
  const [dlg, setDlg] = useState<Dlg | null>(null);
  const [queue, setQueue] = useState<UiCmd[]>([]);
  const [modal, setModal] = useState<ModalId>(null);
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null);
  const [matchInit, setMatchInit] = useState<{ opp: OpponentDef; state: MatchState } | null>(null);
  const [result, setResult] = useState<ResultInfo | null>(null);
  const [ending, setEnding] = useState<EndingInfo | null>(null);
  const [muted, setMutedState] = useState(isMuted());
  const [saveExists, setSaveExists] = useState(() => hasSave());
  const [skipStory, setSkipStory] = useState(() => loadSkipStory());
  const toastKey = useRef(0);

  const commit = useCallback((c: Ctx) => {
    ctxRef.current = c;
    setCtx(c);
  }, []);

  const showToast = useCallback((text: string) => {
    toastKey.current += 1;
    setToast({ text, key: toastKey.current });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // ---------- salvamento automático ----------
  useEffect(() => {
    if (screen === 'title' || screen === 'match' || screen === 'result') return;
    writeSave({ version: 1, screen: screen === 'shop' ? 'shop' : 'explore', story: ctx.story, run: ctx.run, meta: ctx.meta });
    setSaveExists(true);
  }, [ctx, screen]);

  // ---------- efeitos e fila de comandos ----------
  const runEffects = useCallback(
    (effects: Effect[]) => {
      const r = applyEffects(ctxRef.current, effects);
      commit(r.ctx);
      const q: UiCmd[] = [];
      for (const c of r.cmds) {
        if (c.t === 'toast') showToast(c.text);
        else q.push(c);
      }
      if (q.length) setQueue((old) => [...old, ...q]);
    },
    [commit, showToast],
  );

  const enterNode = useCallback(
    (id: string, nodeId: string) => {
      const node = DIALOGUES[id]?.nodes[nodeId];
      if (!node) {
        setDlg(null);
        return;
      }
      setDlg({ id, nodeId, line: 0 });
      if (node.effects) runEffects(node.effects);
    },
    [runEffects],
  );

  const openDialogue = useCallback(
    (id: string) => {
      const d = DIALOGUES[id];
      if (!d) return;
      enterNode(id, dialogueStart(d, ctxRef.current));
    },
    [enterNode],
  );

  const startMatchFlow = useCallback(() => {
    const c = ctxRef.current;
    if (!c.run) return;
    const opp = OPPONENTS[Math.min(c.run.tableIndex, OPPONENTS.length - 1)];
    const state = startMatch({
      opponent: opp,
      rules: effectiveRules(opp, c.meta.clues),
      deck: c.run.deck,
      relics: c.run.relics,
      handLevels: c.run.handLevels,
      inDebt: c.run.debt > 0,
      bonuses: metaBonuses(c.meta),
    });
    setMatchInit({ opp, state });
    setScreen('match');
  }, []);

  const startEnding = useCallback(
    (id: 'sair' | 'ultima') => {
      const c = ctxRef.current;
      const run = c.run;
      if (!run) return;
      const net = run.money + PRIZE - run.debt;
      let win: boolean | undefined;
      let capri: EndingInfo['capri'];
      let house: EndingInfo['house'];
      if (id === 'ultima') {
        const cards = shuffle(createDeck());
        capri = cards[0];
        house = cards.find((x) => x.rank !== capri!.rank)!;
        win = capri.rank > house.rank;
      }
      const finalNet = id === 'sair' ? net : win ? net * 2 : 0;
      const gold = runGold(run, true);
      const endId = id === 'sair' ? 'sair' : win ? 'ultima_win' : 'ultima_lose';
      const meta: Meta = {
        ...c.meta,
        gold: c.meta.gold + gold,
        wins: c.meta.wins + 1,
        bestTable: 8,
        endings: c.meta.endings.includes(endId) ? c.meta.endings : [...c.meta.endings, endId],
      };
      const flags = { ...c.story.flags };
      delete flags.onix_intro;
      commit({ story: { ...c.story, scene: 'rua', flags }, run: null, meta });
      setEnding({ id, net, finalNet, win, capri, house, gold, stats: run.stats, debt: run.debt, clues: c.meta.clues.length });
      setScreen('ending');
    },
    [commit],
  );

  // bombeia a fila de comandos quando não há diálogo aberto
  useEffect(() => {
    if (screen !== 'explore' || dlg || queue.length === 0 || modal) return;
    const [cmd, ...rest] = queue;
    setQueue(rest);
    if (cmd.t === 'dialogue') openDialogue(cmd.id);
    else if (cmd.t === 'match') startMatchFlow();
    else if (cmd.t === 'metashop') setModal('meta');
    else if (cmd.t === 'ending') startEnding(cmd.id);
  }, [screen, dlg, queue, modal, openDialogue, startMatchFlow, startEnding]);

  // eventos automáticos de cena (cobrança do agiota, confronto final)
  const sceneKey = `${ctx.story.scene}|${ctx.run?.tableIndex ?? -1}|${ctx.run?.cobrancaDone ?? 'x'}|${ctx.story.flags.onix_intro ? 1 : 0}`;
  useEffect(() => {
    if (screen !== 'explore' || dlg || queue.length > 0 || modal) return;
    const ev = SCENES[ctx.story.scene].autoEvent?.(ctxRef.current);
    if (ev) openDialogue(ev);
  }, [screen, sceneKey, dlg === null, queue.length, modal]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- diálogo ----------
  const curNode = dlg ? DIALOGUES[dlg.id]?.nodes[dlg.nodeId] : null;
  useEffect(() => {
    if (!skipStory || !dlg || !curNode) return;
    const visibleChoices = (curNode.choices ?? []).filter((c) => !c.if || c.if(ctxRef.current));
    if (visibleChoices.length > 0) {
      const lastLine = Math.max(0, nodeLines(curNode.lines, ctxRef.current).length - 1);
      if (dlg.line !== lastLine) setDlg({ ...dlg, line: lastLine });
    } else if (curNode.next) {
      enterNode(dlg.id, curNode.next);
    } else {
      setDlg(null);
    }
  }, [skipStory, dlg, curNode, enterNode]);

  const advance = () => {
    if (!dlg || !curNode) return;
    const lines = nodeLines(curNode.lines, ctxRef.current);
    if (dlg.line < lines.length - 1) {
      sfx.click();
      setDlg({ ...dlg, line: dlg.line + 1 });
      return;
    }
    const visible = (curNode.choices ?? []).filter((c) => !c.if || c.if(ctxRef.current));
    if (visible.length > 0) return;
    if (curNode.next) enterNode(dlg.id, curNode.next);
    else setDlg(null);
  };
  const choose = (i: number) => {
    if (!dlg || !curNode?.choices) return;
    const ch = curNode.choices[i];
    if (!ch) return;
    sfx.click();
    if (ch.effects) runEffects(ch.effects);
    if (ch.next) enterNode(dlg.id, ch.next);
    else setDlg(null);
  };

  // ---------- fluxo de partida ----------
  const onMatchEnd = (m: MatchState) => {
    const c = ctxRef.current;
    const run = c.run!;
    const opp = matchInit!.opp;
    if (m.status === 'won') {
      const pay = matchPayout(m);
      const nr: Run = {
        ...run,
        money: run.money + pay.total,
        tableIndex: run.tableIndex + 1,
        stats: {
          tablesWon: run.stats.tablesWon + 1,
          handsPlayed: run.stats.handsPlayed + m.handsPlayed,
          pdaAccepts: run.stats.pdaAccepts + m.pdaAccepts,
          bestHand: Math.max(run.stats.bestHand, m.bestHand),
        },
        shop: null,
      };
      commit({ ...c, run: nr });
      setResult({ won: true, opp, state: m });
    } else {
      const gold = runGold(run, false);
      const meta: Meta = { ...c.meta, gold: c.meta.gold + gold, bestTable: Math.max(c.meta.bestTable, run.stats.tablesWon) };
      const flags = { ...c.story.flags };
      delete flags.onix_intro;
      commit({ story: { ...c.story, scene: 'rua', flags }, run: null, meta });
      setResult({ won: false, opp, state: m, gold, tables: run.stats.tablesWon });
    }
    setScreen('result');
  };

  const onResultContinue = () => {
    const c = ctxRef.current;
    if (!result) return;
    if (!result.won) {
      setResult(null);
      setMatchInit(null);
      setScreen('explore');
      return;
    }
    if (result.opp.boss) {
      commit({ ...c, story: { ...c.story, scene: 'escritorio' } });
      setResult(null);
      setMatchInit(null);
      setScreen('explore');
      setQueue((q) => [...q, { t: 'dialogue', id: 'boss_win' }]);
      return;
    }
    const run = c.run!;
    commit({ ...c, story: { ...c.story, scene: 'salao' }, run: { ...run, shop: generateShop(run) } });
    setResult(null);
    setMatchInit(null);
    setScreen('shop');
  };

  const forfeit = () => {
    const m = matchInit!.state;
    onMatchEnd({ ...m, status: 'lost' });
  };

  // ---------- menu ----------
  const newGame = () => {
    if (saveExists && !window.confirm('Começar um novo jogo apaga o salvamento atual (inclusive melhorias e pistas). Continuar?')) return;
    clearSave();
    if (skipStory) {
      commit(createQuickStart());
      setDlg(null);
      setQueue([]);
      setScreen('explore');
      return;
    }
    const story = { ...defaultStory(), flags: { intro_done: true } };
    commit({ story, run: null, meta: defaultMeta() });
    setDlg(null);
    setQueue([]);
    setScreen('explore');
    setTimeout(() => openDialogue('intro'), 0);
  };
  /** Atalho de desenvolvedor (botão escondido na tela inicial): pula a introdução. */
  const devStart = () => {
    const meta = ctxRef.current.meta ?? defaultMeta();
    const run = newRun(LOAN_OPTIONS[1], meta);
    const story = {
      ...defaultStory(),
      scene: 'salao' as const,
      flags: { intro_done: true, entrou: true, tutorial_done: true, match_tutorial_seen: true },
    };
    commit({ story, run, meta: { ...meta, enteredOnce: true } });
    setDlg(null);
    setQueue([]);
    setScreen('explore');
  };
  const continueGame = () => {
    const s = loadSave();
    if (!s) return newGame();
    commit({ story: s.story, run: s.run, meta: s.meta });
    setDlg(null);
    setQueue([]);
    setScreen(s.screen === 'shop' && s.run?.shop ? 'shop' : 'explore');
  };
  const toggleMute = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };

  const locked = !!dlg || queue.length > 0 || !!modal;

  return (
    <div className="app">
      {screen === 'title' && (
        <TitleScreen
          hasSave={saveExists}
          endings={ctx.meta.endings.length}
          onContinue={continueGame}
          onNew={newGame}
          onHelp={() => setModal('help')}
          onAuto={() => setModal('auto')}
          onCodex={() => setModal('codex')}
          onMute={toggleMute}
          muted={muted}
          onDev={devStart}
          skipStory={skipStory}
          onSkipStoryChange={(skip) => {
            setSkipStory(skip);
            writeSkipStory(skip);
          }}
        />
      )}
      {screen === 'explore' && (
        <>
          <Explore ctx={ctx} locked={locked} onEffects={runEffects} onToast={showToast} onClues={() => setModal('clues')} onHelp={() => setModal('help')} onMenu={() => setScreen('title')} />
          {dlg && curNode && <DialogueBox ctx={ctx} node={curNode} line={dlg.line} skipStory={skipStory} onAdvance={advance} onChoose={choose} />}
        </>
      )}
      {screen === 'match' && matchInit && ctx.run && (
        <MatchView
          opponent={matchInit.opp}
          initial={matchInit.state}
          onEnd={onMatchEnd}
          onHelp={() => setModal('help')}
          onAuto={() => setModal('auto')}
          onForfeit={forfeit}
          showTutorial={!ctx.story.flags.match_tutorial_seen}
          onTutorialDone={() => {
            const current = ctxRef.current;
            commit({
              ...current,
              story: { ...current.story, flags: { ...current.story.flags, match_tutorial_seen: true } },
            });
          }}
        />
      )}
      {screen === 'result' && result && <ResultScreen info={result} onContinue={onResultContinue} />}
      {screen === 'shop' && ctx.run?.shop && (
        <ShopView
          run={ctx.run}
          onChange={(r) => commit({ ...ctx, run: r })}
          onLeave={() => {
            commit({ ...ctx, story: { ...ctx.story, scene: 'salao' }, run: { ...ctx.run!, shop: null } });
            setScreen('explore');
          }}
        />
      )}
      {screen === 'ending' && ending && (
        <EndingScreen
          info={ending}
          onAgain={() => {
            setEnding(null);
            setScreen('explore');
          }}
          onMenu={() => {
            setEnding(null);
            setScreen('title');
          }}
        />
      )}
      {modal === 'help' && <HelpModal onClose={() => setModal(null)} />}
      {modal === 'auto' && <AutomatonModal onClose={() => setModal(null)} />}
      {modal === 'clues' && <CluesModal meta={ctx.meta} onClose={() => setModal(null)} />}
      {modal === 'codex' && <CodexModal onClose={() => setModal(null)} />}
      {modal === 'meta' && <MetaShopModal meta={ctx.meta} onBuy={(m) => commit({ ...ctx, meta: m })} onClose={() => setModal(null)} />}
      {toast && (
        <div key={toast.key} className="toast" role="status">
          {toast.text}
        </div>
      )}
    </div>
  );
}

void CLUES;

import { Card } from '../game/cards';
import { MatchState, matchPayout } from '../game/match';
import { OpponentDef } from '../game/opponents';
import { RunStats } from '../game/state';
import { CardView } from './CardView';
import { Portrait } from './Portrait';
import { isMuted } from './audio';

export function TitleScreen({
  hasSave, endings, onContinue, onNew, onHelp, onAuto, onCodex, onMute, muted, onDev, skipStory, onSkipStoryChange,
}: {
  onDev: () => void; hasSave: boolean; endings: number; onContinue: () => void; onNew: () => void; onHelp: () => void; onAuto: () => void; onCodex: () => void; onMute: () => void; muted: boolean; skipStory: boolean; onSkipStoryChange: (skip: boolean) => void;
}) {
  void isMuted;
  return (
    <div className="title-screen">
      <div className="suits" aria-hidden="true">♠ ♥ ♣ ♦</div>
      <h1 className="logo">Aupostomato</h1>
      <div className="title-menu">
        {hasSave && <button className="btn primary big" onClick={onContinue}>Continuar</button>}
        <button className={`btn big ${hasSave ? '' : 'primary'}`} onClick={onNew}>Novo jogo</button>
        <label className="skip-story-option">
          <input type="checkbox" checked={skipStory} onChange={(e) => onSkipStoryChange(e.target.checked)} />
          <span>
            <strong>Pular história</strong>
            <small>Pula falas; escolhas importantes continuam aparecendo.</small>
          </span>
        </label>
        <button className="btn" onClick={onHelp}>Como jogar</button>
        <button className="btn" onClick={onAuto}>O autômato (PDA)</button>
        <button className="btn" onClick={onCodex}>Referência</button>
        <button className="btn tiny" onClick={onMute}>{muted ? '🔇 Som desligado' : '🔊 Som ligado'}</button>
      </div>
      {/* atalho escondido para quem desenvolve: pula a introdução e vai direto ao salão, com empréstimo e tutorial feitos */}
      <button type="button" className="dev-hot" onClick={onDev} tabIndex={-1} aria-hidden="true" />
      <p className="muted fine">Finais vistos: {endings}/3 · Salvamento automático neste navegador</p>
    </div>
  );
}

export type ResultInfo =
  | { won: true; opp: OpponentDef; state: MatchState }
  | { won: false; opp: OpponentDef; state: MatchState; gold: number; tables: number };

export function ResultScreen({ info, onContinue }: { info: ResultInfo; onContinue: () => void }) {
  const { opp, state } = info;
  if (info.won) {
    const p = matchPayout(state);
    return (
      <div className="result win">
        <Portrait spec={opp.portrait} size={120} />
        <h2>Mesa vencida!</h2>
        <p className="quote">{opp.win}</p>
        <table className="tbl pay">
          <tbody>
            <tr><td>Recompensa da mesa</td><td>${p.base}</td></tr>
            <tr><td>Mãos não usadas ({state.handsLeft} × $15)</td><td>${p.handsBonus}</td></tr>
            <tr><td>Carimbos dourados</td><td>${p.gold}</td></tr>
            {p.relics > 0 && <tr><td>Relíquias</td><td>${p.relics}</td></tr>}
            <tr className="tot"><td>Total</td><td>${p.total}</td></tr>
          </tbody>
        </table>
        <p className="muted">{state.handsPlayed} mãos · {state.pdaAccepts} aceitas pelo PDA · melhor mão: {state.bestHand.toLocaleString('pt-BR')}</p>
        <button className="btn primary big" onClick={onContinue}>{opp.boss ? 'Continuar' : 'Ir à loja ▸'}</button>
      </div>
    );
  }
  return (
    <div className="result lose">
      <Portrait spec={opp.portrait} size={120} />
      <h2>Você perdeu a mesa</h2>
      <p className="quote">{state.score.toLocaleString('pt-BR')} de {state.target.toLocaleString('pt-BR')} pontos contra {opp.name}.</p>
      <p>Capri volta para a calçada com os bolsos vazios e o Vício sussurrando. Mesas derrubadas: <b>{info.tables}</b>.</p>
      <p className="gold">+{info.gold} Fichas Douradas para o Caderno do Lúcio</p>
      <p className="muted">As pistas e melhorias permanentes continuam com você. Brutus deixa você entrar de novo.</p>
      <button className="btn primary big" onClick={onContinue}>Tentar de novo</button>
    </div>
  );
}

export interface EndingInfo {
  id: 'sair' | 'ultima';
  net: number;
  finalNet: number;
  win?: boolean;
  capri?: Card;
  house?: Card;
  gold: number;
  stats: RunStats;
  debt: number;
  clues: number;
}

export function EndingScreen({ info, onAgain, onMenu }: { info: EndingInfo; onAgain: () => void; onMenu: () => void }) {
  const title = info.id === 'sair' ? 'Saída de cabeça erguida' : info.win ? 'A última aposta' : 'A casa sempre ganha';
  return (
    <div className="ending">
      <h2>{title}</h2>
      {info.id === 'sair' ? (
        <>
          <p>Capri paga o Tio Juros até o último centavo e atravessa o salão sem olhar para as mesas. Lá fora, o letreiro continua piscando, e ele finalmente entende que a mensagem nunca foi para ele.</p>
          <p>Pela primeira vez em anos, a pilha está vazia — e é exatamente assim que deveria terminar.</p>
        </>
      ) : (
        <>
          <p>Capri empurra tudo para o centro da mesa. Uma carta para ele, uma para a casa. A mais alta leva.</p>
          <div className="duel">
            <div><span className="muted">Capri</span>{info.capri && <CardView card={info.capri} />}</div>
            <b>×</b>
            <div><span className="muted">A casa</span>{info.house && <CardView card={info.house} />}</div>
          </div>
          {info.win ? (
            <p>O Vício sorri por dentro. O prêmio dobra, e Capri sai com os bolsos pesados... sabendo que vai voltar amanhã.</p>
          ) : (
            <p>A carta da casa é maior. O prêmio, as fichas e a dívida quitada viram fumaça. Na calçada, o banco continua lá, esperando.</p>
          )}
        </>
      )}
      <table className="tbl pay">
        <tbody>
          <tr><td>Prêmio da Noite dos Magnatas</td><td>$5.000</td></tr>
          <tr><td>Dívida restante com o Tio Juros</td><td>−${info.debt.toLocaleString('pt-BR')}</td></tr>
          {info.id === 'ultima' && <tr><td>Aposta final (dobro ou nada)</td><td>{info.win ? '×2' : 'perdeu tudo'}</td></tr>}
          <tr className="tot"><td>Capri sai com</td><td>${info.finalNet.toLocaleString('pt-BR')}</td></tr>
        </tbody>
      </table>
      <p className="muted">
        {info.stats.tablesWon} mesas · {info.stats.handsPlayed} mãos · {info.stats.pdaAccepts} aceitas pelo PDA · melhor mão {info.stats.bestHand.toLocaleString('pt-BR')} · {info.clues}/4 pistas
      </p>
      <p className="gold">+{info.gold} Fichas Douradas</p>
      <div className="row">
        <button className="btn primary big" onClick={onAgain}>Jogar de novo</button>
        <button className="btn big" onClick={onMenu}>Menu</button>
      </div>
    </div>
  );
}

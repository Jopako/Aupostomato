import { useEffect } from 'react';
import { Ctx, DNode } from '../story/types';
import { nodeLines } from '../story/dialogues';

interface Props {
  ctx: Ctx;
  node: DNode;
  line: number;
  skipStory: boolean;
  onAdvance: () => void;
  onChoose: (i: number) => void;
}

const WHO_CLASS: Record<string, string> = {
  Capri: 'capri',
  Narrador: 'narr',
  'Vício': 'vicio',
};

export function DialogueBox({ ctx, node, line, skipStory, onAdvance, onChoose }: Props) {
  const lines = nodeLines(node.lines, ctx);
  const cur = lines[Math.min(line, lines.length - 1)];
  const last = line >= lines.length - 1;
  const choices = (skipStory || last) ? (node.choices ?? []).map((c, i) => ({ c, i })).filter(({ c }) => !c.if || c.if(ctx)) : [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (choices.length > 0) {
        const n = Number(e.key);
        if (n >= 1 && n <= choices.length) onChoose(choices[n - 1].i);
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onAdvance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!cur && choices.length === 0) return null;
  return (
    <div className="dialogue-wrap">
      <div className="dialogue" role="dialog" aria-live="polite" onClick={() => choices.length === 0 && onAdvance()}>
        {skipStory && choices.length > 0 ? (
          <p className="skip-story-prompt">Escolha como agir:</p>
        ) : cur && (
          <>
            <div className={`who ${WHO_CLASS[cur.who] ?? 'npc'}`}>{cur.who}</div>
            <p className={`say ${cur.who === 'Narrador' ? 'italic' : ''}`}>{cur.text}</p>
          </>
        )}
        {choices.length > 0 ? (
          <div className="choices">
            {choices.map(({ c, i }, n) => (
              <button key={i} className="choice" onClick={(e) => { e.stopPropagation(); onChoose(i); }}>
                <b>{n + 1}</b> {c.text}
              </button>
            ))}
          </div>
        ) : (
          <div className="cont">{last && !node.next && !node.choices ? 'fechar ▸' : 'continuar ▸'}</div>
        )}
      </div>
    </div>
  );
}

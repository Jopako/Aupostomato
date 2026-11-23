import { Ctx } from '../story/types';
import { defaultMeta, defaultStory, LOAN_OPTIONS, newRun } from './state';

export function createQuickStart(): Ctx {
  const meta = { ...defaultMeta(), runs: 1, enteredOnce: true };
  const run = newRun(LOAN_OPTIONS[0], meta);
  const story = {
    ...defaultStory(),
    scene: 'salao' as const,
    flags: {
      intro_done: true,
      entrou: true,
      tutorial_done: true,
      table_guidance: true,
    },
  };
  return { story, run, meta };
}

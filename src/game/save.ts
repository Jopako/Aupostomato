import { Meta, Run, Story, defaultMeta, defaultStory } from './state';

const KEY = 'aupostomato:save:v2';
const SKIP_STORY_KEY = 'aupostomato:skip-story';

export type SavedScreen = 'explore' | 'shop';

export interface SaveData {
  version: 1;
  screen: SavedScreen;
  story: Story;
  run: Run | null;
  meta: Meta;
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadSave(): SaveData | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as SaveData;
    if (d.version !== 1 || !d.story || !d.meta) return null;
    return { ...d, meta: { ...defaultMeta(), ...d.meta }, story: { ...defaultStory(), ...d.story } };
  } catch {
    return null;
  }
}

export function writeSave(d: SaveData): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(KEY, JSON.stringify(d));
  } catch {
    /* cota cheia ou modo privado: ignora */
  }
}

export function clearSave(): void {
  const s = storage();
  try {
    s?.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Só a meta-progressão (usada para "Novo jogo" preservando o que já foi aprendido, se desejado). */
export function hasSave(): boolean {
  return loadSave() !== null;
}

export function loadSkipStory(): boolean {
  const s = storage();
  if (!s) return false;
  try {
    return s.getItem(SKIP_STORY_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeSkipStory(skip: boolean): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(SKIP_STORY_KEY, skip ? '1' : '0');
  } catch {
    /* cota cheia ou modo privado: ignora */
  }
}

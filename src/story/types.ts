import { Meta, Run, SceneId, Story } from '../game/state';

export interface Ctx {
  story: Story;
  run: Run | null;
  meta: Meta;
}

export type Cond = (c: Ctx) => boolean;
export type EndingId = 'sair' | 'ultima';

export type Effect =
  | { k: 'flag'; key: string; value?: boolean }
  | { k: 'give'; item: string }
  | { k: 'remove'; item: string }
  | { k: 'clue'; id: string }
  | { k: 'goto'; scene: SceneId }
  | { k: 'enter' }
  | { k: 'loan'; option: number }
  | { k: 'pay'; amount: number | 'all' }
  | { k: 'cobranca'; mode: 'all' | 'half' | 'none' }
  | { k: 'dialogue'; id: string }
  | { k: 'match' }
  | { k: 'metashop' }
  | { k: 'ending'; id: EndingId }
  | { k: 'toast'; text: string };

export interface Line {
  who: string;
  text: string;
}

export interface Choice {
  text: string;
  next: string | null;
  effects?: Effect[];
  if?: Cond;
}

export interface DNode {
  lines: Line[] | ((c: Ctx) => Line[]);
  choices?: Choice[];
  /** próximo nó quando não há escolhas; null/ausente encerra */
  next?: string | null;
  /** efeitos aplicados ao entrar no nó */
  effects?: Effect[];
}

export interface Dialogue {
  start: string | ((c: Ctx) => string);
  nodes: Record<string, DNode>;
}

export interface Hotspot {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** seta de saída em vez de objeto/personagem */
  exit?: boolean;
  visible?: Cond;
  onClick: (c: Ctx) => Effect[];
  /** item do inventário usado sobre este ponto */
  use?: Record<string, (c: Ctx) => Effect[]>;
}

export interface SceneDef {
  id: SceneId;
  name: string;
  hotspots: Hotspot[];
  /** diálogo que dispara sozinho ao entrar na cena */
  autoEvent?: (c: Ctx) => string | null;
}

export type UiCmd =
  | { t: 'dialogue'; id: string }
  | { t: 'match' }
  | { t: 'metashop' }
  | { t: 'ending'; id: EndingId }
  | { t: 'toast'; text: string };

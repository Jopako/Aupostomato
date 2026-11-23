import { SceneId } from '../game/state';
import { Ctx, Effect, Hotspot, SceneDef } from './types';

const d = (id: string): Effect[] => [{ k: 'dialogue', id }];
const go = (scene: SceneId): Effect[] => [{ k: 'goto', scene }];
const has = (c: Ctx, item: string) => c.story.items.includes(item);
const flag = (c: Ctx, k: string) => !!c.story.flags[k];
const clue = (c: Ctx, id: string) => c.meta.clues.includes(id);

const NO_USE = [{ k: 'toast', text: 'Isso não funciona aqui.' } as Effect];

/** Itens podem ser usados diretamente sobre alguns pontos; o resto cai no "não funciona". */
function useNothing(): Record<string, (c: Ctx) => Effect[]> {
  return { '*': () => NO_USE };
}

const rua: SceneDef = {
  id: 'rua',
  name: 'Rua do Cassino Ônix',
  hotspots: [
    {
      id: 'porta', label: 'Porta do cassino (Brutus)', x: 395, y: 240, w: 210, h: 190,
      onClick: (c) => d(c.meta.enteredOnce ? 'brutus_volta' : 'brutus'),
      use: {
        convite: (c) => d(c.meta.enteredOnce ? 'brutus_volta' : 'brutus'),
        '*': () => NO_USE,
      },
    },
    { id: 'letreiro', label: 'Letreiro neon', x: 380, y: 80, w: 260, h: 80, onClick: () => d('rua_letreiro'), use: useNothing() },
    { id: 'cartaz', label: 'Cartaz do evento', x: 625, y: 250, w: 100, h: 110, onClick: () => d('rua_cartaz'), use: useNothing() },
    {
      id: 'banco', label: 'Banco', x: 90, y: 380, w: 190, h: 90,
      onClick: (c) => (has(c, 'isqueiro') || flag(c, 'nandoHelped') ? d('banco_vazio') : d('banco_isqueiro')),
      use: useNothing(),
    },
    { id: 'lixeira', label: 'Lixeira', x: 800, y: 380, w: 90, h: 100, onClick: () => d('rua_lixeira'), use: useNothing() },
    { id: 'beco', label: 'Beco ao lado →', x: 900, y: 230, w: 95, h: 190, exit: true, onClick: () => go('beco') },
  ],
};

const beco: SceneDef = {
  id: 'beco',
  name: 'Beco lateral',
  hotspots: [
    {
      id: 'nando', label: 'Nando (garçom)', x: 520, y: 240, w: 110, h: 220,
      onClick: () => d('nando'),
      use: { isqueiro: () => d('nando'), '*': () => NO_USE },
    },
    { id: 'furgao', label: 'Furgão da lavanderia', x: 40, y: 230, w: 360, h: 240, onClick: () => d('furgao'), use: useNothing() },
    { id: 'porta_servico', label: 'Porta de serviço', x: 690, y: 220, w: 140, h: 220, onClick: () => d('beco_porta'), use: useNothing() },
    { id: 'lixeira_beco', label: 'Lixeira', x: 850, y: 340, w: 130, h: 130, onClick: () => d('beco_lixeira'), use: useNothing() },
    { id: 'voltar', label: '↓ Voltar para a rua', x: 380, y: 490, w: 240, h: 60, exit: true, onClick: () => go('rua') },
  ],
};

const salao: SceneDef = {
  id: 'salao',
  name: 'Salão Ônix',
  autoEvent: (c) => {
    if (c.run && c.run.tableIndex === 3 && !c.run.cobrancaDone) return 'cobranca';
    return null;
  },
  hotspots: [
    {
      id: 'agiota', label: 'Tio Juros (agiota)', x: 770, y: 300, w: 200, h: 170,
      onClick: (c) => {
        if (!c.run) return d('agiota_emprestimo');
        if (c.run.tableIndex >= 4 && !clue(c, 'clue_contrato')) return d('agiota_clue');
        return d('agiota_conversa');
      },
      use: useNothing(),
    },
    { id: 'bar', label: 'Bar do Lúcio', x: 20, y: 170, w: 290, h: 280, onClick: () => d('lucio'), use: useNothing() },
    {
      id: 'mesa', label: 'Mesa de poker (Cecília)', x: 340, y: 290, w: 360, h: 190,
      onClick: (c) => {
        if (!c.run) return d('mesa_sem_fichas');
        if (c.run.tableIndex >= 7) return d('mesa_fim');
        if (c.run.tableIndex >= 3 && !clue(c, 'clue_baralho')) return d('cecilia_confissao');
        if (!flag(c, 'tutorial_done')) return d('cecilia_tutorial');
        return [{ k: 'match' }];
      },
      use: useNothing(),
    },
    { id: 'lustre', label: 'Lustre', x: 400, y: 10, w: 200, h: 120, onClick: () => d('lustre'), use: useNothing() },
    { id: 'convidados', label: 'Convidados', x: 430, y: 140, w: 150, h: 140, onClick: () => d('convidados'), use: useNothing() },
    { id: 'porta_servico', label: '← Corredor de serviço', x: 320, y: 120, w: 90, h: 160, exit: true, onClick: () => go('servico') },
    {
      id: 'porta_escritorio', label: 'Escritório da Madame', x: 600, y: 120, w: 100, h: 160, exit: true,
      onClick: (c) => (c.run && c.run.tableIndex >= 7 ? go('escritorio') : d('escritorio_trancado')),
    },
  ],
};

const servico: SceneDef = {
  id: 'servico',
  name: 'Corredor de serviço',
  hotspots: [
    { id: 'caixote', label: 'Caixote com cadeado', x: 520, y: 300, w: 220, h: 170, onClick: () => d('caixote'), use: useNothing() },
    { id: 'nando_servico', label: 'Nando', x: 250, y: 220, w: 110, h: 240, onClick: () => d('nando_servico'), use: useNothing() },
    { id: 'cabides', label: 'Cabides da lavanderia', x: 770, y: 180, w: 200, h: 250, onClick: () => d('cabides'), use: useNothing() },
    { id: 'voltar', label: '↓ Voltar ao salão', x: 380, y: 490, w: 240, h: 60, exit: true, onClick: () => go('salao') },
  ],
};

const escritorio: SceneDef = {
  id: 'escritorio',
  name: 'Escritório da Madame',
  autoEvent: (c) => (c.run && c.run.tableIndex >= 7 && !c.story.flags.onix_intro ? 'onix_confronto' : null),
  hotspots: [
    { id: 'madame', label: 'Madame Ônix', x: 400, y: 170, w: 200, h: 280, onClick: () => d('madame'), use: useNothing() },
    { id: 'automato', label: 'O Autômato', x: 700, y: 120, w: 270, h: 340, onClick: () => d('automato'), use: useNothing() },
    { id: 'voltar', label: '↓ Voltar ao salão', x: 380, y: 490, w: 240, h: 60, exit: true, onClick: () => go('salao') },
  ],
};

export const SCENES: Record<SceneId, SceneDef> = { rua, beco, salao, servico, escritorio };

export function visibleHotspots(scene: SceneDef, c: Ctx): Hotspot[] {
  return scene.hotspots.filter((h) => !h.visible || h.visible(c));
}

// Gera src/ui/portraitArt.ts a partir do DiceBear "Pixel Art" (design CC0 1.0, código MIT).
// Uso: npm i --no-save @dicebear/core @dicebear/pixel-art && node tools/gen-portraits.mjs
import { createAvatar } from '@dicebear/core';
import * as pixelArt from '@dicebear/pixel-art';
import fs from 'fs';

const none = { accessoriesProbability: 0, beardProbability: 0, glassesProbability: 0, hatProbability: 0 };
const P = {
  // protagonista e equipe
  capri:      { skinColor: ['eac393'], hair: ['short16'], hairColor: ['4a2c1a'], clothing: ['variant12'], clothingColor: ['6b6f7a'], eyes: ['variant03'], mouth: ['happy02'], accessories: ['variant01'], accessoriesProbability: 100, accessoriesColor: ['ffd700'], bg: '24203a' },
  guard:      { skinColor: ['a26d3d'], hairProbability: 0, clothing: ['variant08'], clothingColor: ['111114'], glasses: ['dark07'], glassesProbability: 100, glassesColor: ['191919'], eyes: ['variant05'], mouth: ['sad03'], bg: '1c1c26' },
  waiter:     { skinColor: ['cb9e6e'], hair: ['short07'], hairColor: ['28150a'], clothing: ['variant14'], clothingColor: ['26262e'], eyes: ['variant02'], mouth: ['happy05'], bg: '2a1620' },
  barman:     { skinColor: ['cb9e6e'], hair: ['short12'], hairColor: ['28150a'], beard: ['variant03'], beardProbability: 100, clothing: ['variant04'], clothingColor: ['7a3b22'], eyes: ['variant04'], mouth: ['happy03'], bg: '2d1c14' },
  dealer:     { skinColor: ['f5cfa0'], hair: ['long12'], hairColor: ['28150a'], clothing: ['variant17'], clothingColor: ['ae0001'], eyes: ['variant06'], mouth: ['happy06'], mouthColor: ['e35d6a'], bg: '3a0d18' },
  lender:     { skinColor: ['eac393'], hair: ['short24'], hairColor: ['a9a9a9'], glasses: ['light03'], glassesProbability: 100, glassesColor: ['4b4b4b'], clothing: ['variant03'], clothingColor: ['4a3626'], eyes: ['variant09'], mouth: ['happy01'], bg: '2a2216' },
  madame:     { skinColor: ['ffdbac'], hair: ['long04'], hairColor: ['0a0a0a'], accessories: ['variant02'], accessoriesProbability: 100, accessoriesColor: ['ffd700'], clothing: ['variant21'], clothingColor: ['0d0d12'], eyes: ['variant07'], mouth: ['happy09'], mouthColor: ['de0f0d'], bg: '1a1030' },
  driver:     { skinColor: ['cb9e6e'], hat: ['variant07'], hatColor: ['2663a3'], hatProbability: 100, hair: ['short05'], hairColor: ['333333'], clothing: ['variant08'], clothingColor: ['2a5d8a'], eyes: ['variant03'], mouth: ['happy02'], bg: '14283a' },
  vicio:      { skinColor: ['7b3fe4'], hair: ['long18'], hairColor: ['b28dff'], clothing: ['variant20'], clothingColor: ['2b1a52'], eyes: ['variant12'], eyesColor: ['ff2e63'], mouth: ['sad06'], mouthColor: ['ff2e63'], bg: '0e0620' },
  narrator:   { skinColor: ['d0d0d0'], hair: ['short20'], hairColor: ['8a8a8a'], glasses: ['light01'], glassesProbability: 100, glassesColor: ['323232'], clothing: ['variant12'], clothingColor: ['2a2a30'], eyes: ['variant01'], mouth: ['happy01'], bg: '202028' },
  dame:       { skinColor: ['f5cfa0'], hair: ['long13'], hairColor: ['c9a24a'], accessories: ['variant03'], accessoriesProbability: 100, accessoriesColor: ['ffd700'], clothing: ['variant19'], clothingColor: ['7a1f4a'], eyes: ['variant08'], mouth: ['happy07'], mouthColor: ['e35d6a'], bg: '2a1030' },
  guest:      { skinColor: ['d6a982'], hair: ['short20'], hairColor: ['888888'], clothing: ['variant12'], clothingColor: ['222226'], eyes: ['variant02'], mouth: ['happy04'], bg: '202420' },
  // adversárias
  tycoon:     { skinColor: ['e0b687'], hair: ['short09'], hairColor: ['c9c9c9'], beard: ['variant02'], beardProbability: 100, clothing: ['variant15'], clothingColor: ['1d6a3b'], eyes: ['variant10'], mouth: ['happy03'], accessories: ['variant04'], accessoriesProbability: 100, accessoriesColor: ['ffd700'], bg: '10281c' },
  countess:   { skinColor: ['ffdbac'], hair: ['long09'], hairColor: ['111111'], clothing: ['variant22'], clothingColor: ['101040'], eyes: ['variant11'], mouth: ['happy10'], mouthColor: ['de0f0d'], accessories: ['variant01'], accessoriesProbability: 100, accessoriesColor: ['fafad2'], bg: '0e0e2a' },
  colonel:    { skinColor: ['cb9e6e'], hair: ['short01'], hairColor: ['e8e8e8'], beard: ['variant06'], beardProbability: 100, hat: ['variant05'], hatColor: ['3d8a6b'], hatProbability: 100, clothing: ['variant10'], clothingColor: ['3b4a2a'], eyes: ['variant05'], mouth: ['sad02'], bg: '1c2414' },
  accountant: { skinColor: ['eac393'], hair: ['short04'], hairColor: ['3a2f25'], glasses: ['light05'], glassesProbability: 100, glassesColor: ['191919'], clothing: ['variant05'], clothingColor: ['2b2b33'], eyes: ['variant03'], mouth: ['happy02'], bg: '14202a' },
  twinA:      { skinColor: ['d6a982'], hair: ['short14'], hairColor: ['222222'], clothing: ['variant12'], clothingColor: ['7a1d1d'], eyes: ['variant04'], mouth: ['happy05'], bg: '2a1414' },
  twinB:      { skinColor: ['d6a982'], hair: ['short10'], hairColor: ['222222'], clothing: ['variant12'], clothingColor: ['7a1d1d'], eyes: ['variant07'], mouth: ['happy05'], bg: '2a1414' },
};

const gen = (k) => {
  const { bg, ...o } = P[k];
  return createAvatar(pixelArt, { seed: k, ...none, ...o, backgroundColor: [bg], size: 32 }).toString();
};
const inner = (svg) => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
const out = {};
const bust = {};
for (const k of Object.keys(P)) if (!k.startsWith('twin')) out[k] = gen(k);
// bustos sem fundo, para as cenas
for (const k of Object.keys(P)) {
  if (k.startsWith('twin')) continue;
  const { bg, ...o } = P[k];
  bust[k] = createAvatar(pixelArt, { seed: k, ...none, ...o, size: 32 }).toString();
}
// gêmeos: dois retratos lado a lado num quadro 64×64
const tw = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" shape-rendering="crispEdges"><rect width="64" height="64" fill="#2a1414"/><svg x="0" y="16" width="32" height="32" viewBox="0 0 16 16">${inner(gen("twinA"))}</svg><svg x="32" y="16" width="32" height="32" viewBox="0 0 16 16">${inner(gen('twinB'))}</svg></svg>`;
out.twins = tw;
const ts = '// GERADO por tools/gen-portraits.mjs (DiceBear Pixel Art, design CC0 1.0). Não edite à mão.\n' +
  'export const PORTRAIT_SVG: Record<string, string> = ' + JSON.stringify(out, null, 1) + ';\n' +
  'export const BUST_SVG: Record<string, string> = ' + JSON.stringify(bust, null, 1) + ';\n';
fs.writeFileSync('src/ui/portraitArt.ts', ts);
// folha de contato para revisão
const sheet = '<style>body{background:#111;margin:6px}img{width:128px;height:128px;image-rendering:pixelated;margin:4px;border:3px solid #000}</style>' +
  Object.entries(out).map(([k, v]) => `<div style="display:inline-block;color:#fff;font:12px monospace;text-align:center"><img src="data:image/svg+xml;utf8,${encodeURIComponent(v)}"><br>${k}</div>`).join('');
fs.writeFileSync(process.argv[2] ?? '/tmp/sheet.html', sheet);
console.log(Object.keys(out).join(' '));

import { PORTRAIT_SVG } from './portraitArt';
import { PortraitSpec } from '../game/opponents';

/** Retratos em SVG (busto). Cada estilo tem acessórios próprios para dar personalidade. */
export const SPEAKERS: Record<string, PortraitSpec> = {
  Capri: { skin: '#e2b995', hair: '#4a2c1a', suit: '#6b6f7a', accent: '#d4af37', style: 'capri' },
  Brutus: { skin: '#b98760', hair: '#111', suit: '#0c0c10', accent: '#777', style: 'guard' },
  Nando: { skin: '#d9a77c', hair: '#1b1b1b', suit: '#202028', accent: '#e63946', style: 'waiter' },
  'Lúcio': { skin: '#c99a76', hair: '#2d2018', suit: '#5a2b1e', accent: '#d4af37', style: 'barman' },
  'Cecília': { skin: '#e0b48f', hair: '#2a1a14', suit: '#7a1020', accent: '#d4af37', style: 'dealer' },
  'Tio Juros': { skin: '#d9a77c', hair: '#1a1a1a', suit: '#33261b', accent: '#d4af37', style: 'lender' },
  'Madame Ônix': { skin: '#e6c3a8', hair: '#0a0a0a', suit: '#0d0d12', accent: '#d4af37', style: 'madame' },
  Motorista: { skin: '#c99a76', hair: '#333', suit: '#2a5d8a', accent: '#ddd', style: 'driver' },
  'Vício': { skin: '#7b3fe4', hair: '#7b3fe4', suit: '#2b1a52', accent: '#ff2e63', style: 'vicio' },
  Narrador: { skin: '#ccc', hair: '#999', suit: '#222', accent: '#d4af37', style: 'narrator' },
  Convidada: { skin: '#f0d4bc', hair: '#c9a24a', suit: '#7a1f4a', accent: '#d4af37', style: 'dame' },
  Convidado: { skin: '#d6a982', hair: '#888', suit: '#222', accent: '#d4af37', style: 'guest' },
};

export function speakerColor(who: string): string {
  const s = SPEAKERS[who];
  if (!s) return '#d4af37';
  if (who === 'Vício') return '#b28dff';
  if (who === 'Narrador') return '#9aa0aa';
  if (who === 'Capri') return '#8ad7ff';
  return s.accent;
}

/** Retrato em pixel art (DiceBear Pixel Art, CC0), ampliado sem suavização. */
export function Portrait({ spec, size = 110, label }: { spec: PortraitSpec; size?: number; label?: string }) {
  const svg = PORTRAIT_SVG[spec.style];
  if (!svg) return <span className="portrait px-img" style={{ width: size, height: size, display: 'inline-block' }} />;
  return (
    <img
      src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
      width={size}
      height={size}
      alt={label ?? ''}
      className="portrait px-img"
      draggable={false}
    />
  );
}

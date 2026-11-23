import { PORTRAIT_SVG } from './portraitArt';
import { PortraitSpec } from '../game/opponents';

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

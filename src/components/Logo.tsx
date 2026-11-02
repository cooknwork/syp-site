import { LOGO_PATH, LOGO_VIEWBOX } from './logo';

/** The SYP logo; takes the colour of its parent (currentColor), so every theme recolours it. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox={LOGO_VIEWBOX} className={className} aria-hidden="true">
      <path fill="currentColor" d={LOGO_PATH} />
    </svg>
  );
}

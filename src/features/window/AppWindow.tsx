'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from '@/components/Icon';

interface Props {
  title: string;
  closing: boolean;
  origin: { x: string; y: string } | null;
  onClose: () => void;
  children: ReactNode;
}

/** The one window every app opens in: fixed inside the screen, scrolls only its own content. */
export function AppWindow({ title, closing, origin, onClose, children }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeRef.current?.focus({ preventScroll: true }); }, []);
  const style = origin ? ({ '--ox': origin.x, '--oy': origin.y } as React.CSSProperties) : undefined;
  return (
    <section className={`win${closing ? ' closing' : ''}`} role="dialog" aria-label={title} style={style}>
      <header className="win-head">
        <h2>{title}</h2>
        <button ref={closeRef} className="icon-btn" aria-label="Закрыть" onClick={onClose}><Icon name="x" /></button>
      </header>
      <div className="win-body">{children}</div>
    </section>
  );
}

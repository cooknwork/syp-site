'use client';
import { useEffect, useRef } from 'react';
import { CityEngine, type BillboardEvent } from './cityEngine';

interface Props {
  tokens: string[];
  event: BillboardEvent | null;
  paused: boolean;
  onBrand: () => void;
  onEvent: (slug: string) => void;
}

export function CityBackground({ tokens, event, paused, onBrand, onEvent }: Props) {
  const cityRef = useRef<HTMLCanvasElement>(null);
  const lifeRef = useRef<HTMLCanvasElement>(null);
  const engine = useRef<CityEngine | null>(null);
  const cbs = useRef({ onBrand, onEvent });
  cbs.current = { onBrand, onEvent };
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const e = new CityEngine(cityRef.current!, lifeRef.current!, {
      onBrand: () => cbs.current.onBrand(),
      onEvent: (slug) => cbs.current.onEvent(slug),
    });
    engine.current = e;
    let t: ReturnType<typeof setTimeout>;
    const onResize = () => { clearTimeout(t); t = setTimeout(() => e.layout(), 150); };
    const onVis = () => (document.hidden ? e.stop() : !pausedRef.current && e.start());
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVis);
    // the billboard poster uses Inter: redraw once the font is ready
    document.fonts?.ready.then(() => e.layout()).catch(() => {});
    return () => { window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVis); e.destroy(); };
  }, []);

  useEffect(() => { engine.current?.setTheme(tokens); }, [tokens]);
  useEffect(() => { const e = engine.current; if (!e) return; e.setEvent(event); }, [event]);
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    if (paused) e.stop(); else e.start();
  }, [paused]);

  return (
    <>
      <canvas id="city" ref={cityRef} aria-hidden="true" />
      <canvas id="life" ref={lifeRef} aria-hidden="true" />
    </>
  );
}

'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { GameEngine, type GameState } from './gameEngine';

interface Props {
  active: boolean;
  tokens: string[];
  title: string;
  description: string;
  onExit: () => void;
}

const pad = (n: number) => String(n).padStart(5, '0');

export function GameLayer({ active, tokens, title, description, onExit }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<GameEngine | null>(null);
  const primary = useRef<HTMLButtonElement>(null);
  const [state, setState] = useState<GameState>('menu');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [record, setRecord] = useState(false);

  useEffect(() => {
    const e = new GameEngine(canvas.current!, {
      onState: (s, info) => { setState(s); setRecord(info.isRecord); setScore(info.score); setBest(info.best); },
      onScore: (s, b) => { setScore(s); setBest(b); },
    });
    engine.current = e;
    return () => e.exit();
  }, []);

  useEffect(() => { engine.current?.setTheme(tokens); }, [tokens]);
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    if (active) e.enter(); else e.exit();
  }, [active]);
  useEffect(() => { if (active && state !== 'run') primary.current?.focus({ preventScroll: true }); }, [active, state]);

  const card =
    state === 'menu' ? { h: title, p: best ? `Ваш рекорд ${best}. ${description}` : description, btn: 'Играть', go: () => engine.current?.start() }
    : state === 'paused' ? { h: 'Пауза', p: `Счёт ${score}`, btn: 'Продолжить', go: () => engine.current?.resume() }
    : state === 'over' ? { h: record ? 'Новый рекорд!' : 'Игра окончена', p: record ? `Счёт ${score}` : `Счёт ${score} · рекорд ${best}`, btn: 'Ещё раз', go: () => engine.current?.start() }
    : null;

  return (
    <>
      <canvas id="play" ref={canvas} aria-label="Игра SYP Run" />
      <div className="playui" aria-hidden={!active}>
        <div className="play-hud">
          {best > 0 && <span className="hi">HI {pad(best)}</span>}
          <span>{pad(score)}</span>
        </div>
        <button className="play-exit" aria-label="Вернуться к телефону" onClick={onExit} tabIndex={active ? 0 : -1}>
          <Icon name="x" />
        </button>
        {card && (
          <div className="play-card">
            <h2>{card.h}</h2>
            <p className="muted">{card.p}</p>
            <p className="muted hint">
              <span className="kbd">Пробел</span> или <span className="kbd">↑</span> на клавиатуре, касание на телефоне. Удержание — прыжок выше.
            </p>
            <div className="btns">
              <button ref={primary} className="cta" onClick={(ev) => { ev.stopPropagation(); card.go(); }} tabIndex={active ? 0 : -1}>{card.btn}</button>
              <button className="ghost" onClick={onExit} tabIndex={active ? 0 : -1}>Вернуться к телефону</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

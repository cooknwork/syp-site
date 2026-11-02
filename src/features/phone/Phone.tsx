'use client';
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Icon, type IconName } from '@/components/Icon';
import { Logo } from '@/components/Logo';

export type AppKey = 'syp' | 'events' | 'gallery' | 'tickets' | 'settings' | 'messages';

const HOME_APPS: { key: AppKey; label: string; icon: IconName; tone: string }[] = [
  { key: 'syp', label: 'SYP', icon: 'syp', tone: 't2' },
  { key: 'events', label: 'Мероприятия', icon: 'calendar', tone: 't1' },
  { key: 'gallery', label: 'Галерея', icon: 'image', tone: 't3' },
  { key: 'tickets', label: 'Билеты', icon: 'ticket', tone: 't4' },
];
// Dock is fixed by the brief: Settings and Messages.
const DOCK: { key: AppKey; label: string; icon: IconName; tone: string }[] = [
  { key: 'settings', label: 'Настройки', icon: 'sliders', tone: 't5' },
  { key: 'messages', label: 'Сообщения', icon: 'message', tone: 't3' },
];

function useClock() {
  const [time, setTime] = useState('--:--');
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const d = new Date();
      setTime(d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));
      timer = setTimeout(tick, (60 - d.getSeconds()) * 1000 - d.getMilliseconds() + 20);
    };
    tick();
    return () => clearTimeout(timer);
  }, []);
  return time;
}

interface Props {
  /** visibility and order from the admin panel (home_screen.apps) */
  homeApps?: { key: string; visible: boolean }[];
  screenRef: RefObject<HTMLDivElement | null>;
  onOpen: (app: AppKey, from: HTMLElement) => void;
  onSecret: (from: HTMLElement) => void;
  children?: ReactNode; // the open app window
}

export function Phone({ homeApps, screenRef, onOpen, onSecret, children }: Props) {
  const apps = homeApps?.length
    ? homeApps.filter((a) => a.visible).map((a) => HOME_APPS.find((h) => h.key === a.key)).filter((a): a is (typeof HOME_APPS)[number] => !!a)
    : HOME_APPS;
  const time = useClock();
  const taps = useRef<number[]>([]);
  const [ping, setPing] = useState(0);

  const onLogo = (e: React.MouseEvent<HTMLButtonElement>) => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 2000), now];
    setPing((p) => p + 1);
    if (taps.current.length >= 5) { taps.current = []; onSecret(e.currentTarget); }
  };

  return (
    <div className="phone">
      <div className="screen" ref={screenRef}>
        <div className="wall" />
        <div className="island"><i /></div>
        <div className="home">
          <div className="status">
            <span>{time}</span>
            <span className="sys" aria-hidden="true">
              <span className="sig"><b style={{ height: '35%' }} /><b style={{ height: '55%' }} /><b style={{ height: '75%' }} /><b style={{ height: '100%' }} /></span>
              <span className="bat"><b /></span>
            </span>
          </div>
          <div className="logo-zone">
            <button key={ping} className={`logo${ping ? ' ping' : ''}`} aria-label="Логотип SYP" onClick={onLogo}>
              <Logo />
            </button>
          </div>
          <nav className="apps" aria-label="Приложения">
            {apps.map((a) => (
              <button key={a.key} className="app" onClick={(e) => onOpen(a.key, e.currentTarget)}>
                <span className={`tile ${a.tone}`}><Icon name={a.icon} /></span>
                <span>{a.label}</span>
              </button>
            ))}
          </nav>
          <nav className="dock" aria-label="Dock">
            {DOCK.map((a) => (
              <button key={a.key} aria-label={a.label} onClick={(e) => onOpen(a.key, e.currentTarget)}>
                <span className={`tile ${a.tone}`}><Icon name={a.icon} /></span>
              </button>
            ))}
          </nav>
        </div>
        {children}
      </div>
    </div>
  );
}

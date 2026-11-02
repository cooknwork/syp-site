'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SiteContent } from '@/data/types';
import { CityBackground } from '@/features/city/CityBackground';
import type { BillboardEvent } from '@/features/city/cityEngine';
import { GameLayer } from '@/features/game/GameLayer';
import { Phone, type AppKey } from '@/features/phone/Phone';
import { STORAGE_KEY, tokenList } from '@/features/theme/themes';
import { AppWindow } from '@/features/window/AppWindow';
import { EventsApp } from '@/features/apps/EventsApp';
import { GalleryApp } from '@/features/apps/GalleryApp';
import { LegalApp } from '@/features/apps/LegalApp';
import { MessagesApp } from '@/features/apps/MessagesApp';
import { SettingsApp } from '@/features/apps/SettingsApp';
import { SYPApp } from '@/features/apps/SYPApp';
import { TicketsApp } from '@/features/apps/TicketsApp';
import { billboardEvent, formatDate, STATUS_LABEL } from '@/features/apps/format';
import { Footer } from './Footer';

// The open app lives in the URL hash (#events, #privacy, #game), so Back closes it and links can be shared.
const APP_TITLES: Record<AppKey, string> = {
  syp: 'SYP', events: 'Мероприятия', gallery: 'Галерея', tickets: 'Билеты', settings: 'Настройки', messages: 'Сообщения',
};
const GAME_ROUTE = 'game';

export function SypWorld({ content }: { content: SiteContent }) {
  const { themes, events, legal } = content;
  const defaultTheme = themes.find((t) => t.isDefault) ?? themes[0];
  const legalTitles = useMemo(() => Object.fromEntries(legal.map((d) => [d.slug, d.title])), [legal]);
  const titleOf = useCallback((r: string) => (APP_TITLES as Record<string, string>)[r] ?? legalTitles[r], [legalTitles]);

  // ---- theme ----
  const [themeSlug, setThemeSlug] = useState(defaultTheme.slug);
  useEffect(() => {
    const saved = document.documentElement.dataset.theme;
    if (saved && themes.some((t) => t.slug === saved)) setThemeSlug(saved);
  }, [themes]);
  const theme = themes.find((t) => t.slug === themeSlug) ?? defaultTheme;
  const tokens = useMemo(() => tokenList(theme), [theme]);
  const pickTheme = (slug: string) => {
    document.documentElement.dataset.theme = slug;
    try { localStorage.setItem(STORAGE_KEY, slug); } catch { /* storage unavailable: theme still applies */ }
    setThemeSlug(slug);
  };

  // ---- route ----
  const [route, setRoute] = useState('');
  useEffect(() => {
    const read = () => setRoute(decodeURIComponent(location.hash.slice(1)));
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  const origin = useRef<HTMLElement | null>(null);
  const pendingEvent = useRef<string | null>(null);
  const go = useCallback((r: string, from?: HTMLElement | null) => {
    origin.current = from ?? null;
    if (r) location.hash = r;
    else { history.pushState('', document.title, location.pathname + location.search); setRoute(''); }
  }, []);
  const openEvent = useCallback((slug: string) => {
    if (location.hash.slice(1) === 'events') {
      // already in «Мероприятия»: just show the event
      setWin((w) => (w ? { ...w, key: w.key + 1, event: slug, origin: null } : w));
      return;
    }
    pendingEvent.current = slug;
    go('events');
  }, [go]);

  // ---- window with open/close animation ----
  const screenRef = useRef<HTMLDivElement>(null);
  const [win, setWin] = useState<{ app: string; origin: { x: string; y: string } | null; key: number; event: string | null } | null>(null);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (titleOf(route)) {
      let o: { x: string; y: string } | null = null;
      const from = origin.current, screen = screenRef.current;
      if (from && screen) {
        const a = from.getBoundingClientRect(), b = screen.getBoundingClientRect();
        o = { x: `${((a.left + a.width / 2 - b.left) / b.width) * 100}%`, y: `${((a.top + a.height / 2 - b.top) / b.height) * 100}%` };
      }
      const ev = route === 'events' ? pendingEvent.current : null;
      pendingEvent.current = null;
      origin.current = null;
      setClosing(false);
      setWin((w) => ({ app: route, origin: o, key: (w?.key ?? 0) + 1, event: ev }));
      return;
    }
    if (route === GAME_ROUTE) { setWin(null); return; }
    setClosing(true);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => { setWin(null); setClosing(false); }, reduce ? 0 : 180);
    return () => clearTimeout(t);
  }, [route, titleOf]);

  // ---- game in the city ----
  const playing = route === GAME_ROUTE && content.game.isVisible;
  useEffect(() => { document.body.classList.toggle('playing', playing); }, [playing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && location.hash) go(''); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  // ---- billboard ----
  const bbEvent = useMemo<BillboardEvent | null>(() => {
    const e = billboardEvent(events);
    return e ? { slug: e.slug, title: e.title, statusLabel: STATUS_LABEL[e.status], dateLabel: formatDate(e) ?? 'Дата уточняется', imageUrl: e.billboardImageUrl } : null;
  }, [events]);

  const footerDocs = legal.filter((d) => d.showInFooter);

  const renderApp = (app: string, ev: string | null) => {
    switch (app) {
      case 'syp': return <SYPApp brand={content.brand} />;
      case 'events': return <EventsApp events={events} initialSlug={ev} />;
      case 'tickets': return <TicketsApp events={events} onOpenEvent={openEvent} />;
      case 'gallery': return <GalleryApp />;
      case 'messages': return <MessagesApp contacts={content.contacts} />;
      case 'settings':
        return (
          <SettingsApp
            themes={themes} active={theme.slug} onPick={pickTheme}
            gameVisible={content.game.isVisible} onGame={() => go(GAME_ROUTE)}
            legal={legal} onLegal={(slug) => go(slug)}
          />
        );
      default: {
        const doc = legal.find((d) => d.slug === app);
        return doc ? <LegalApp doc={doc} /> : null;
      }
    }
  };

  return (
    <>
      <CityBackground tokens={tokens} event={bbEvent} paused={playing} onBrand={() => go('syp')} onEvent={openEvent} />
      <GameLayer active={playing} tokens={tokens} title={content.game.title} description={content.game.description} onExit={() => go('')} />
      {footerDocs.length > 0 && <Footer docs={footerDocs} onOpen={(slug) => go(slug)} />}
      <main className="stage">
        <Phone screenRef={screenRef} onOpen={(app, el) => go(app, el)} onSecret={(el) => content.game.isVisible && go(GAME_ROUTE, el)}>
          {win && (
            <AppWindow key={win.key} title={titleOf(win.app) ?? ''} closing={closing} origin={win.origin} onClose={() => go('')}>
              {renderApp(win.app, win.event)}
            </AppWindow>
          )}
        </Phone>
      </main>
    </>
  );
}

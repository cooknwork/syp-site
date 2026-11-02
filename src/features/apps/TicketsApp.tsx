'use client';
import { useState } from 'react';
import { Icon } from '@/components/Icon';
import type { SypEvent } from '@/data/types';
import { formatDate, isTicketable, sortEvents } from './format';
import { BackButton, BuyButton, Chevron, EmptyState, Poster } from './ui';

// Same events as «Мероприятия», shorter path: catalogue → poster → buy.
export function TicketsApp({ events, onOpenEvent }: { events: SypEvent[]; onOpenEvent: (slug: string) => void }) {
  const [slug, setSlug] = useState<string | null>(null);
  const list = sortEvents(events).filter(isTicketable);
  const ev = slug ? list.find((e) => e.slug === slug) : null;

  if (ev) {
    return (
      <>
        <BackButton onClick={() => setSlug(null)}>Билеты</BackButton>
        <Poster event={ev} />
        <h3 className="title">{ev.title}</h3>
        <BuyButton event={ev} />
        <button className="back center-self" onClick={() => onOpenEvent(ev.slug)}>
          Подробнее о мероприятии <Icon name="right" />
        </button>
      </>
    );
  }
  if (!list.length) return <EmptyState icon="ticket" tone="t4" title="Билетов пока нет" text="Когда откроется продажа, мероприятие появится здесь." />;
  return (
    <>
      <span className="eyebrow">Выберите мероприятие</span>
      <div className="list">
        {list.map((e) => (
          <button key={e.slug} className="row" onClick={() => setSlug(e.slug)}>
            <span className="tile t4"><Icon name="ticket" /></span>
            <span className="meta">
              <b>{e.title}</b>
              <span className="muted">{e.ticketUrl ? 'Билеты в продаже' : 'Продажа скоро'}{formatDate(e) ? ` · ${formatDate(e)}` : ''}</span>
            </span>
            <Chevron />
          </button>
        ))}
      </div>
    </>
  );
}

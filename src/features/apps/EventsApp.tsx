'use client';
import { useState } from 'react';
import type { SypEvent } from '@/data/types';
import { formatDate, formatTime, sortEvents, STATUS_LABEL } from './format';
import { BackButton, BuyButton, Chevron, Chip, EmptyState, Poster } from './ui';

export function EventsApp({ events, initialSlug }: { events: SypEvent[]; initialSlug?: string | null }) {
  const [slug, setSlug] = useState<string | null>(initialSlug ?? null);
  const list = sortEvents(events);
  const ev = slug ? list.find((e) => e.slug === slug) : null;

  if (ev) return <EventDetails event={ev} onBack={() => setSlug(null)} />;
  if (!list.length) return <EmptyState icon="calendar" tone="t1" title="Скоро анонс" text="Новые мероприятия SYP появятся здесь." />;
  return (
    <>
      <span className="eyebrow">Афиша</span>
      {list.map((e) => (
        <button key={e.slug} className="card" onClick={() => setSlug(e.slug)}>
          <Poster event={e} small />
          <span className="meta">
            <Chip>{STATUS_LABEL[e.status]}</Chip>
            <h3>{e.title}</h3>
            <span className="muted">{formatDate(e) ?? 'Дата уточняется'}</span>
          </span>
          <Chevron />
        </button>
      ))}
    </>
  );
}

function EventDetails({ event: e, onBack }: { event: SypEvent; onBack: () => void }) {
  // Only filled fields are shown — nothing empty, nothing invented.
  const rows: [string, string | null][] = [
    ['Дата', formatDate(e)],
    ['Время', formatTime(e)],
    ['Площадка', e.venue],
    ['Адрес', e.address],
    ['Артисты', e.artists.map((a) => a.name).join(', ') || null],
  ];
  const filled = rows.filter((r): r is [string, string] => Boolean(r[1]));
  return (
    <>
      <BackButton onClick={onBack}>Все мероприятия</BackButton>
      <Poster event={e} />
      <div className="stack-sm">
        <Chip>{STATUS_LABEL[e.status]}</Chip>
        <h3 className="title">{e.title}</h3>
        {e.shortDescription && <p className="lead">{e.shortDescription}</p>}
      </div>
      {filled.length ? (
        <div className="list">
          {filled.map(([k, v]) => (
            <div className="row" key={k}><div className="meta"><span className="muted">{k}</span><b>{v}</b></div></div>
          ))}
        </div>
      ) : (
        <p className="note muted">Дата, время, площадка и артисты появятся, когда их заполнят в админке. Пустые поля на сайте не показываются.</p>
      )}
      {e.description && <div className="doc">{e.description.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</div>}
      {e.infoBlocks.map((b, i) => (
        <div className="doc" key={i}><p><b>{b.title}</b></p><p>{b.text}</p></div>
      ))}
      <BuyButton event={e} />
    </>
  );
}

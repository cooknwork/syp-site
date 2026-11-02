import type { EventStatus, SypEvent } from '@/data/types';

export const STATUS_LABEL: Record<EventStatus, string> = {
  announce: 'Анонс',
  on_sale: 'В продаже',
  sold_out: 'Sold out',
  cancelled: 'Отменено',
  past: 'Прошло',
};

/** «14 декабря» / «14 декабря, 23:00», in the event's own time zone. */
export function formatDate(ev: SypEvent, withTime = false): string | null {
  if (!ev.startsAt) return null;
  const d = new Date(ev.startsAt);
  const date = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', timeZone: ev.timezone }).format(d);
  if (!withTime) return date;
  const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: ev.timezone }).format(d);
  return `${date}, ${time}`;
}

export function formatTime(ev: SypEvent): string | null {
  if (!ev.startsAt) return null;
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: ev.timezone }).format(new Date(ev.startsAt));
}

/** Published events in display order: priority first, then manual order, then date. */
export function sortEvents(events: SypEvent[]): SypEvent[] {
  return [...events].sort((a, b) =>
    b.priority - a.priority || a.sortOrder - b.sortOrder || (a.startsAt ?? '9').localeCompare(b.startsAt ?? '9'));
}

/** «Билеты» shows events that are announced or on sale. */
export const isTicketable = (ev: SypEvent) => ev.status === 'announce' || ev.status === 'on_sale';

/** The event on the city billboard: the one flagged, otherwise the nearest published one. */
export function billboardEvent(events: SypEvent[]): SypEvent | null {
  return events.find((e) => e.showOnBillboard) ?? sortEvents(events).find(isTicketable) ?? null;
}

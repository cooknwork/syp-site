import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/Icon';
import type { SypEvent } from '@/data/types';
import { formatDate } from './format';

export function EmptyState({ icon, tone, title, text }: { icon: IconName; tone: string; title: string; text: string }) {
  return (
    <div className="empty">
      <span className={`tile ${tone}`}><Icon name={icon} /></span>
      <h3>{title}</h3>
      <p className="muted">{text}</p>
    </div>
  );
}

export function Poster({ event, small }: { event: SypEvent; small?: boolean }) {
  if (event.posterUrl) {
    return (
      <div className={`poster has-image ${small ? 'small' : ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={event.posterUrl} alt={`Афиша ${event.title}`} loading="lazy" decoding="async" />
      </div>
    );
  }
  return (
    <div className={`poster ${small ? 'small' : ''}`} role="img" aria-label={`Афиша ${event.title}`}>
      {!small && (
        <>
          <b>{event.title}</b>
          <small>{formatDate(event) ?? 'Афиша появится позже'}</small>
        </>
      )}
    </div>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return <span className="chip"><i />{children}</span>;
}

export function Chevron() {
  return <span className="chev"><Icon name="right" /></span>;
}

export function BuyButton({ event }: { event: SypEvent }) {
  if (!event.ticketUrl) return <div className="cta off">Продажа билетов скоро откроется</div>;
  return (
    <a className="cta" href={event.ticketUrl} target="_blank" rel="noopener noreferrer">
      Купить билет <Icon name="right" size={18} />
    </a>
  );
}

export function BackButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button className="back" onClick={onClick}>
      <Icon name="left" />
      {children}
    </button>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import type { GalleryAlbum, GalleryItem } from '@/data/types';
import { BackButton, EmptyState } from './ui';

export function GalleryApp({ albums, items }: { albums: GalleryAlbum[]; items: GalleryItem[] }) {
  const [album, setAlbum] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const shown = album ? items.filter((i) => i.albumId === album) : items;

  if (!items.length) return <EmptyState icon="image" tone="t3" title="Здесь будут фото и видео" text="Материалы с мероприятий SYP появятся здесь." />;

  const current = open !== null ? shown[open] : null;
  return (
    <>
      {albums.length > 0 && (
        <div className="chips" role="tablist" aria-label="Альбомы">
          <button role="tab" aria-selected={album === null} className="pill" onClick={() => setAlbum(null)}>Все</button>
          {albums.map((a) => (
            <button key={a.id} role="tab" aria-selected={album === a.id} className="pill" onClick={() => setAlbum(a.id)}>{a.title}</button>
          ))}
        </div>
      )}
      {shown.length ? (
        <div className="grid">
          {shown.map((it, i) => (
            <button key={it.id} className="thumb" onClick={() => setOpen(i)} aria-label={it.caption ?? (it.media.kind === 'video' ? 'Видео' : 'Фото')}>
              {it.media.kind === 'video' ? (
                <>
                  <video src={it.media.url} preload="metadata" muted playsInline />
                  <span className="play-badge"><Icon name="right" /></span>
                </>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.media.thumbUrl ?? it.media.url} alt={it.caption ?? ''} loading="lazy" decoding="async" />
              )}
            </button>
          ))}
        </div>
      ) : (
        <p className="note muted">В этом альбоме пока нет материалов.</p>
      )}
      {current && <Viewer item={current} onClose={() => setOpen(null)} onPrev={open! > 0 ? () => setOpen(open! - 1) : undefined} onNext={open! < shown.length - 1 ? () => setOpen(open! + 1) : undefined} />}
    </>
  );
}

function Viewer({ item, onClose, onPrev, onNext }: { item: GalleryItem; onClose: () => void; onPrev?: () => void; onNext?: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key === 'ArrowLeft') onPrev?.();
      if (e.key === 'ArrowRight') onNext?.();
    };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [onClose, onPrev, onNext]);
  return (
    <div className="viewer" role="dialog" aria-label="Просмотр">
      <div className="viewer-top">
        <BackButton onClick={onClose}>Галерея</BackButton>
      </div>
      <div className="viewer-media">
        {item.media.kind === 'video' ? (
          <video src={item.media.url} controls playsInline autoPlay />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.media.url} alt={item.caption ?? ''} />
        )}
      </div>
      {item.caption && <p className="viewer-caption">{item.caption}</p>}
      <div className="viewer-nav">
        <button className="icon-btn" onClick={onPrev} disabled={!onPrev} aria-label="Предыдущее"><Icon name="left" /></button>
        <button className="icon-btn" onClick={onNext} disabled={!onNext} aria-label="Следующее"><Icon name="right" /></button>
      </div>
    </div>
  );
}

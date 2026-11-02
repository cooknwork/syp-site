'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';
import { ROLES } from '@/data/types';
import { supabase } from '@/lib/supabase';
import { getMedia, upload, type MediaInfo } from './data';
import { HOME_APP_LABELS, type Field } from './schema';

const ROLE_LABELS: Record<string, string> = {
  background: 'Фон', 'background-secondary': 'Фон, второй', surface: 'Поверхность (окна)', 'surface-secondary': 'Поверхность, акцент',
  'text-primary': 'Текст', 'text-secondary': 'Текст второстепенный', 'accent-primary': 'Акцент 1', 'accent-secondary': 'Акцент 2', 'accent-tertiary': 'Акцент 3',
};

/** Moscow has no daylight saving: UTC+3 all year. */
const toLocal = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(new Date(iso).getTime() + 3 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
};
const fromLocal = (v: string) => (v ? `${v}:00+03:00` : null);

export function FieldInput({ field, value, onChange }: { field: Field; value: any; onChange: (v: any) => void }) {
  const id = `f-${field.key}`;
  const label = (
    <label htmlFor={id} className="a-label">
      {field.label}{field.required && <span className="a-req"> *</span>}
    </label>
  );
  const hint = field.hint && <p className="a-hint">{field.hint}</p>;

  switch (field.type) {
    case 'bool':
      return (
        <div className="a-field a-check">
          <input id={id} type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          <div>{label}{hint}</div>
        </div>
      );
    case 'textarea':
      return <div className="a-field">{label}<textarea id={id} rows={field.key === 'body' ? 14 : 5} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />{hint}</div>;
    case 'number':
      return <div className="a-field a-narrow">{label}<input id={id} type="number" value={value ?? 0} onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))} />{hint}</div>;
    case 'range':
      return (
        <div className="a-field">
          {label}
          <div className="a-range">
            <input id={id} type="range" min={field.min} max={field.max} step={field.step} value={value ?? 1} onChange={(e) => onChange(Number(e.target.value))} />
            <output htmlFor={id}>{Number(value ?? 1).toFixed(2)}</output>
          </div>
          {hint}
        </div>
      );
    case 'datetime':
      return <div className="a-field a-narrow">{label}<input id={id} type="datetime-local" value={toLocal(value)} onChange={(e) => onChange(fromLocal(e.target.value))} />{hint}</div>;
    case 'date':
      return <div className="a-field a-narrow">{label}<input id={id} type="date" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} />{hint}</div>;
    case 'select':
      return (
        <div className="a-field a-narrow">
          {label}
          <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
            {field.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {hint}
        </div>
      );
    case 'url':
      return <div className="a-field">{label}<input id={id} type="url" inputMode="url" placeholder="https://" value={value ?? ''} onChange={(e) => onChange(e.target.value.trim())} />{hint}</div>;
    case 'names':
      return (
        <div className="a-field">
          {label}
          <textarea id={id} rows={4} value={(Array.isArray(value) ? value : []).map((a: any) => a.name).join('\n')}
            onChange={(e) => onChange(e.target.value.split('\n').map((name) => ({ name: name.trim() })).filter((a, i, all) => a.name || i === all.length - 1))} />
          {hint}
        </div>
      );
    case 'blocks':
      return <BlocksField id={id} label={label} hint={hint} value={Array.isArray(value) ? value : []} onChange={onChange} />;
    case 'tokens':
      return (
        <div className="a-field">
          <span className="a-label">{field.label}</span>
          <div className="a-colors">
            {ROLES.map((r) => (
              <label key={r} className="a-color">
                <input type="color" value={value?.[r] ?? '#000000'} onChange={(e) => onChange({ ...(value ?? {}), [r]: e.target.value.toUpperCase() })} />
                <span><b>{ROLE_LABELS[r]}</b><code>{value?.[r] ?? '—'}</code></span>
              </label>
            ))}
          </div>
        </div>
      );
    case 'apps': {
      const apps: { key: string; visible: boolean }[] = Array.isArray(value) && value.length ? value : Object.keys(HOME_APP_LABELS).map((key) => ({ key, visible: true }));
      const move = (i: number, d: number) => { const a = [...apps]; const [x] = a.splice(i, 1); a.splice(i + d, 0, x); onChange(a); };
      return (
        <div className="a-field">
          <span className="a-label">{field.label}</span>
          <ul className="a-order">
            {apps.map((a, i) => (
              <li key={a.key}>
                <label className="a-check"><input type="checkbox" checked={a.visible} onChange={(e) => onChange(apps.map((x) => (x.key === a.key ? { ...x, visible: e.target.checked } : x)))} /> {HOME_APP_LABELS[a.key] ?? a.key}</label>
                <span>
                  <button type="button" className="a-btn ghost sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Выше">↑</button>
                  <button type="button" className="a-btn ghost sm" disabled={i === apps.length - 1} onClick={() => move(i, 1)} aria-label="Ниже">↓</button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    case 'album':
      return <AlbumField id={id} label={label} value={value} onChange={onChange} />;
    case 'image':
    case 'media':
      return <MediaField id={id} label={label} hint={hint} value={value} accept={field.type === 'media' ? 'media' : 'image'} onChange={onChange} />;
    default:
      return <div className="a-field">{label}<input id={id} type="text" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />{hint}</div>;
  }
}

function BlocksField({ id, label, hint, value, onChange }: { id: string; label: React.ReactNode; hint: React.ReactNode; value: any[]; onChange: (v: any) => void }) {
  const set = (i: number, k: string, v: string) => onChange(value.map((b, j) => (j === i ? { ...b, [k]: v } : b)));
  return (
    <div className="a-field" id={id}>
      {label}
      {value.map((b, i) => (
        <div className="a-block" key={i}>
          <input placeholder="Заголовок" value={b.title ?? ''} onChange={(e) => set(i, 'title', e.target.value)} />
          <textarea placeholder="Текст" rows={2} value={b.text ?? ''} onChange={(e) => set(i, 'text', e.target.value)} />
          <button type="button" className="a-btn ghost sm" onClick={() => onChange(value.filter((_, j) => j !== i))}>Убрать</button>
        </div>
      ))}
      <button type="button" className="a-btn ghost" onClick={() => onChange([...value, { title: '', text: '' }])}>+ Добавить блок</button>
      {hint}
    </div>
  );
}

function AlbumField({ id, label, value, onChange }: { id: string; label: React.ReactNode; value: any; onChange: (v: any) => void }) {
  const [albums, setAlbums] = useState<{ id: string; title: string }[]>([]);
  useEffect(() => {
    supabase().from('gallery_albums').select('id,title').is('deleted_at', null).order('sort_order').then(({ data }) => setAlbums(data ?? []));
  }, []);
  return (
    <div className="a-field a-narrow">
      {label}
      <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">Без альбома</option>
        {albums.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
      </select>
      <p className="a-hint">Альбомы создаются в разделе «Альбомы».</p>
    </div>
  );
}

function MediaField({ id, label, hint, value, accept, onChange }: { id: string; label: React.ReactNode; hint: React.ReactNode; value: string | null; accept: 'image' | 'media'; onChange: (v: any) => void }) {
  const [info, setInfo] = useState<MediaInfo | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!value) { setInfo(null); return; }
    if (info?.id === value) return;
    getMedia(value).then(setInfo);
  }, [value, info?.id]);

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setErr(null);
    try {
      const m = await upload(f, accept, setBusy);
      setInfo(m);
      onChange(m.id);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="a-field">
      {label}
      <div className="a-media">
        <div className="a-media-box">
          {info ? (
            info.kind === 'video'
              ? <video src={info.url} controls preload="metadata" />
              // eslint-disable-next-line @next/next/no-img-element
              : <img src={info.thumb ?? info.url} alt="" />
          ) : <span className="a-hint">Файл не выбран</span>}
        </div>
        <div className="a-media-actions">
          <input ref={input} id={id} type="file" hidden accept={accept === 'image' ? 'image/jpeg,image/png,image/webp' : 'image/jpeg,image/png,image/webp,video/mp4'} onChange={(e) => pick(e.target.files?.[0])} />
          <button type="button" className="a-btn" disabled={!!busy} onClick={() => input.current?.click()}>{busy ?? (info ? 'Заменить файл' : 'Загрузить файл')}</button>
          {info && !busy && <button type="button" className="a-btn ghost" onClick={() => { onChange(null); setInfo(null); }}>Убрать</button>}
        </div>
      </div>
      {err && <p className="a-error">{err}</p>}
      {hint}
    </div>
  );
}

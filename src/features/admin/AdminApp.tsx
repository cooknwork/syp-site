'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Logo } from '@/components/Logo';
import { supabase } from '@/lib/supabase';
import { draftIds, getSingle, listRows, save, upload, type Row } from './data';
import { Editor, previewUrl, statusLabel } from './Editor';
import { SECTIONS, type Section } from './schema';

type Auth = { state: 'loading' } | { state: 'out' } | { state: 'denied'; email: string } | { state: 'in'; session: Session };

export function AdminApp() {
  const [auth, setAuth] = useState<Auth>({ state: 'loading' });

  useEffect(() => {
    const db = supabase();
    const check = async (session: Session | null) => {
      if (!session) { setAuth({ state: 'out' }); return; }
      const { data } = await db.from('admin_users').select('user_id').eq('user_id', session.user.id).maybeSingle();
      setAuth(data ? { state: 'in', session } : { state: 'denied', email: session.user.email ?? '' });
    };
    db.auth.getSession().then(({ data }) => check(data.session));
    const { data: sub } = db.auth.onAuthStateChange((_e, session) => { check(session); });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (auth.state === 'loading') return <div className="a-root a-center"><p className="a-hint">Загрузка…</p></div>;
  if (auth.state === 'out') return <Login />;
  if (auth.state === 'denied') {
    return (
      <div className="a-root a-center">
        <div className="a-card">
          <h1>Нет доступа</h1>
          <p>Аккаунт {auth.email} не добавлен в администраторы.</p>
          <button className="a-btn" onClick={() => supabase().auth.signOut()}>Выйти</button>
        </div>
      </div>
    );
  }
  return <Panel email={auth.session.user.email ?? ''} />;
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setErr(error.message === 'Invalid login credentials' ? 'Неверный email или пароль' : error.message);
  };
  return (
    <div className="a-root a-center">
      <form className="a-card a-login" onSubmit={submit}>
        <div className="a-logo"><Logo /></div>
        <h1>Админка SYP</h1>
        <label className="a-label" htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label className="a-label" htmlFor="password">Пароль</label>
        <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {err && <p className="a-error">{err}</p>}
        <button className="a-btn primary" disabled={busy}>{busy ? 'Вхожу…' : 'Войти'}</button>
      </form>
    </div>
  );
}

function Panel({ email }: { email: string }) {
  const [sectionId, setSectionId] = useState(SECTIONS[0].id);
  useEffect(() => {
    const read = () => { const h = location.hash.slice(1); if (SECTIONS.some((s) => s.id === h)) setSectionId(h); };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  const section = SECTIONS.find((s) => s.id === sectionId)!;
  return (
    <div className="a-root">
      <header className="a-top">
        <a className="a-brand" href={new URL('../', typeof window === 'undefined' ? 'http://x/' : window.location.href).toString()} target="_blank" rel="noopener noreferrer">
          <span className="a-logo sm"><Logo /></span> Админка
        </a>
        <span className="a-who">{email}</span>
        <button className="a-btn ghost sm" onClick={() => window.open(previewUrl(), '_blank', 'noopener')}>Предпросмотр сайта</button>
        <button className="a-btn ghost sm" onClick={() => supabase().auth.signOut()}>Выйти</button>
      </header>
      <div className="a-layout">
        <nav className="a-nav" aria-label="Разделы">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} aria-current={s.id === sectionId ? 'page' : undefined}>{s.title}</a>
          ))}
        </nav>
        <main className="a-main">
          {section.kind === 'single' ? <Single key={section.id} section={section} /> : <Collection key={section.id} section={section} />}
        </main>
      </div>
    </div>
  );
}

function Single({ section }: { section: Section }) {
  const [row, setRow] = useState<Row | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { getSingle(section).then(setRow).catch((e) => setErr(e.message)); }, [section]);
  if (err) return <p className="a-error">{err}</p>;
  if (!row) return <p className="a-hint">Загрузка…</p>;
  return <Editor section={section} row={row} onDone={(r) => r && setRow(r)} />;
}

function Collection({ section }: { section: Section }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [drafts, setDrafts] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Row | 'new' | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [bulk, setBulk] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [r, d] = await Promise.all([listRows(section), section.publication ? draftIds(section.table) : Promise.resolve(new Set<string>())]);
      setRows(r); setDrafts(d); setErr(null);
    } catch (e) { setErr((e as Error).message); }
  }, [section]);
  useEffect(() => { reload(); }, [reload]);

  // Gallery: several photos or videos at once, each becomes a draft item.
  const uploadMany = async (files: FileList | null) => {
    if (!files?.length) return;
    let n = 0;
    try {
      for (const f of Array.from(files)) {
        n++;
        setBulk(`Загружаю ${n} из ${files.length}…`);
        const m = await upload(f, 'media');
        await save(section, null, { media_id: m.id, caption: null, album_id: null, taken_at: null, sort_order: 0 }, 'draft');
      }
      setBulk(null);
    } catch (e) {
      setBulk(null);
      setErr(`Файл ${n}: ${(e as Error).message}`);
    }
    reload();
  };
  const publishDrafts = async () => {
    setBulk('Публикую…');
    const { error } = await supabase().from(section.table).update({ publication: 'published' }).eq('publication', 'draft').is('deleted_at', null);
    setBulk(null);
    if (error) setErr(error.message);
    reload();
  };

  if (open) {
    return (
      <Editor
        key="editor"
        section={section}
        row={open === 'new' ? null : open}
        onBack={() => { setOpen(null); reload(); }}
        onDone={(saved) => { if (saved) setOpen(saved); }}
      />
    );
  }

  const titleOf = (r: Row) => String(r[section.titleKey ?? 'title'] ?? '').trim() || (section.table === 'gallery_items' ? 'Без подписи' : 'Без названия');
  return (
    <div>
      <div className="a-list-head">
        <h2>{section.title}</h2>
        <button className="a-btn primary" onClick={() => setOpen('new')}>+ {section.newLabel ?? 'Добавить'}</button>
        {section.table === 'gallery_items' && (
          <>
            <label className="a-btn">
              {bulk ?? 'Загрузить несколько файлов'}
              <input type="file" hidden multiple accept="image/jpeg,image/png,image/webp,video/mp4" disabled={!!bulk} onChange={(e) => uploadMany(e.target.files)} />
            </label>
            {rows?.some((r) => r.publication === 'draft') && <button className="a-btn" disabled={!!bulk} onClick={publishDrafts}>Опубликовать все черновики</button>}
          </>
        )}
      </div>
      {section.note && <p className="a-note">{section.note}</p>}
      {err && <p className="a-error">{err}</p>}
      {!rows ? <p className="a-hint">Загрузка…</p> : rows.length === 0 ? (
        <p className="a-empty">Пока пусто. Нажмите «{section.newLabel ?? 'Добавить'}».</p>
      ) : (
        <ul className="a-list">
          {rows.map((r) => (
            <li key={r.id}>
              <button onClick={() => setOpen(r)}>
                <span className="a-list-main">
                  <b>{titleOf(r)}</b>
                  {section.subtitle && <span className="a-hint">{section.subtitle(r)}</span>}
                </span>
                {section.publication && <span className={`a-badge ${r.publication}`}>{statusLabel(r, drafts.has(String(r.id)))}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

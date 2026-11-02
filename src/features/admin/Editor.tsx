'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import { content as seed } from '@/data/seed';
import { discardDraft, getDraft, remove, save, validate, type Action, type Row } from './data';
import { FieldInput } from './fields';
import type { Section } from './schema';

const STATUS: Record<string, string> = { published: 'Опубликовано', draft: 'Черновик', hidden: 'Скрыто' };

export function statusLabel(row: Row, hasDraft: boolean) {
  const base = STATUS[row.publication as string] ?? '';
  return hasDraft && row.publication === 'published' ? `${base} · есть черновик` : base;
}

export function previewUrl(hash?: string) {
  return new URL(`../?preview${hash ? `#${hash}` : ''}`, window.location.href).toString();
}

interface Props {
  section: Section;
  row: Row | null; // null — new record
  onDone: (saved: Row | null) => void;
  onBack?: () => void;
}

export function Editor({ section: s, row, onDone, onBack }: Props) {
  const defaults = useMemo(() => Object.fromEntries(s.fields.map((f) => [f.key, f.initial ?? null])), [s]);
  const [form, setForm] = useState<Row>(row ? { ...row } : defaults);
  const [hasDraft, setHasDraft] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const live = row?.publication === 'published';

  // A published record may have unpublished edits waiting in content_drafts: show them in the form.
  useEffect(() => {
    if (!row?.id || !s.publication || !live) return;
    getDraft(s.table, row.id).then((d) => { if (d) { setForm({ ...row, ...d }); setHasDraft(true); } }).catch(() => {});
  }, [row, s, live]);

  const set = (k: string, v: unknown) => { setForm((f) => ({ ...f, [k]: v })); setDirty(true); };

  const run = async (action: Action, label: string) => {
    const problem = validate(s, form);
    if (problem && action !== 'hide') { setMsg({ kind: 'error', text: problem }); return; }
    setBusy(label); setMsg(null);
    try {
      const saved = await save(s, row, form, action);
      setDirty(false);
      if (action === 'draft' && live) { setHasDraft(true); setMsg({ kind: 'ok', text: 'Черновик сохранён. На сайте пока прежняя версия — проверьте её в предпросмотре.' }); return saved; }
      setHasDraft(false);
      setMsg({ kind: 'ok', text: action === 'publish' ? 'Опубликовано. Обновите страницу сайта, чтобы увидеть изменения.' : action === 'hide' ? 'Скрыто с сайта.' : 'Сохранено.' });
      onDone(saved);
      return saved;
    } catch (e) {
      setMsg({ kind: 'error', text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const preview = async () => {
    if (dirty || !row) { const ok = await run('draft', 'Сохраняю…'); if (!ok) return; }
    window.open(previewUrl(s.previewHash), '_blank', 'noopener');
  };

  const drop = async () => {
    if (!row?.id) return;
    setBusy('Удаляю черновик…');
    try { await discardDraft(s.table, row.id); setForm({ ...row }); setHasDraft(false); setDirty(false); setMsg({ kind: 'ok', text: 'Черновик удалён, в форме снова опубликованная версия.' }); }
    catch (e) { setMsg({ kind: 'error', text: (e as Error).message }); }
    finally { setBusy(null); }
  };

  const del = async () => {
    if (!row) return;
    setBusy('Удаляю…');
    try { await remove(s, row); onDone(null); onBack?.(); }
    catch (e) { setMsg({ kind: 'error', text: (e as Error).message }); setBusy(null); }
  };

  const legalTemplate = s.table === 'legal_documents' && !String(form.body ?? '').trim()
    ? seed.legal.find((d) => d.slug === form.slug || d.title === form.title)
    : null;

  return (
    <div className="a-editor">
      <div className="a-editor-head">
        {onBack && <button className="a-btn ghost" onClick={onBack}>← К списку</button>}
        <h2>{row ? String(form[s.titleKey ?? 'title'] || form.label || form.name || s.title) : s.newLabel ?? s.title}</h2>
        {row && s.publication && <span className={`a-badge ${row.publication}`}>{statusLabel(row, hasDraft)}</span>}
      </div>
      {s.note && <p className="a-note">{s.note}</p>}
      {hasDraft && (
        <div className="a-banner">
          В форме — неопубликованный черновик. На сайте пока прежняя версия.
          <button className="a-btn ghost sm" disabled={!!busy} onClick={drop}>Отменить черновик</button>
        </div>
      )}
      {legalTemplate && (
        <div className="a-banner">
          Текст пустой. Можно начать с черновика, подготовленного для юриста.
          <button className="a-btn ghost sm" onClick={() => set('body', legalTemplate.body)}>Вставить шаблон</button>
        </div>
      )}

      <form className="a-form" onSubmit={(e) => e.preventDefault()}>
        {s.fields.map((f) => <FieldInput key={f.key} field={f} value={form[f.key]} onChange={(v) => set(f.key, v)} />)}
      </form>

      {msg && <p className={msg.kind === 'ok' ? 'a-ok' : 'a-error'} role="status">{msg.text}</p>}

      <div className="a-actions">
        {s.publication ? (
          <>
            <button className="a-btn primary" disabled={!!busy} onClick={() => run('publish', 'Публикую…')}>{busy === 'Публикую…' ? busy : 'Опубликовать'}</button>
            <button className="a-btn" disabled={!!busy} onClick={() => run('draft', 'Сохраняю…')}>{busy === 'Сохраняю…' ? busy : 'Сохранить черновик'}</button>
            {s.previewHash !== undefined && <button className="a-btn" disabled={!!busy} onClick={preview}>Предпросмотр</button>}
            {row && row.publication !== 'hidden' && s.kind === 'collection' && (
              <button className="a-btn ghost" disabled={!!busy} onClick={() => run('hide', 'Скрываю…')}>Скрыть с сайта</button>
            )}
          </>
        ) : (
          <button className="a-btn primary" disabled={!!busy} onClick={() => run('save', 'Сохраняю…')}>{busy ?? 'Сохранить'}</button>
        )}
        {row && s.kind === 'collection' && (
          confirmDelete ? (
            <span className="a-confirm">
              Удалить? Запись исчезнет с сайта и из списка.
              <button className="a-btn danger sm" disabled={!!busy} onClick={del}>Да, удалить</button>
              <button className="a-btn ghost sm" onClick={() => setConfirmDelete(false)}>Нет</button>
            </span>
          ) : (
            <button className="a-btn ghost danger-text" disabled={!!busy} onClick={() => setConfirmDelete(true)}>Удалить</button>
          )
        )}
      </div>
    </div>
  );
}

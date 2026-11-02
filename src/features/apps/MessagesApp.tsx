import { Icon } from '@/components/Icon';
import type { Contact } from '@/data/types';
import { Chevron, EmptyState } from './ui';

export function MessagesApp({ contacts }: { contacts: Contact[] }) {
  const visible = contacts.filter((c) => c.isVisible && c.url);
  if (!visible.length) {
    return <EmptyState icon="message" tone="t3" title="Контакты появятся позже" text="Здесь будут ссылки на Instagram и Telegram SYP." />;
  }
  return (
    <>
      <span className="eyebrow">Связаться с SYP</span>
      <div className="list">
        {visible.map((c) => (
          <a key={c.platform} className="row" href={c.url!} target="_blank" rel="noopener noreferrer">
            <span className={`tile ${c.platform === 'instagram' ? 't2' : 't3'}`}>
              <Icon name={c.platform === 'instagram' ? 'instagram' : c.platform === 'telegram' ? 'telegram' : 'message'} />
            </span>
            <span className="meta"><b>{c.label}</b>{c.caption && <span className="muted">{c.caption}</span>}</span>
            <Chevron />
          </a>
        ))}
      </div>
      {visible.some((c) => c.platform === 'instagram') && (
        <p className="foot-note muted">Instagram принадлежит компании Meta, которая признана экстремистской организацией, её деятельность запрещена на территории РФ.</p>
      )}
    </>
  );
}

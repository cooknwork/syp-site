import type { LegalDocument } from '@/data/types';

// Legal links live on the city background (desktop); on narrow screens the same documents are in Settings.
export function Footer({ docs, onOpen }: { docs: LegalDocument[]; onOpen: (slug: string) => void }) {
  return (
    <footer className="foot">
      {docs.map((d) => (
        <button key={d.slug} onClick={() => onOpen(d.slug)}>{d.title}</button>
      ))}
      <small>© {new Date().getFullYear()} SYP</small>
    </footer>
  );
}

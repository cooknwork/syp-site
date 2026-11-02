import { Logo } from '@/components/Logo';
import type { Brand } from '@/data/types';
import { EmptyState } from './ui';

// Brand text is never invented: empty blocks are hidden until they are filled in the admin panel.
export function SYPApp({ brand }: { brand: Brand }) {
  const blocks = [brand.shortDescription, brand.description, brand.philosophy].filter(Boolean) as string[];
  return (
    <>
      <div className="brand-logo"><Logo /></div>
      <h3 className="title center">{brand.name}</h3>
      {blocks.length ? (
        <div className="doc">{blocks.map((b, i) => <p key={i}>{b}</p>)}</div>
      ) : (
        <EmptyState icon="syp" tone="t2" title="Описание бренда скоро появится" text="Текст о SYP и философию бренда добавят через админку." />
      )}
    </>
  );
}

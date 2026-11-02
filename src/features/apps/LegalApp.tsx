import type { LegalDocument } from '@/data/types';
import { Chip } from './ui';

export function LegalApp({ doc }: { doc: LegalDocument }) {
  return (
    <>
      {doc.isDraft && <Chip>Черновик, проверяет юрист</Chip>}
      <h3 className="title small">{doc.title}</h3>
      <div className="doc">
        {doc.body.split(/\n{2,}/).map((p, i) => {
          // «1. Заголовок.» at the start of a paragraph is shown in bold
          const m = p.match(/^(\d+\.\s[^.]+\.)\s(.*)$/s);
          return <p key={i}>{m ? <><b>{m[1]}</b> {m[2]}</> : p}</p>;
        })}
      </div>
    </>
  );
}

import { Icon } from '@/components/Icon';
import type { LegalDocument, Theme } from '@/data/types';
import { Chevron } from './ui';

interface Props {
  themes: Theme[];
  active: string;
  onPick: (slug: string) => void;
  gameVisible: boolean;
  onGame: () => void;
  legal: LegalDocument[];
  onLegal: (slug: string) => void;
}

export function SettingsApp({ themes, active, onPick, gameVisible, onGame, legal, onLegal }: Props) {
  return (
    <>
      <span className="eyebrow">Тема оформления</span>
      <div className="list">
        {themes.map((t) => (
          <button key={t.slug} className="row" aria-pressed={t.slug === active} onClick={() => onPick(t.slug)}>
            <span
              className="swatch"
              style={{ background: `radial-gradient(90% 50% at 30% 20%, ${t.tokens['accent-secondary']}, transparent 70%), linear-gradient(${t.tokens.background}, ${t.tokens['background-secondary']})` }}
            >
              <i style={{ left: '1.2cqi', background: t.tokens['accent-primary'] }} />
              <i style={{ left: '4.4cqi', background: t.tokens['accent-secondary'] }} />
              <i style={{ left: '7.6cqi', background: t.tokens['accent-tertiary'] }} />
            </span>
            <span className="meta"><b>{t.name}</b><span className="muted">{t.mood}</span></span>
            <span className="check"><Icon name="check" /></span>
          </button>
        ))}
      </div>

      {gameVisible && (
        <>
          <span className="eyebrow">Ещё</span>
          <div className="list">
            <button className="row" onClick={onGame}>
              <span className="tile t1"><Icon name="gamepad" /></span>
              <span className="meta"><b>Мини-игра</b><span className="muted">Играете прямо в городе. Или 5 раз нажмите на логотип</span></span>
              <Chevron />
            </button>
          </div>
        </>
      )}

      {legal.length > 0 && (
        <>
          <span className="eyebrow">Документы</span>
          <div className="list">
            {legal.map((d) => (
              <button key={d.slug} className="row" onClick={() => onLegal(d.slug)}>
                <span className="meta"><b>{d.title}</b></span>
                <Chevron />
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

import { EmptyState } from './ui';

// Albums, photos and video arrive with the admin panel (Stage 3/5). Until then: a clean empty state.
export function GalleryApp() {
  return <EmptyState icon="image" tone="t3" title="Здесь будут фото и видео" text="Материалы с мероприятий SYP добавят через админку." />;
}

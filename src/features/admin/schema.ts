// What the admin panel edits: one entry per section of the brief (п. 14).
// Every form is built from these field lists; table and column names match supabase/migrations/0001_init.sql.

export type FieldType =
  | 'text' | 'textarea' | 'url' | 'number' | 'bool' | 'datetime' | 'date'
  | 'select' | 'color' | 'image' | 'media' | 'names' | 'blocks' | 'apps' | 'tokens' | 'album' | 'range';

export interface Field {
  key: string; // column name
  label: string;
  type: FieldType;
  hint?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  min?: number; max?: number; step?: number;
  /** pre-filled when a new record is created */
  initial?: unknown;
}

export interface Section {
  id: string;
  title: string;
  table: string;
  kind: 'collection' | 'single';
  /** has draft / published / hidden states */
  publication: boolean;
  /** soft delete (deleted_at) instead of removing the row */
  softDelete?: boolean;
  titleKey?: string;
  subtitle?: (row: Record<string, unknown>) => string;
  fields: Field[];
  /** shown above the form */
  note?: string;
  /** anchor on the public site for «Предпросмотр» */
  previewHash?: string;
  newLabel?: string;
}

const STATUS_OPTIONS = [
  { value: 'announce', label: 'Анонс' },
  { value: 'on_sale', label: 'В продаже' },
  { value: 'sold_out', label: 'Sold out' },
  { value: 'cancelled', label: 'Отменено' },
  { value: 'past', label: 'Прошло' },
];

export const SECTIONS: Section[] = [
  {
    id: 'events', title: 'Мероприятия', table: 'events', kind: 'collection', publication: true, softDelete: true,
    titleKey: 'title', newLabel: 'Новое мероприятие', previewHash: 'events',
    subtitle: (r) => (r.starts_at ? new Date(String(r.starts_at)).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' }) : 'Дата не указана'),
    note: 'Одна запись используется и в «Мероприятиях», и в «Билетах». Пустые поля на сайте не показываются.',
    fields: [
      { key: 'title', label: 'Название', type: 'text', required: true },
      { key: 'slug', label: 'Адрес в ссылке', type: 'text', hint: 'Латиница, цифры и дефис. Если оставить пустым — сделаем из названия.' },
      { key: 'event_status', label: 'Статус мероприятия', type: 'select', options: STATUS_OPTIONS, initial: 'announce' },
      { key: 'starts_at', label: 'Дата и время начала (МСК)', type: 'datetime' },
      { key: 'venue', label: 'Площадка', type: 'text' },
      { key: 'address', label: 'Адрес', type: 'text' },
      { key: 'short_description', label: 'Краткое описание', type: 'textarea' },
      { key: 'description', label: 'Полное описание', type: 'textarea', hint: 'Абзацы разделяйте пустой строкой.' },
      { key: 'artists', label: 'Артисты и участники', type: 'names', hint: 'По одному на строку.', initial: [] },
      { key: 'info_blocks', label: 'Дополнительная информация', type: 'blocks', hint: 'Блоки «заголовок + текст», например «Возраст» или «Дресс-код».', initial: [] },
      { key: 'poster_id', label: 'Афиша (в приложениях)', type: 'image', hint: 'JPG, длинная сторона от 1500 px. Надписи не обрезаются.' },
      { key: 'billboard_image_id', label: 'Картинка для билборда в городе', type: 'image', hint: 'Отдельно от афиши. Вертикальная 4:5, лучше 800×1000 px.' },
      { key: 'show_on_billboard', label: 'Показывать на билборде', type: 'bool', hint: 'Только одно мероприятие. Если не отмечено ни одно — показывается ближайшее.', initial: false },
      { key: 'ticket_url', label: 'Внешняя ссылка на покупку билета', type: 'url', hint: 'Ссылка на виджет оператора, начинается с https://. Пока пусто — кнопки покупки нет.' },
      { key: 'priority', label: 'Приоритет', type: 'number', hint: 'Больше — выше в списке.', initial: 0 },
      { key: 'sort_order', label: 'Порядок', type: 'number', initial: 0 },
    ],
  },
  {
    id: 'gallery', title: 'Галерея', table: 'gallery_items', kind: 'collection', publication: true, softDelete: true,
    titleKey: 'caption', newLabel: 'Добавить материал', previewHash: 'gallery',
    note: 'Фото: JPG, PNG или WebP до 20 МБ. Видео: MP4 до 100 МБ — лучше сжать заранее (H.264, до 1080p).',
    fields: [
      { key: 'media_id', label: 'Фото или видео', type: 'media', required: true },
      { key: 'caption', label: 'Подпись', type: 'text' },
      { key: 'album_id', label: 'Альбом', type: 'album' },
      { key: 'taken_at', label: 'Дата съёмки', type: 'date' },
      { key: 'sort_order', label: 'Порядок', type: 'number', initial: 0 },
    ],
  },
  {
    id: 'albums', title: 'Альбомы', table: 'gallery_albums', kind: 'collection', publication: true, softDelete: true,
    titleKey: 'title', newLabel: 'Новый альбом', previewHash: 'gallery',
    fields: [
      { key: 'title', label: 'Название', type: 'text', required: true },
      { key: 'slug', label: 'Адрес в ссылке', type: 'text', hint: 'Если оставить пустым — сделаем из названия.' },
      { key: 'cover_id', label: 'Обложка', type: 'image' },
      { key: 'sort_order', label: 'Порядок', type: 'number', initial: 0 },
    ],
  },
  {
    id: 'brand', title: 'Бренд SYP', table: 'brand_content', kind: 'single', publication: true, previewHash: 'syp',
    note: 'Пустые блоки на сайте скрываются.',
    fields: [
      { key: 'name', label: 'Название', type: 'text', required: true },
      { key: 'short_description', label: 'Краткое описание', type: 'textarea' },
      { key: 'description', label: 'Подробное описание', type: 'textarea' },
      { key: 'philosophy', label: 'Философия', type: 'textarea' },
    ],
  },
  {
    id: 'contacts', title: 'Контакты', table: 'contacts', kind: 'collection', publication: false,
    titleKey: 'label', newLabel: 'Новый канал', previewHash: 'messages',
    subtitle: (r) => (r.is_visible && r.url ? 'Показывается' : r.url ? 'Скрыт' : 'Нет ссылки — скрыт'),
    note: 'Канал появляется в «Сообщениях», когда есть ссылка и стоит галочка «Показывать».',
    fields: [
      { key: 'platform', label: 'Площадка', type: 'select', options: [{ value: 'instagram', label: 'Instagram' }, { value: 'telegram', label: 'Telegram' }], initial: 'telegram' },
      { key: 'label', label: 'Название', type: 'text', required: true },
      { key: 'caption', label: 'Подпись', type: 'text' },
      { key: 'url', label: 'Ссылка', type: 'url' },
      { key: 'is_visible', label: 'Показывать', type: 'bool', initial: true },
      { key: 'sort_order', label: 'Порядок', type: 'number', initial: 0 },
    ],
  },
  {
    id: 'home', title: 'Главный экран', table: 'home_screen', kind: 'single', publication: true,
    note: 'Dock (Настройки и Сообщения) фиксирован и не настраивается.',
    fields: [{ key: 'apps', label: 'Приложения на главном экране', type: 'apps' }],
  },
  {
    id: 'themes', title: 'Темы', table: 'themes', kind: 'collection', publication: true,
    titleKey: 'name', newLabel: 'Новая тема', previewHash: 'settings',
    subtitle: (r) => (r.is_default ? 'Тема по умолчанию' : String(r.mood ?? '')),
    note: 'Опубликованные темы появляются в «Настройках». Текст должен хорошо читаться на фоне — проверьте предпросмотром.',
    fields: [
      { key: 'name', label: 'Название', type: 'text', required: true },
      { key: 'slug', label: 'Код', type: 'text', hint: 'Латиница. Если пусто — сделаем из названия.' },
      { key: 'mood', label: 'Настроение (подпись в Настройках)', type: 'text' },
      { key: 'tokens', label: 'Цвета', type: 'tokens' },
      { key: 'is_default', label: 'Тема по умолчанию', type: 'bool', initial: false },
      { key: 'sort_order', label: 'Порядок', type: 'number', initial: 0 },
    ],
  },
  {
    id: 'city', title: 'Город', table: 'city_settings', kind: 'single', publication: true,
    note: 'Яркость, контраст, свечение и скорость относятся к городу за телефоном; текстура — к зерну на обоях телефона. 1 — как задумано.',
    fields: [
      { key: 'brightness', label: 'Яркость', type: 'range', min: 0.5, max: 1.5, step: 0.05 },
      { key: 'contrast', label: 'Контрастность', type: 'range', min: 0.5, max: 1.5, step: 0.05 },
      { key: 'glow_intensity', label: 'Интенсивность свечения', type: 'range', min: 0, max: 2, step: 0.05 },
      { key: 'texture', label: 'Текстура', type: 'range', min: 0, max: 1, step: 0.05 },
      { key: 'animation_speed', label: 'Скорость анимации', type: 'range', min: 0, max: 2, step: 0.05 },
    ],
  },
  {
    id: 'game', title: 'Игра', table: 'game_settings', kind: 'single', publication: true,
    fields: [
      { key: 'is_visible', label: 'Игра доступна', type: 'bool' },
      { key: 'title', label: 'Название', type: 'text', required: true },
      { key: 'description', label: 'Описание на стартовом экране', type: 'textarea' },
      { key: 'start_speed', label: 'Начальная скорость', type: 'range', min: 0.5, max: 2, step: 0.05 },
      { key: 'max_speed', label: 'Максимальная скорость', type: 'range', min: 1, max: 4, step: 0.1 },
      { key: 'gravity', label: 'Гравитация', type: 'range', min: 0.5, max: 2, step: 0.05 },
      { key: 'jump_force', label: 'Сила прыжка', type: 'range', min: 0.5, max: 2, step: 0.05 },
    ],
  },
  {
    id: 'legal', title: 'Юридическая информация', table: 'legal_documents', kind: 'collection', publication: true,
    titleKey: 'title', newLabel: 'Новый документ', previewHash: 'privacy',
    note: 'Документ без текста на сайте не показывается. Перед публикацией тексты проверяет юрист.',
    fields: [
      { key: 'title', label: 'Название', type: 'text', required: true },
      { key: 'slug', label: 'Код', type: 'text', hint: 'Если пусто — сделаем из названия.' },
      { key: 'body', label: 'Текст', type: 'textarea', hint: 'Абзацы разделяйте пустой строкой. «1. Заголовок.» в начале абзаца станет жирным.' },
      { key: 'show_in_footer', label: 'Показывать в футере', type: 'bool', initial: true },
      { key: 'sort_order', label: 'Порядок', type: 'number', initial: 0 },
    ],
  },
  {
    id: 'site', title: 'Общие настройки', table: 'site_settings', kind: 'single', publication: true,
    note: 'Мессенджеры и поисковики читают эти данные из готовой страницы, поэтому после публикации они обновляются при ближайшей пересборке сайта — она идёт автоматически раз в час.',
    fields: [
      { key: 'site_name', label: 'Название сайта', type: 'text', required: true },
      { key: 'meta_title', label: 'Meta title', type: 'text' },
      { key: 'meta_description', label: 'Meta description', type: 'textarea' },
      { key: 'og_image_id', label: 'Картинка для ссылок в соцсетях', type: 'image', hint: 'Превью при отправке ссылки в Telegram, ВКонтакте и т. п. Горизонтальная, 1200×630 px, JPG или PNG.' },
      { key: 'favicon_id', label: 'Favicon', type: 'image', hint: 'Иконка во вкладке браузера и в закладках. Квадратная PNG, 512×512 px.' },
    ],
  },
];

export const HOME_APP_LABELS: Record<string, string> = { syp: 'SYP', events: 'Мероприятия', gallery: 'Галерея', tickets: 'Билеты' };

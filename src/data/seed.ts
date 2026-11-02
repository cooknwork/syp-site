import type { SiteContent } from './types';

// Starting content — the same rows as supabase/seed.sql.
// Only what the brief gives us; everything else stays empty until it is filled in the admin panel.

export const content: SiteContent = {
  themes: [
    {
      slug: 'original', name: 'SYP Original', mood: 'Ночной город, неон, клубная культура', isDefault: true,
      tokens: { background: '#170F1A', 'background-secondary': '#212332', surface: '#212332', 'surface-secondary': '#5F01CB', 'text-primary': '#D7E2FF', 'text-secondary': '#D096FD', 'accent-primary': '#FEFE00', 'accent-secondary': '#D096FD', 'accent-tertiary': '#3DF3C2' },
    },
    {
      slug: 'acid', name: 'Acid Playground', mood: 'Кислотный цифровой playground', isDefault: false,
      tokens: { background: '#212320', 'background-secondary': '#3D5A00', surface: '#3D5A00', 'surface-secondary': '#212320', 'text-primary': '#F8CE92', 'text-secondary': '#3DF3C2', 'accent-primary': '#FEFE00', 'accent-secondary': '#FD6414', 'accent-tertiary': '#3DF3C2' },
    },
    {
      slug: 'blue', name: 'Blue Hour', mood: 'Холодный город, синий свет', isDefault: false,
      tokens: { background: '#1724AE', 'background-secondary': '#212332', surface: '#212332', 'surface-secondary': '#271ECF', 'text-primary': '#D7E2FF', 'text-secondary': '#3DF3C2', 'accent-primary': '#3DF3C2', 'accent-secondary': '#FBD745', 'accent-tertiary': '#271ECF' },
    },
    {
      slug: 'pink', name: 'Pink Noise', mood: 'Фиолетовый свет, дерзкий клуб', isDefault: false,
      tokens: { background: '#170F1A', 'background-secondary': '#42005A', surface: '#42005A', 'surface-secondary': '#960262', 'text-primary': '#F8CE92', 'text-secondary': '#D096FD', 'accent-primary': '#D096FD', 'accent-secondary': '#FEFE00', 'accent-tertiary': '#960262' },
    },
    {
      slug: 'heat', name: 'Heatwave', mood: 'Оранжевое освещение, энергия', isDefault: false,
      tokens: { background: '#212320', 'background-secondary': '#592C02', surface: '#592C02', 'surface-secondary': '#932C19', 'text-primary': '#F8CE92', 'text-secondary': '#FBD745', 'accent-primary': '#FBD745', 'accent-secondary': '#F34E16', 'accent-tertiary': '#D02700' },
    },
  ],

  events: [
    {
      slug: 'slay-and-play',
      title: 'SLAY AND PLAY',
      shortDescription: null,
      description: null,
      posterUrl: null,
      billboardImageUrl: null,
      showOnBillboard: true,
      startsAt: null,
      timezone: 'Europe/Moscow',
      venue: null,
      address: null,
      artists: [],
      infoBlocks: [],
      ticketUrl: null,
      status: 'announce',
      priority: 0,
      sortOrder: 0,
    },
  ],

  // Channels exist but stay hidden until a link is added (same as the database).
  contacts: [
    { platform: 'instagram', label: 'Instagram', caption: null, url: null, isVisible: false },
    { platform: 'telegram', label: 'Telegram', caption: null, url: null, isVisible: false },
  ],

  brand: { name: 'SYP', shortDescription: null, description: null, philosophy: null },

  legal: [
    {
      slug: 'privacy', title: 'Политика конфиденциальности', showInFooter: true, isDraft: true,
      body: [
        '1. Общие положения. Политика определяет порядок обработки персональных данных посетителей сайта [домен], который ведёт [наименование оператора, ИНН, ОГРН, адрес]. Опубликована в соответствии с ч. 2 ст. 18.1 Федерального закона № 152-ФЗ «О персональных данных».',
        '2. Какие данные обрабатываются. Сайт не требует регистрации и не содержит форм. При обращении к сайту сервер автоматически записывает технические сведения: IP-адрес, сведения о браузере и устройстве, дату и время запроса, адрес страницы. Они могут относиться к персональным данным.',
        '3. Цели. Работа сайта, его безопасность и защита от атак, исправление технических ошибок. Данные не используются для рекламы и профилирования.',
        '4. Правовое основание. [Указать по согласованию с юристом.]',
        '5. Срок хранения. Технические записи хранятся [N] дней, затем удаляются.',
        '6. Передача. Данные обрабатываются на серверах хостинг-провайдера [наименование] по поручению оператора. Базы данных находятся на территории РФ. Иным лицам данные не передаются, кроме случаев, предусмотренных законом.',
        '7. Другие сайты. Покупка билетов и ссылки на соцсети ведут на сторонние сайты, которые обрабатывают данные по своим правилам.',
        '8. Права посетителя. Можно запросить сведения об обработке данных, их уточнение, блокирование или удаление. Обращения: [email], ответ в течение 10 рабочих дней.',
        '9. Изменения. Актуальная редакция всегда опубликована на сайте. Редакция от [дата].',
      ].join('\n\n'),
    },
    {
      slug: 'cookies', title: 'Cookie и хранение данных', showInFooter: true, isDraft: true,
      body: [
        'Публичная часть сайта не использует cookie.',
        'Выбранная тема и рекорд в мини-игре хранятся в локальном хранилище браузера (localStorage) на вашем устройстве. Они не передаются на сервер и не позволяют установить личность. Удалить их можно в настройках браузера.',
        'Cookie используются только в закрытой админ-панели, чтобы администратор оставался в системе.',
        'Сторонняя аналитика и рекламные счётчики не подключены. Если они появятся, этот текст обновится, а на сайте появится уведомление.',
      ].join('\n\n'),
    },
    {
      slug: 'legal', title: 'Правовая информация', showInFooter: true, isDraft: true,
      body: [
        '© 2026 SYP. Все права защищены. Использование материалов сайта — только с разрешения правообладателя.',
        'Билеты продаёт [билетный оператор]. Покупка, оплата и возврат проходят на его сайте и по его правилам.',
        'Instagram принадлежит компании Meta, которая признана экстремистской организацией, её деятельность запрещена на территории Российской Федерации.',
        'Оператор сайта: [наименование, ИНН, ОГРН]. Связь: [email].',
      ].join('\n\n'),
    },
  ],

  game: {
    isVisible: true,
    title: 'SYP Run',
    description: 'Беги по ночному городу и перепрыгивай машины, барьеры и колонки.',
    startSpeed: 1,
    maxSpeed: 2.3,
    gravity: 1,
    jumpForce: 1,
  },
  city: { brightness: 1, contrast: 1, glowIntensity: 1, texture: 0.2, animationSpeed: 1 },

  gallery: { albums: [], items: [] },
  home: { apps: [{ key: 'syp', visible: true }, { key: 'events', visible: true }, { key: 'gallery', visible: true }, { key: 'tickets', visible: true }] },
  source: 'seed',
};

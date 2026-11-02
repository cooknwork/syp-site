import type { Metadata, Viewport } from 'next';
// Inter from local WOFF2 files (npm @fontsource/inter): no requests to Google, latin + cyrillic.
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import { content } from '@/data/seed';
import { loadSiteMeta } from '@/data/siteMeta';
import { themeBootScript, themesCss } from '@/features/theme/themes';
import '@/styles/globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const m = await loadSiteMeta();
  return {
    title: m.title,
    description: m.description,
    applicationName: m.siteName,
    openGraph: {
      type: 'website',
      locale: 'ru_RU',
      siteName: m.siteName,
      title: m.title,
      description: m.description,
      ...(m.ogImage ? { images: [m.ogImage] } : {}),
    },
    twitter: { card: m.ogImage ? 'summary_large_image' : 'summary', title: m.title, description: m.description, ...(m.ogImage ? { images: [m.ogImage.url] } : {}) },
    ...(m.favicon ? { icons: { icon: [{ url: m.favicon.url, type: m.favicon.type }], apple: m.favicon.url } } : {}),
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: content.themes.find((t) => t.isDefault)?.tokens.background ?? '#170F1A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const themes = content.themes;
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <style id="syp-themes" dangerouslySetInnerHTML={{ __html: themesCss(themes) }} />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript(themes.map((t) => t.slug)) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

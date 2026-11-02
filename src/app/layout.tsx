import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { content } from '@/data/seed';
import { themeBootScript, themesCss } from '@/features/theme/themes';
import '@/styles/globals.css';

// Inter is downloaded at build time and served from our own files (local WOFF2), no external requests.
const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'SYP',
  description: 'SYP — цифровой мир бренда: мероприятия, билеты, галерея и мини-игра.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: content.themes.find((t) => t.isDefault)?.tokens.background ?? '#170F1A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const themes = content.themes;
  return (
    <html lang="ru" className={inter.variable} suppressHydrationWarning>
      <head>
        <style id="syp-themes" dangerouslySetInnerHTML={{ __html: themesCss(themes) }} />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript(themes.map((t) => t.slug)) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

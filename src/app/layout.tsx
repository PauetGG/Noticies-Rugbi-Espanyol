import type { Metadata } from 'next';
import { Bodoni_Moda, Spectral } from 'next/font/google';
import { Masthead } from '@/components/Masthead';
import { Footer } from '@/components/Footer';
import { site } from '@/lib/site';
import './globals.css';

const display = Bodoni_Moda({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  style: ['normal', 'italic'],
  variable: '--font-display',
});

const body = Spectral({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.name,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  alternates: {
    types: { 'application/rss+xml': `${site.url}/rss.xml` },
  },
  openGraph: {
    siteName: site.name,
    locale: site.locale,
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable}`}>
      <body className="flex min-h-screen flex-col antialiased">
        <Masthead />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
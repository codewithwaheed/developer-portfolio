import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { baseOpenGraph } from '@/seo/metadata';
import { siteConfig } from '@/config/site';
import { themeScript } from '@/os/themeScript';
import './globals.css';

const description =
  'Waheed Ahmed is a full-stack software engineer who specializes in building exceptional digital experiences.';
const title = `${siteConfig.name} · ${siteConfig.title}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title,
  description,
  alternates: { canonical: '/' },
  openGraph: { ...baseOpenGraph, title, description, url: '/' },
  twitter: { card: 'summary_large_image', title, description, images: ['/og.png'] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';

import './globals.css';

export const metadata: Metadata = {
  title: 'Kith for Web',
  description: 'The private-by-default messenger, in your browser. End-to-end encrypted before your message ever leaves the tab.',
};

export const viewport: Viewport = {
  themeColor: '#ff5a2c',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body>{children}</body>
    </html>
  );
}

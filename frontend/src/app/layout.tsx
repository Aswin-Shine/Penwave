import type { Metadata } from 'next';
import { Providers } from '@/providers';
import { SmoothScroll } from '@/components/layout/smooth-scroll';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: { default: 'Penwave®', template: '%s — Penwave' },
  description: 'A sanctuary for thoughtful writing, deep ideas, and meaningful digital publishing.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="bg-cream-900 text-muted_teal-100 selection:bg-celadon-300/30 antialiased overflow-x-hidden min-h-screen">
        <Providers>
          <SmoothScroll>
            {children}
          </SmoothScroll>
        </Providers>
      </body>
    </html>
  );
}

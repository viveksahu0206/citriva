import type { Metadata } from 'next';
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';
import AmbientBackground from '@/components/AmbientBackground';
import './globals.css';

const display = Fraunces({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'Citriva — Scientific Claim and Citation Verification Suite',
  description:
    'Citriva parses academic PDFs, extracts cited claims, resolves references across scholarly knowledge graphs, and performs rigorous NLI verification to catch fabricated or overclaimed citations.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="font-sans antialiased text-[#f0f9ff] selection:bg-sky-400/30">
        <AmbientBackground />
        {children}
      </body>
    </html>
  );
}

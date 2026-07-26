import './globals.css';
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Outfit } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Forge — Personal Agentic Workbench',
  description: 'High-performance Agentic Harness, MCP Connectors & Live Sandpack Preview',
};

// Reads the saved theme synchronously to avoid a flash of the wrong theme.
// This runs before React hydration on the client; on the server we just
// leave it unset (the CSS @media block picks the right value).
const themeBootstrap = `
(function() {
  try {
    var t = localStorage.getItem('forge-theme');
    if (t === 'light' || t === 'dark') {
      document.documentElement.setAttribute('data-theme', t);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

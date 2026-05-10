import type { Metadata, Viewport } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import { Inter, JetBrains_Mono, Caveat } from 'next/font/google'
import { ThemeProvider } from '@/theme'
import { THEMES } from '@/theme/themes'
import { cn } from '@/lib/utils'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-ui',
  weight: ['400', '500', '600', '700', '800', '900'],
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600', '700'],
})

const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-handwriting',
  weight: ['400', '600', '700'],
})

const themeScript = `
  (function() {
    var themes = ${JSON.stringify(THEMES)};
    var root = document.documentElement;
    try {
      var stored = localStorage.getItem('cc-theme');
      var system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'electric' : 'light';
      var theme = (stored === 'electric' || stored === 'jade' || stored === 'light') ? stored : system;
      var tokens = themes[theme];
      Object.keys(tokens).forEach(function(k) { root.style.setProperty('--' + k, tokens[k]); });
      root.setAttribute('data-theme', theme);
    } catch (e) {
      var fallback = themes['light'];
      Object.keys(fallback).forEach(function(k) { root.style.setProperty('--' + k, fallback[k]); });
      root.setAttribute('data-theme', 'light');
    }
  })();
`

export const metadata: Metadata = {
  title: 'Concert Crawl',
  description: 'Denver concert calendar — find shows at your favorite venues.',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        suppressHydrationWarning
        className={cn(inter.variable, mono.variable, caveat.variable)}
      >
        <head>
          {/* Blocking script: runs before paint to apply saved/system theme */}
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        </head>
        <body className="min-h-screen bg-bg text-fg font-sans antialiased">
          <ThemeProvider>{children}</ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}

import type { Metadata, Viewport } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import { Inter, JetBrains_Mono, Caveat } from 'next/font/google'
import { ThemeProvider } from '@/theme'
import { THEMES } from '@/theme/themes'
import { cn } from '@/lib/utils'
import { QueryProvider } from '@/components/QueryProvider'
// Imported directly, not via the analytics barrel: the barrel also re-exports
// browser-only posthog-js helpers, which must not enter this Server Component's
// module graph.
import { PostHogProvider } from '@/lib/analytics/PostHogProvider'
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration'
import { Toaster } from 'sonner'
import { SpeedInsights } from '@vercel/speed-insights/next'

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
      var theme = (stored && stored in themes) ? stored : system;
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
  description: 'Denver concert calendar. Find shows at your favorite venues.',
  manifest: '/manifest.webmanifest',
  applicationName: 'Concert Crawl',
  appleWebApp: {
    capable: true,
    title: 'Concert Crawl',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    // The SVG must lead: declaring `icons` overrides Next's automatic
    // detection of the app/icon.svg file convention, so without this entry the
    // scalable tab favicon is dropped and browsers fall back to the oversized
    // PWA PNGs (or nothing). The PNGs remain for platforms without SVG support.
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/api/pwa/icon-192', sizes: '192x192', type: 'image/png' },
      { url: '/api/pwa/icon-512', sizes: '512x512', type: 'image/png' },
    ],
    // iOS Safari uses the apple-touch-icon link when a user does Share → Add
    // to Home Screen. Without this entry the icon field renders no <link
    // rel="apple-touch-icon">, and iOS falls back to a screenshot of the
    // page — which for us surfaces the "Concert Crawl" wordmark's "C" as a
    // giant letter on the home screen. Verified on iPhone Safari 2026-07-19.
    // The 180×180 endpoint uses the non-maskable `any` art (Apple composites
    // it on an opaque tile).
    apple: [
      { url: '/api/pwa/icon-apple-180', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#070A1A',
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
          <ServiceWorkerRegistration />
          <QueryProvider>
            <PostHogProvider>
              <ThemeProvider>{children}</ThemeProvider>
            </PostHogProvider>
          </QueryProvider>
          <Toaster position="bottom-center" richColors />
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  )
}

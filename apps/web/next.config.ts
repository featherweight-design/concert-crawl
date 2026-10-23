import { createHash } from 'node:crypto'
import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'
import withSerwistInit from '@serwist/next'
import rootPkg from '../../package.json'

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@concert-crawl/types'],
  env: {
    NEXT_PUBLIC_APP_VERSION: `v${rootPkg.version} · ${(process.env['RENDER_GIT_COMMIT'] ?? process.env['VERCEL_GIT_COMMIT_SHA'])?.slice(0, 7) ?? 'dev'}`,
  },
}

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
  reloadOnOnline: true,
  // `sw.ts` names `/~offline` as its navigation fallback, and a fallback is
  // served via `matchPrecache`, so the entry has to be in the precache manifest
  // or the fallback silently never fires. @serwist/next builds that manifest
  // from webpack assets plus a glob of `public/`, and an App Router page is
  // neither — so no HTML document was ever precached and offline navigation
  // failed with ERR_FAILED. Appending the entry here rather than via
  // `additionalPrecacheEntries`, which replaces the `public/` glob outright and
  // would drop the share fonts.
  manifestTransforms: [
    (manifestEntries) => ({
      manifest: [
        ...manifestEntries,
        {
          url: '/~offline',
          // The precached HTML embeds hashed script tags, so it goes stale the
          // moment any asset does. Deriving the revision from the rest of the
          // manifest ties invalidation to exactly that, without reaching for a
          // webpack compilation object the plugin types as `{}`.
          revision: createHash('sha256')
            .update(
              manifestEntries
                .map((entry) => `${entry.url}:${entry.revision ?? ''}`)
                .sort()
                .join('\n'),
            )
            .digest('hex'),
          size: 0,
        },
      ],
      warnings: [],
    }),
  ],
})

export default withSentryConfig(withSerwist(config), {
  org: 'fw-design',
  project: 'concert-crawl-web',
  // Suppress output locally; print in CI for source map upload confirmation
  silent: !process.env['CI'],
  widenClientFileUpload: true,
  // Delete source maps from the build output after uploading to Sentry
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  webpack: {
    // Tree-shake Sentry logger statements from the client bundle
    treeshake: {
      removeDebugLogging: true,
    },
    automaticVercelMonitors: false,
  },
})

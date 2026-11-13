import { createHash } from 'node:crypto';
import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs/config';
import withSerwistInit from '@serwist/next';
import rootPkg from '../../package.json';
import { CLERK_JS_VERSION, CLERK_UI_VERSION } from './src/lib/clerk-scripts';

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@concert-crawl/types'],
  // `next build` runs its own full type-check after compiling, in the same
  // memory the webpack build still holds. The app has outgrown the 8 GB Vercel
  // Standard build machine: compile finishes (about 90 s), then "Running
  // TypeScript" is killed ("Out of Memory", then NEXT_NO_ROUTES_MANIFEST), which
  // failed every web build from 2026-11-13 07:06Z. CI already type-checks the
  // web workspace on every PR (`pnpm turbo run lint typecheck --filter=@concert-
  // crawl/web`, the Checks job), so the build skips the second pass.
  typescript: { ignoreBuildErrors: true },
  env: {
    // Exact Clerk script versions, so the browser skips two uncacheable
    // redirects per page load. See src/lib/clerk-scripts.ts.
    NEXT_PUBLIC_CLERK_JS_VERSION: CLERK_JS_VERSION,
    NEXT_PUBLIC_CLERK_UI_VERSION: CLERK_UI_VERSION,
    NEXT_PUBLIC_APP_VERSION: `v${rootPkg.version} · ${process.env['VERCEL_GIT_COMMIT_SHA']?.slice(0, 7) ?? 'dev'}`,
    // Analytics `release` and `app_version` super-properties
    // (src/lib/analytics/client.ts). Vercel only exposes the NEXT_PUBLIC_ twin
    // of a system variable when the project opts in, so it is inlined here from
    // the server-side one; empty outside a Vercel build.
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA:
      process.env['NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA'] ||
      process.env['VERCEL_GIT_COMMIT_SHA'] ||
      '',
    NEXT_PUBLIC_PACKAGE_VERSION: rootPkg.version,
  },
};

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
  // ServiceWorkerRegistration registers `/sw.js` and catches its failures.
  // Serwist's auto-register would register it a second time with no catch,
  // so any browser whose `register()` misbehaves surfaced an unhandled
  // rejection (CONCERT-CRAWL-WEB-2).
  register: false,
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
});

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
});

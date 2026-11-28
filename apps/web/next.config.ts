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
  // crawl/web`, the Checks job), and main's branch protection (the merge queue)
  // requires that job, so nothing reaches main, and so Vercel, untyped. The
  // build skips only the second pass of a check that has already gated the code.
  typescript: { ignoreBuildErrors: true },
  // The same ceiling, one phase later: from 2026-11-14 the compile passes and
  // the build is SIGKILLed ("Out of Memory", then NEXT_NO_ROUTES_MANIFEST) in
  // "Collecting page data using 3 workers", where each worker imports every
  // route module on the 8 GB Standard machine (4 cores). Two workers hold fewer
  // route graphs at once, and webpack's memory mode trades some speed for a
  // lower peak in the compile that precedes them.
  // The worker cap is for that 8 GB machine only: CI and local builds keep
  // Next's own default.
  experimental: {
    ...(process.env['VERCEL'] ? { cpus: 2 } : {}),
    webpackMemoryOptimizations: true,
    // The Icon step posts up to three base64 reference images (about 750 KB
    // each) in one server action; Next's default body limit is 1 MB.
    serverActions: { bodySizeLimit: '4mb' },
  },
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

// The environment a release's deploy is recorded under: the one runtime events
// already report (SENTRY_ENVIRONMENT on the server and edge, the NEXT_PUBLIC_
// twin on the client), so a staging build is never tagged "production". Unset
// records no deploy, rather than a guessed one.
const sentryDeployEnv = (
  process.env['SENTRY_ENVIRONMENT'] ??
  process.env['NEXT_PUBLIC_SENTRY_ENVIRONMENT']
)?.trim();

export default withSentryConfig(withSerwist(config), {
  org: 'fw-design',
  project: 'concert-crawl-web',
  ...(sentryDeployEnv ? { release: { deploy: { env: sentryDeployEnv } } } : {}),
  // Suppress output locally; print in CI for source map upload confirmation
  silent: !process.env['CI'],
  widenClientFileUpload: true,
  // Delete source maps from the build output after uploading to Sentry
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  webpack: {
    // Tree-shake Sentry logger statements from the client bundle, and the SDK's
    // tracing code (all runtimes): tracing is off (no tracesSampleRate; see
    // SENTRY_PRIVACY_OPTIONS) and nothing in this app starts a span, but the
    // default client integrations still pull the browser tracing code into the
    // largest first-load chunk. Error capture does not depend on it. If tracing
    // is ever turned on, remove `removeTracing` or no spans will be sent. The
    // build is webpack (`next build --webpack`), where this option applies.
    treeshake: {
      removeDebugLogging: true,
      removeTracing: true,
    },
    automaticVercelMonitors: false,
  },
});

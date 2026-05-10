import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'
import rootPkg from '../../package.json'

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@concert-crawl/types'],
  env: {
    NEXT_PUBLIC_APP_VERSION: `v${rootPkg.version} · ${process.env['RENDER_GIT_COMMIT']?.slice(0, 7) ?? 'dev'}`,
  },
}

export default withSentryConfig(config, {
  org: 'concert-crawl',
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

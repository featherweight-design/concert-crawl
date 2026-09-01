# Previously based on mcr.microsoft.com/playwright, but Microsoft
# Container Registry's anonymous-pull rate limits (200 req/6h per IP)
# consistently throttle Render's build pool — and as of Jun 2026 also
# hit GitHub Actions runners and local dev IPs. Replaced with a
# self-rolled image on top of node:22-bookworm. Chromium plus its X11,
# font, and audio runtime libs come from `playwright install --with-deps`,
# which pulls from playwright.azureedge.net (separate CDN from MCR,
# separate rate-limit regime).
FROM node:22-bookworm

# Install pnpm globally so the non-root user can use it without
# corepack-permission gymnastics. Matches package.json#packageManager.
RUN npm install -g pnpm@10.33.2

# Non-root user matches the pwuser pattern from the MCR Playwright base
# image. Required because Chromium's sandbox refuses to start as root.
RUN groupadd --system pwuser && useradd --system --gid pwuser --create-home pwuser

WORKDIR /app

# Skip Playwright's postinstall browser download (which would fetch
# Chromium + Firefox + WebKit to ~/.cache); we install Chromium
# explicitly below into PLAYWRIGHT_BROWSERS_PATH.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_BROWSERS_PATH=/home/pwuser/ms-playwright

# The root `prepare` script installs git hooks. An image has no working
# tree to hook, and after the layer reorder below `pnpm install` runs
# before `.husky` is even in the context. Husky exits 0 on a missing
# repo today, so this is not a live break — it is removing a step whose
# success depends on that leniency continuing.
ENV HUSKY=0

# Manifests only, before any source. `pnpm install` and the Chromium
# download below are the two expensive layers, and neither depends on
# application source — copying source first (as this file used to) meant
# a one-line crawler change re-ran both. Each workspace manifest is
# listed explicitly because Docker's COPY flattens wildcard directories.
# apps/api, apps/web and apps/e2e are absent by design: all three are
# excluded in .dockerignore and nothing in the crawler's dependency graph
# references any of them, so their dependencies never need resolving here.
# pnpm tolerates a workspace member missing from disk under
# --frozen-lockfile; it resolves only the projects it finds.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/crawler/package.json ./apps/crawler/
COPY packages/config/package.json ./packages/config/
COPY packages/crawler-core/package.json ./packages/crawler-core/
COPY packages/db/package.json ./packages/db/
COPY packages/entitlements/package.json ./packages/entitlements/
COPY packages/logger/package.json ./packages/logger/
COPY packages/price-pipeline/package.json ./packages/price-pipeline/
COPY packages/push/package.json ./packages/push/
COPY packages/types/package.json ./packages/types/

RUN pnpm install --frozen-lockfile

# Run as root so --with-deps can apt-get install Chromium's X11/font/audio
# runtime libs. Chromium itself downloads from playwright.azureedge.net.
RUN pnpm --filter=@concert-crawl/crawler-core exec playwright install --with-deps chromium

COPY . .

RUN pnpm turbo build --filter=@concert-crawl/crawler-core --filter=@concert-crawl/logger --filter=@concert-crawl/price-pipeline

# Hand ownership of working dirs to pwuser so the runtime can read
# node_modules, built bundles, and the Chromium binary.
RUN chown -R pwuser:pwuser /app /home/pwuser/ms-playwright

USER pwuser

CMD ["pnpm", "--filter", "@concert-crawl/crawler", "start"]

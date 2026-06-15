# Previously based on mcr.microsoft.com/playwright, but Microsoft
# Container Registry's anonymous-pull rate limits (200 req/6h per IP)
# consistently throttle Render's build pool — and as of Jun 2026 also
# hit GitHub Actions runners and local dev IPs. Replaced with a
# self-rolled image on top of node:22-bookworm. Chromium plus its X11,
# font, and audio runtime libs come from `playwright install --with-deps`,
# which pulls from playwright.azureedge.net (separate CDN from MCR,
# separate rate-limit regime).
FROM node:22-bookworm

WORKDIR /app

# pnpm via corepack — matches package.json#packageManager (10.33.2).
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

# Chromium will live here at runtime; the crawler reads from this path.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY . .

RUN pnpm install --frozen-lockfile

# --with-deps invokes apt-get for the system libs Chromium needs to run
# headless. Without it the binary launches but crashes on missing
# libnss3/libxkbcommon/etc.
RUN pnpm --filter=@concert-crawl/crawler-core exec playwright install --with-deps chromium

RUN pnpm turbo build --filter=@concert-crawl/crawler-core --filter=@concert-crawl/logger --filter=@concert-crawl/price-pipeline

CMD ["pnpm", "--filter", "@concert-crawl/crawler", "start"]

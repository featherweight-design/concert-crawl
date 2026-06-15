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

COPY . .

RUN pnpm install --frozen-lockfile

# Run as root so --with-deps can apt-get install Chromium's X11/font/audio
# runtime libs. Chromium itself downloads from playwright.azureedge.net.
RUN pnpm --filter=@concert-crawl/crawler-core exec playwright install --with-deps chromium

RUN pnpm turbo build --filter=@concert-crawl/crawler-core --filter=@concert-crawl/logger --filter=@concert-crawl/price-pipeline

# Hand ownership of working dirs to pwuser so the runtime can read
# node_modules, built bundles, and the Chromium binary.
RUN chown -R pwuser:pwuser /app /home/pwuser/ms-playwright

USER pwuser

CMD ["pnpm", "--filter", "@concert-crawl/crawler", "start"]

# Mirrored from mcr.microsoft.com/playwright:v1.60.0-jammy to bypass
# Microsoft Container Registry's anonymous-pull rate limits which
# regularly throttle Render's build pool. See:
# .github/workflows/mirror-playwright-image.yml for the mirror process.
# When bumping the Playwright tag here, also re-run the mirror workflow
# with the new tag input before merging.
FROM ghcr.io/hartiganhm/playwright-base:v1.60.0-jammy

# Playwright browsers are pre-installed in /ms-playwright by the base image
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

COPY . .

RUN pnpm install --frozen-lockfile

RUN pnpm turbo build --filter=@concert-crawl/crawler-core --filter=@concert-crawl/logger --filter=@concert-crawl/price-pipeline

CMD ["pnpm", "--filter", "@concert-crawl/crawler", "start"]

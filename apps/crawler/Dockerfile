FROM mcr.microsoft.com/playwright/node:20-jammy

# Playwright browsers are pre-installed in /ms-playwright by the base image
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

COPY . .

RUN pnpm install --frozen-lockfile

RUN pnpm turbo build --filter=@concert-crawl/crawler-core --filter=@concert-crawl/logger

CMD ["pnpm", "--filter", "@concert-crawl/crawler", "start"]

# Previously based on mcr.microsoft.com/playwright, but Microsoft
# Container Registry's anonymous-pull rate limits (200 req/6h per IP)
# consistently throttle Render's build pool — and as of Jun 2026 also
# hit GitHub Actions runners and local dev IPs. Replaced with a
# self-rolled image on top of node:22-bookworm (since moved to 24 and
# pinned, below). Chromium plus its X11, font, and audio runtime libs come
# from `playwright install-deps` and `playwright install`, which pull from
# playwright.azureedge.net (separate CDN from MCR, separate rate-limit
# regime).
#
# Pinned to an exact patch, not the floating `24-bookworm` tag: a cached
# base layer can keep serving an older Node after a security release.
# Keep it on the same Node release as .node-version (the API and web), so
# a security release is one version to bump, not two. .node-version is not
# in the crawler's build filters, so bump this line by hand alongside it.
# 24.22.1 is the October 2026 release that fixes the TLS hostname-check
# bypass and distrusts the compromised eMudhra intermediates.
FROM node:24.22.1-bookworm

# Install pnpm globally so the non-root user can use it without
# corepack-permission gymnastics. Matches package.json#packageManager.
RUN npm install -g pnpm@10.33.2

# Non-root user matches the pwuser pattern from the MCR Playwright base
# image. Required because Chromium's sandbox refuses to start as root.
RUN groupadd --system pwuser && useradd --system --gid pwuser --create-home pwuser

WORKDIR /app

# Hand over the two trees pwuser writes to while they are still empty, then
# build as pwuser for every step that writes into them (only the apt install
# below drops back to root). This replaces a `chown -R` that used to run
# after the build and had to walk all of node_modules plus the unpacked
# Chromium — measured at 102s of a 206s build, the single most expensive
# layer in the image. Ownership is now established in O(1) instead:
# `useradd --create-home` already leaves /home/pwuser and its skel files owned
# by pwuser, so only these two directories need handing over and no step in
# the build walks a tree recursively.
RUN mkdir -p /home/pwuser/ms-playwright \
  && chown pwuser:pwuser /app /home/pwuser/ms-playwright

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
USER pwuser

COPY --chown=pwuser:pwuser package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY --chown=pwuser:pwuser apps/crawler/package.json ./apps/crawler/
COPY --chown=pwuser:pwuser packages/config/package.json ./packages/config/
COPY --chown=pwuser:pwuser packages/crawler-core/package.json ./packages/crawler-core/
COPY --chown=pwuser:pwuser packages/db/package.json ./packages/db/
COPY --chown=pwuser:pwuser packages/entitlements/package.json ./packages/entitlements/
COPY --chown=pwuser:pwuser packages/logger/package.json ./packages/logger/
COPY --chown=pwuser:pwuser packages/price-pipeline/package.json ./packages/price-pipeline/
COPY --chown=pwuser:pwuser packages/push/package.json ./packages/push/
COPY --chown=pwuser:pwuser packages/types/package.json ./packages/types/

RUN pnpm install --frozen-lockfile

# The apt half of the old `--with-deps` — Chromium's X11, font, and audio
# runtime libs. This is the only step that genuinely needs root, so it is
# split out and invoked through the resolved binary rather than `pnpm exec`:
# running pnpm as root inside a pwuser-owned /app risks it dropping
# root-owned cache files into the tree, which is the exact problem the
# recursive chown existed to paper over.
USER root
# Refresh the system certificate store as well: the base image's copy is
# only as new as its build. OpenSSL-based tools such as curl read it; Node
# carries its own bundle and Chromium its own root store, so neither depends
# on this. It is a cached layer, so it refreshes when the base pin moves.
RUN apt-get update \
  && apt-get install -y --only-upgrade ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN ./packages/crawler-core/node_modules/.bin/playwright install-deps chromium

# The browser download half, back as pwuser so the unpacked Chromium under
# PLAYWRIGHT_BROWSERS_PATH is owned correctly on creation.
USER pwuser
RUN ./packages/crawler-core/node_modules/.bin/playwright install chromium

COPY --chown=pwuser:pwuser . .

RUN pnpm turbo build --filter=@concert-crawl/crawler-core --filter=@concert-crawl/logger --filter=@concert-crawl/price-pipeline

CMD ["pnpm", "--filter", "@concert-crawl/crawler", "start"]

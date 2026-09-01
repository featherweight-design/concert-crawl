#!/usr/bin/env bash
# Verifies a built crawler image can actually run: correct ownership, and
# Chromium launching under the non-root user. The image builds fine with
# broken permissions — the failure only shows up at crawl time — so this
# has to exercise a real browser launch, not just inspect the filesystem.
#
# Usage: apps/crawler/scripts/verify-image.sh [image-tag]
set -euo pipefail

IMAGE="${1:-cc-crawler:verify}"

echo "==> Runs as non-root"
uid="$(docker run --rm "$IMAGE" id -u)"
if [ "$uid" = "0" ]; then
  echo "FAIL: container runs as root; Chromium's sandbox refuses to start as root" >&2
  exit 1
fi
echo "ok (uid=$uid)"

echo "==> No root-owned files under /app or the browsers path"
# The browsers path is read from the image rather than repeated here, so this
# keeps checking the right tree if the Dockerfile ever moves it. `-print -quit`
# stops at the first offender: a regression that mis-owns all of node_modules
# would otherwise pour six figures of paths into a shell variable. `find` is
# left unguarded so an inspection that could not run fails loudly instead of
# reading as "no strays".
stray="$(docker run --rm --user root "$IMAGE" \
  sh -c 'find /app "$PLAYWRIGHT_BROWSERS_PATH" ! -user pwuser -print -quit')"
if [ -n "$stray" ]; then
  echo "FAIL: files not owned by pwuser (the runtime cannot be relied on to read these):" >&2
  docker run --rm --user root "$IMAGE" \
    sh -c 'find /app "$PLAYWRIGHT_BROWSERS_PATH" ! -user pwuser -print | head -20' >&2 || true
  exit 1
fi
echo "ok"

echo "==> Chromium launches as pwuser"
docker run --rm "$IMAGE" node -e "
const { chromium } = require('/app/packages/crawler-core/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent('<h1 id=probe>ok</h1>');
  const text = await page.textContent('#probe');
  if (text !== 'ok') throw new Error('unexpected page content: ' + text);
  console.log('ok (chromium ' + browser.version() + ')');
  await browser.close();
})().catch((err) => {
  console.error('FAIL: ' + err.message);
  process.exit(1);
});
"

echo "==> Image verified"

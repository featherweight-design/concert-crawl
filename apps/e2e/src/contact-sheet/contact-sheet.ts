/*
 * The contact sheet: every route a feature touches, at every width and in
 * every theme the PR is checked in, laid out next to the handoff boards.
 *
 * Modelled on the-99's `scripts/contact-sheet.mjs`. NOT a probe: it asserts
 * nothing about the pixels. It loads each surface on STAGING, photographs it,
 * and lays the photographs out so a person sees in one glance that a route
 * never got the feature, or that the phone is wrong while the desktop is right
 * — the two failures a diff and a per-PR review structurally cannot show.
 *
 * It reports one thing mechanically, in its exit code: whether every cell was
 * REACHED. A row whose steps time out produces no evidence either way, and a
 * sheet with a hole in it that exits 0 would be the quiet pass this artifact
 * exists to prevent. `manual` rows are listed on the sheet as named holes and
 * never count as reached.
 *
 * One script for the repository, not one per feature: the feature supplies its
 * inventory as JSON (`docs/superpowers/inventories/<feature>.json`, schema in
 * `./inventory.ts`) and this walks it.
 *
 *   pnpm contact-sheet docs/superpowers/inventories/<feature>.json
 *
 * Environment (the operator's shell; nothing here reads a .env file):
 *   PLAYWRIGHT_AUDIT_BASE_URL  staging web origin (default https://staging.concertcrawl.app).
 *                              Production and loopback hosts are refused.
 *   E2E_AUDIT_USER_EMAIL / E2E_AUDIT_USER_PASSWORD    for `signed-in` rows
 *   E2E_AUDIT_ADMIN_EMAIL / E2E_AUDIT_ADMIN_PASSWORD  for `admin` rows
 *   THEMES   comma list of theme keys (default electric,light,pulse)
 *   WIDTHS   comma list of width labels (default every width the inventory has)
 *   ONLY     comma list of row ids, to re-shoot a few rows
 *   NEXT_PUBLIC_PUBLIC_BROWSE=true  runs `when: "public-browse"` rows
 *   ${ANY_VAR} named in an inventory string (an event id, a crew id) is
 *   expanded from the environment, so no inventory carries one account's ids.
 *
 * Writes `<out>/<theme>/<row>-<width>.png`, `<out>/sheet.html` and
 * `<out>/sheet.png`, under `apps/e2e/contact-sheets/` by default (ignored).
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
} from '@playwright/test';

import { assertNotProdBaseUrl } from '../audit/assert-not-prod.js';
import { waitForPageReady } from '../audit/page-ready.js';
import { signInWithClerk } from '../fixtures/auth.js';
import {
  DEFAULT_THEMES,
  DEFAULT_WIDTHS,
  inventorySchema,
  THEME_KEYS,
  type AuthState,
  type Inventory,
  type InventoryRow,
  type Step,
} from './inventory.js';

type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>;

/**
 * The app shell, which renders around every page in `(main)`: AppHeader's
 * `<header>` (mobile bar below `sm`, sticky TopNav from `sm`) and BottomNav's
 * `nav[aria-label="Main navigation"]` (below `sm` only). Unlike the-99, pages
 * here do not all render a `<main>` (Venues, the event page, Crews and mobile
 * Settings do not), so page scope is "anything outside the shell" rather than "inside
 * main". The shell comes first in document order and carries the same roles a
 * page does (its search button, its account trigger), so an unscoped query
 * would photograph the shell while naming the page.
 */
export const SHELL = 'header, nav[aria-label="Main navigation"]';
const NOT_IN_SHELL = ':not(header *):not(nav[aria-label="Main navigation"] *)';

const STEP_TIMEOUT = 15_000;
const LOOPBACK = /^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[::1\])$/;

function onPage(page: Page, selector: string): Locator {
  return page.locator(selector).and(page.locator(NOT_IN_SHELL));
}

function onPageRole(page: Page, role: string, name: RegExp): Locator {
  return page.getByRole(asRole(role), { name }).and(page.locator(NOT_IN_SHELL));
}

type AriaRole = Parameters<Page['getByRole']>[0];
const ROLES = new Set<string>([
  'button',
  'link',
  'tab',
  'menuitem',
  'option',
  'checkbox',
  'radio',
  'switch',
  'combobox',
  'textbox',
  'dialog',
  'heading',
]);
function isAriaRole(role: string): role is AriaRole {
  return ROLES.has(role);
}
function asRole(role: string): AriaRole {
  if (!isAriaRole(role)) {
    throw new Error(
      `unsupported role "${role}" (one of ${[...ROLES].join(', ')})`,
    );
  }
  return role;
}

/**
 * `${VAR}` from the environment, in every string a step takes. `forRegex`
 * escapes the substituted value, because `name` is regex source and a value
 * such as `+2 Mace` is not a valid pattern.
 */
function expand(value: string, where: string, forRegex = false): string {
  return value.replace(/\$\{(\w+)\}/g, (_match, name: string) => {
    const found = process.env[name];
    if (!found) throw new Error(`${where} needs ${name} in the environment`);
    return forRegex ? found.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : found;
  });
}

function findRepoRoot(start: string): string {
  let dir = start;
  for (;;) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir)
      throw new Error(`no pnpm-workspace.yaml above ${start}`);
    dir = parent;
  }
}

/** Relative to where the operator typed the command, then to the repo root. */
function resolveInput(arg: string, repoRoot: string): string {
  const candidates = [
    path.resolve(process.env['INIT_CWD'] ?? process.cwd(), arg),
    path.resolve(process.cwd(), arg),
    path.resolve(repoRoot, arg),
  ];
  const hit = candidates.find((candidate) => fs.existsSync(candidate));
  if (!hit) throw new Error(`inventory not found: ${arg}`);
  return hit;
}

function list(name: string): string[] | undefined {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return undefined;
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function credentialsFor(auth: AuthState): { email: string; password: string } {
  const prefix = auth === 'admin' ? 'E2E_AUDIT_ADMIN' : 'E2E_AUDIT_USER';
  const email = (process.env[`${prefix}_EMAIL`] ?? '').trim();
  const password = (process.env[`${prefix}_PASSWORD`] ?? '').trim();
  if (email === '' || password === '') {
    throw new Error(
      `${prefix}_EMAIL and ${prefix}_PASSWORD must both be set in the shell for ${auth} rows`,
    );
  }
  return { email, password };
}

/**
 * Signs in once per auth state and hands back the storage state, so every
 * width × theme context reuses one Clerk session rather than signing in a
 * dozen times against staging.
 */
async function signedInState(
  browser: Browser,
  base: string,
  auth: AuthState,
): Promise<StorageState> {
  const { email, password } = credentialsFor(auth);
  const context = await browser.newContext({ serviceWorkers: 'block' });
  try {
    const page = await context.newPage();
    await page.goto(`${base}/sign-in`, { waitUntil: 'domcontentloaded' });
    await signInWithClerk(page, email, password);
    return await context.storageState();
  } finally {
    await context.close();
  }
}

const SLOW = { ms: 6_000 };

/**
 * A row's steps, in a fixed order inside each step: network shaping (`mock`,
 * `hold`, `unhold`) before `goto` so the first request is answered too; then
 * `goto` and the readiness wait; then the presses; then the waits; then
 * `offline`, keys, `settle`, and scrolling LAST, because a scroll applied to a
 * still-streaming document is clamped and photographs the top while the label
 * claims the foot.
 */
async function runSteps(
  page: Page,
  base: string,
  steps: Step[],
): Promise<void> {
  for (const step of steps) {
    if (step.mock !== undefined) {
      const reply = {
        status: step.status ?? 200,
        contentType: 'application/json',
        body: JSON.stringify(step.json ?? null),
      };
      await page.unroute(step.mock);
      await page.route(step.mock, (route) => route.fulfill(reply));
    }
    if (step.hold !== undefined) {
      const ms = step.ms ?? SLOW.ms;
      await page.unroute(step.hold);
      await page.route(step.hold, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, ms));
        await route.fallback().catch(() => undefined);
      });
    }
    if (step.unhold !== undefined) await page.unroute(step.unhold);
    if (step.goto !== undefined) {
      await page.goto(`${base}${expand(step.goto, step.goto)}`, {
        waitUntil: 'domcontentloaded',
      });
      // The house readiness check (hydrated, no skeleton, images and fonts
      // in), so a sheet never photographs a loading state and calls it the
      // page. A row that IS a loading state opts out with `ready: false`.
      if (step.ready !== false) await waitForPageReady(page);
    }
    if (step.store !== undefined) {
      await page.evaluate((items) => {
        for (const [key, value] of Object.entries(items)) {
          window.localStorage.setItem(key, value);
        }
      }, step.store);
    }
    if (step.click !== undefined) {
      await onPage(page, step.click).first().click({ timeout: STEP_TIMEOUT });
    }
    if (step.clickRole !== undefined) {
      const name = new RegExp(
        expand(step.name ?? '', `clickRole ${step.clickRole}`, true),
      );
      await onPageRole(page, step.clickRole, name)
        .first()
        .click({ timeout: STEP_TIMEOUT });
    }
    // The account trigger is shell, not page: the header avatar from `sm`,
    // BottomNav's slot 5 below it. Both carry an `Account menu…` label, and
    // `:visible` picks the one with layout at this width.
    if (step.openAccount) {
      await page
        .locator('button[aria-label^="Account menu"]:visible')
        .first()
        .click({ timeout: STEP_TIMEOUT });
      await page
        .getByRole('dialog', { name: /^Account/ })
        .first()
        .waitFor({ state: 'visible', timeout: STEP_TIMEOUT });
    }
    // Search is shell too: AppHeader renders one `Search` button per bar.
    if (step.openSearch) {
      await page
        .locator('header button[aria-label="Search"]:visible')
        .first()
        .click({ timeout: STEP_TIMEOUT });
      await page
        .locator('[role="dialog"]:visible')
        .first()
        .waitFor({ state: 'visible', timeout: STEP_TIMEOUT });
    }
    // A press inside a named dialog (the account menu's Notifications row, a
    // sheet's button): scoped to that dialog, so another dialog can never
    // stand in for it.
    if (step.clickDialog !== undefined) {
      const { dialog, role = 'button', name } = step.clickDialog;
      await page
        .getByRole('dialog', { name: new RegExp(dialog) })
        .first()
        .getByRole(asRole(role), {
          name: new RegExp(expand(name, 'clickDialog', true)),
        })
        .first()
        .click({ timeout: STEP_TIMEOUT });
    }
    if (step.fill !== undefined) {
      await onPage(page, step.fill)
        .first()
        .fill(expand(step.text ?? '', `fill ${step.fill}`), {
          timeout: STEP_TIMEOUT,
        });
    }
    if (step.hover !== undefined) {
      await onPage(page, step.hover).first().hover({ timeout: STEP_TIMEOUT });
    }
    if (step.wait !== undefined) {
      await onPage(page, step.wait)
        .first()
        .waitFor({ state: 'visible', timeout: STEP_TIMEOUT });
    }
    // A sheet or popover portalled outside the page, named by its accessible
    // name (`Where filter`, `Jump to a date — …`) so the account menu, also a
    // `role="dialog"`, can never stand in for it. Regex source.
    if (step.waitDialog !== undefined) {
      await page
        .getByRole('dialog', { name: new RegExp(step.waitDialog) })
        .first()
        .waitFor({ state: 'visible', timeout: STEP_TIMEOUT });
    }
    if (step.offline !== undefined)
      await page.context().setOffline(step.offline);
    if (step.pressKey !== undefined) await page.keyboard.press(step.pressKey);
    if (step.back) await page.goBack();
    if (step.settle !== undefined) await page.waitForTimeout(step.settle);
    if (step.scrollTo !== undefined) {
      const target = onPage(page, step.scrollTo).first();
      await target.waitFor({ state: 'attached', timeout: STEP_TIMEOUT });
      await target.evaluate((node) => node.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(250);
    }
    if (typeof step.scroll === 'number') {
      await page.evaluate((y) => window.scrollTo(0, y), step.scroll);
    }
    if (step.scroll === 'bottom') {
      await page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight);
        for (const node of Array.from(document.querySelectorAll('body *'))) {
          const style = getComputedStyle(node);
          const scrolls =
            style.overflowY === 'auto' || style.overflowY === 'scroll';
          if (scrolls && node.scrollHeight - node.clientHeight > 1) {
            node.scrollTop = node.scrollHeight;
          }
        }
      });
      await page.waitForTimeout(250);
    }
  }
}

interface Shot {
  rowId: string;
  theme: string;
  width: string;
  file: string | null;
  note: string;
  drawnTheme: string | null;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sheetHtml(
  inventory: Inventory,
  rows: InventoryRow[],
  shots: Shot[],
  outDir: string,
  boardsDir: string,
  base: string,
): string {
  const rel = (file: string) =>
    path.relative(outDir, file).split(path.sep).join('/');
  const sections = rows
    .map((row) => {
      const auth = row.auth ?? inventory.auth;
      const boards = (row.boards ?? [])
        .map((board) => {
          const file = path.join(boardsDir, board);
          return fs.existsSync(file)
            ? `<figure class="board"><img src="${escapeHtml(rel(file))}" /><figcaption>board · ${escapeHtml(board)}</figcaption></figure>`
            : `<figure class="board"><div class="missing">board not found</div><figcaption><b>${escapeHtml(board)}</b></figcaption></figure>`;
        })
        .join('');
      const cells = shots
        .filter((shot) => shot.rowId === row.id)
        .map((shot) => {
          const img = shot.file
            ? `<img src="${escapeHtml(rel(shot.file))}" />`
            : `<div class="missing">${row.when === 'manual' ? 'manual: walk on staging' : 'no screenshot'}</div>`;
          const drawn =
            shot.drawnTheme && shot.drawnTheme !== shot.theme
              ? ` (drew ${escapeHtml(shot.drawnTheme)})`
              : '';
          return `<figure class="cell w-${escapeHtml(shot.width)}">${img}<figcaption>${escapeHtml(shot.theme)}${drawn} · ${escapeHtml(shot.width)}${shot.note ? ` <b>— ${escapeHtml(shot.note)}</b>` : ''}</figcaption></figure>`;
        })
        .join('');
      return `<section>
  <h2>${escapeHtml(row.label)}</h2>
  <p class="meta"><code>${escapeHtml(row.route)}</code> · ${escapeHtml(auth)}${row.when ? ` · ${escapeHtml(row.when)}` : ''}${row.note ? ` · ${escapeHtml(row.note)}` : ''}</p>
  <div class="grid">${boards}${cells}</div>
</section>`;
    })
    .join('\n');
  return `<!doctype html>
<html><head><meta charset="utf-8" /><title>${escapeHtml(inventory.planRow)} contact sheet</title>
<style>
  body { background: #0b0d18; color: #e8e9f2; font: 13px/1.4 ui-sans-serif, system-ui; margin: 0; padding: 20px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  h2 { font-size: 14px; margin: 24px 0 2px; }
  .meta { color: #9aa0b8; margin: 0 0 10px; }
  .grid { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; }
  figure { margin: 0; }
  .cell { width: 300px; } .cell.w-desktop { width: 520px; } .cell.w-sm { width: 360px; } .cell.w-floor { width: 250px; }
  .board { width: 300px; outline: 2px solid #6e7bff; outline-offset: 2px; }
  img { width: 100%; border: 1px solid #2a2f45; display: block; }
  figcaption { padding-top: 6px; color: #9aa0b8; }
  .missing { height: 180px; display: grid; place-items: center; border: 1px dashed #4a5070; color: #6c7290; }
  b { color: #ff8f8f; }
</style></head>
<body>
<h1>${escapeHtml(inventory.planRow)}: ${escapeHtml(inventory.feature)}</h1>
<p class="meta">${escapeHtml(base)} · ${new Date().toISOString()} · boards outlined in blue</p>
${sections}
</body></html>`;
}

async function main(): Promise<void> {
  const arg = process.argv.slice(2).find((part) => part !== '--');
  if (!arg) throw new Error('Pass the inventory JSON path.');

  const repoRoot = findRepoRoot(process.cwd());
  const inventoryPath = resolveInput(arg, repoRoot);
  const parsed = inventorySchema.safeParse(
    JSON.parse(fs.readFileSync(inventoryPath, 'utf8')),
  );
  if (!parsed.success) {
    console.error(`${inventoryPath} is not a valid inventory:`);
    for (const issue of parsed.error.issues) {
      console.error(`  ${issue.path.join('.') || '(root)'}: ${issue.message}`);
    }
    process.exit(1);
  }
  const inventory = parsed.data;

  // STAGING ONLY. Production is refused by the audit's own guard, and a
  // loopback host is refused here: a local build is not what Hugh walks, and a
  // sheet of it proves nothing about the deploy.
  const base = (
    process.env['PLAYWRIGHT_AUDIT_BASE_URL'] ??
    'https://staging.concertcrawl.app'
  ).replace(/\/$/, '');
  assertNotProdBaseUrl(base);
  if (LOOPBACK.test(new URL(base).hostname)) {
    throw new Error(
      `refusing ${base}: the contact sheet walks staging, never a local build`,
    );
  }

  const themeFilter = list('THEMES');
  const unknownTheme = themeFilter?.find(
    (theme) => !THEME_KEYS.some((key) => key === theme),
  );
  if (unknownTheme) throw new Error(`THEMES: unknown theme "${unknownTheme}"`);
  const themes = themeFilter ?? inventory.themes ?? [...DEFAULT_THEMES];
  const widthFilter = list('WIDTHS');
  const widths = (inventory.widths ?? [...DEFAULT_WIDTHS]).filter(
    (width) => !widthFilter || widthFilter.includes(width.label),
  );
  const only = list('ONLY');
  const publicBrowse = process.env['NEXT_PUBLIC_PUBLIC_BROWSE'] === 'true';
  const rows = inventory.rows.filter((row) => !only || only.includes(row.id));

  const outDir = path.resolve(
    process.cwd(),
    inventory.out ??
      path.join('contact-sheets', path.basename(inventoryPath, '.json')),
  );
  fs.mkdirSync(outDir, { recursive: true });
  const boardsDir = path.resolve(repoRoot, inventory.boardsDir);

  const shots: Shot[] = [];
  const browser = await chromium.launch();
  try {
    const states = new Map<AuthState, StorageState | undefined>();
    const runnable = rows.filter(
      (row) =>
        row.when !== 'manual' && (row.when !== 'public-browse' || publicBrowse),
    );
    for (const auth of new Set(
      runnable.map((row) => row.auth ?? inventory.auth),
    )) {
      states.set(
        auth,
        auth === 'signed-out'
          ? undefined
          : await signedInState(browser, base, auth),
      );
    }

    for (const row of rows) {
      if (row.when === 'manual') {
        for (const width of widths) {
          shots.push({
            rowId: row.id,
            theme: '—',
            width: width.label,
            file: null,
            note: '',
            drawnTheme: null,
          });
        }
        console.log(`· ${row.id} — manual: walk it on staging`);
      }
    }

    // `theme: "account"` rows are walked once, outside the theme loop.
    const passes: string[] = [...themes, 'account'];
    for (const theme of passes) {
      const passRows = runnable.filter(
        (row) => (theme === 'account') === (row.theme === 'account'),
      );
      if (passRows.length === 0) continue;
      const themeDir = path.join(outDir, theme);
      fs.mkdirSync(themeDir, { recursive: true });

      for (const width of widths) {
        for (const auth of new Set(
          passRows.map((row) => row.auth ?? inventory.auth),
        )) {
          const storageState = states.get(auth);
          const context = await browser.newContext({
            viewport: { width: width.width, height: width.height },
            deviceScaleFactor: 1,
            reducedMotion: inventory.motion,
            // The PWA service worker answers fetches itself, so a `page.route`
            // mock never fires and the row photographs the real server while
            // reading as mocked. Blocked for every context, mocked or not.
            serviceWorkers: 'block',
            ...(storageState !== undefined ? { storageState } : {}),
          });
          // The theme lives in localStorage `cc-theme`, read by the inline
          // script in `app/layout.tsx` before first paint. Set before any of
          // the page's own scripts run, on every document.
          if (theme !== 'account') {
            await context.addInitScript((key) => {
              try {
                window.localStorage.setItem('cc-theme', key);
              } catch {
                // Storage blocked: the read-back below fails the cell.
              }
            }, theme);
          }
          const page = await context.newPage();
          for (const row of passRows) {
            if ((row.auth ?? inventory.auth) !== auth) continue;
            if (row.widths && !row.widths.includes(width.label)) {
              console.log(
                `· ${row.id} · ${width.label} — not drawn at this width`,
              );
              continue;
            }
            const file = path.join(themeDir, `${row.id}-${width.label}.png`);
            let note = '';
            let drawnTheme: string | null = null;
            try {
              await runSteps(page, base, row.steps);
              drawnTheme = await page.evaluate(() =>
                document.documentElement.getAttribute('data-theme'),
              );
              // An unknown key falls back to the system theme, and `/me`
              // re-applies the account's saved theme: either way the folder
              // name would lie about what was photographed.
              if (theme !== 'account' && drawnTheme !== theme) {
                throw new Error(
                  `asked for ${theme}, the page drew data-theme="${drawnTheme}"`,
                );
              }
              await page.screenshot({
                path: file,
                fullPage: row.fullPage ?? inventory.fullPage ?? false,
              });
            } catch (err) {
              note = String(err).split('\n')[0]?.slice(0, 140) ?? 'failed';
              await page.screenshot({ path: file }).catch(() => undefined);
            }
            await context.setOffline(false);
            await page.unrouteAll({ behavior: 'ignoreErrors' });
            shots.push({
              rowId: row.id,
              theme,
              width: width.label,
              file: fs.existsSync(file) ? file : null,
              note,
              drawnTheme,
            });
            console.log(
              `${note ? '✗' : '✓'} ${row.id} · ${theme} · ${width.label}${note ? ` — ${note}` : ''}`,
            );
          }
          await context.close();
        }
      }
    }

    for (const row of rows) {
      if (row.when === 'public-browse' && !publicBrowse) {
        console.log(
          `· ${row.id} — skipped: public browse is off (NEXT_PUBLIC_PUBLIC_BROWSE)`,
        );
      }
    }

    const html = sheetHtml(inventory, rows, shots, outDir, boardsDir, base);
    const sheetFile = path.join(outDir, 'sheet.html');
    fs.writeFileSync(sheetFile, html);
    const sheetContext = await browser.newContext({
      viewport: { width: 1800, height: 1200 },
    });
    const sheetPage = await sheetContext.newPage();
    // Loaded from file:// so the relative image paths resolve without
    // inlining every PNG as base64.
    await sheetPage.goto(pathToFileURL(sheetFile).href, { waitUntil: 'load' });
    await sheetPage.screenshot({
      path: path.join(outDir, 'sheet.png'),
      fullPage: true,
    });
    await sheetContext.close();
    console.log(
      `\nsheet: ${sheetFile}\n       ${path.join(outDir, 'sheet.png')}`,
    );

    // THE BACKSTOP. A run that photographed nothing is a silent success
    // whatever caused it.
    const reached = shots.filter((shot) => shot.file && !shot.note);
    if (reached.length === 0) {
      console.log(
        '\nNOTHING WAS PHOTOGRAPHED. A sheet with no cells is not coverage.',
      );
      process.exitCode = 1;
    }
    const failed = shots.filter((shot) => shot.note);
    if (failed.length > 0) {
      console.log(
        `\n${failed.length} of ${shots.length} cells did not reach their surface. The sheet is still written; those cells hold no evidence.`,
      );
      process.exitCode = 1;
    }
    const manual = rows.filter((row) => row.when === 'manual');
    if (manual.length > 0) {
      console.log(
        `\n${manual.length} manual row(s) to walk on staging: ${manual.map((row) => row.id).join(', ')}`,
      );
    }
  } finally {
    await browser.close();
  }
}

main().catch((err: unknown) => {
  console.error('[contact-sheet]', err);
  process.exit(1);
});

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Drift guard for the page scroll lock: every component that renders an
// aria-modal surface or a full-viewport scrim must hold useBodyScrollLock,
// directly or through a hook or primitive that does. A new sheet written
// without it would let the page scroll behind it again.

const SRC = resolve(__dirname, '../..');

// Hooks that take the lock themselves.
const LOCKING_HOOKS = [
  'useBodyScrollLock(',
  'useModalDialog(',
  'useDialogKeyboard(',
];

// Components that take the lock themselves, so rendering one covers the
// file. `<Dialog.Root` is Base UI's dialog, which is modal by default and
// locks page scroll itself.
const LOCKING_COMPONENTS = [
  '<ModalShell',
  '<BottomSheet',
  '<CCOverlay',
  '<AdminDialog',
  '<AdminSheet',
  '<SidePanel',
  '<JumpPicker',
  '<Dialog.Root',
];

// Files that match the patterns but must NOT lock, each with its reason.
const EXEMPT: Record<string, string> = {
  // The cold-start splash: pointer-events pass through to the page and it
  // never holds the app, so locking would freeze a page the user can touch.
  'components/pwa/LaunchAnimation.tsx': 'pass-through splash, not modal',
  // The vendor picker's phone sheet renders inside ModalShell, the single
  // modal root, which already holds the lock (see the comment at the sheet).
  'components/consumer/submit-price/VendorField.tsx':
    'nested inside ModalShell, which locks',
};

const MODAL = /aria-modal(="true"|=\{true\})/;
const SCRIM_CLASS = /className="[^"]*\bfixed\b[^"]*\binset-0\b[^"]*"/;
const SCRIM_CSS = /position:\s*fixed;\s*inset:\s*0/;
const SCRIM_STYLE_POSITION = /position:\s*'fixed'/;
const SCRIM_STYLE_INSET = /\binset:\s*0\b/;

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return path.endsWith('.tsx') && !/\.test\.tsx$/.test(path) ? [path] : [];
  });

const candidates = walk(SRC)
  .map((path) => ({
    file: relative(SRC, path).split('\\').join('/'),
    source: readFileSync(path, 'utf8'),
  }))
  .filter(
    ({ source }) =>
      MODAL.test(source) ||
      SCRIM_CLASS.test(source) ||
      SCRIM_CSS.test(source) ||
      (SCRIM_STYLE_POSITION.test(source) && SCRIM_STYLE_INSET.test(source)),
  );

const locks = (source: string): boolean =>
  LOCKING_HOOKS.some((hook) => source.includes(hook)) ||
  LOCKING_COMPONENTS.some((tag) => source.includes(tag));

describe('page scroll lock coverage', () => {
  it('finds the surfaces it is meant to guard', () => {
    // A broken pattern would pass the next test vacuously.
    const files = candidates.map(({ file }) => file);
    expect(files).toContain('components/consumer/modal-shell/ModalShell.tsx');
    expect(files).toContain('components/consumer/user-menu/UserMenu.tsx');
    expect(files).toContain('components/admin/primitives/AdminDialog.tsx');
  });

  it('locks page scroll behind every aria-modal surface and full-viewport scrim', () => {
    const unlocked = candidates
      .filter(({ file }) => !(file in EXEMPT))
      .filter(({ source }) => !locks(source))
      .map(({ file }) => file);
    expect(unlocked).toEqual([]);
  });

  it('keeps no stale exemptions', () => {
    const found = new Set(candidates.map(({ file }) => file));
    expect(Object.keys(EXEMPT).filter((file) => !found.has(file))).toEqual([]);
  });

  it('mounts the navigation scroll reset exactly once', () => {
    const mounts = walk(SRC).filter((path) =>
      readFileSync(path, 'utf8').includes('<ScrollResetOnNavigate'),
    );
    expect(mounts.map((path) => relative(SRC, path))).toEqual([
      join('app', '(protected)', 'layout.tsx'),
    ]);
  });
});

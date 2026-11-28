import fs from 'fs';
import path from 'path';

/**
 * Parses the text of a dotenv-style file. Deliberately literal, because the
 * values are passwords: a `#`, `@`, `$` or `=` inside a value is part of it.
 *
 * - blank lines and lines starting with `#` are skipped;
 * - a line splits on its first `=` only;
 * - the value is the rest of the line: no inline comments, no `$` expansion,
 *   outer whitespace trimmed, then one matching pair of surrounding single or
 *   double quotes removed.
 */
export function parseEnvLocal(text: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    const first = value[0];
    if (
      value.length >= 2 &&
      (first === "'" || first === '"') &&
      value.endsWith(first)
    ) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

/**
 * Loads the gitignored `apps/e2e/.env.local` into `process.env` so the sign-in
 * helpers find the `E2E_AUDIT_*` credentials without a shell profile.
 *
 * Real environment values win: a variable that is already set is never
 * overridden, so CI and an exported shell are unchanged. A missing file is a
 * no-op. Nothing is returned and nothing is printed.
 *
 * Relative to `root` (the working directory by default), because this module
 * is loaded as both ESM (the contact-sheet hook) and CJS (Playwright), where
 * `import.meta` and `__dirname` are not both available. Run from the repo root
 * or `apps/e2e`.
 */
export function loadE2eEnvLocal(root: string = process.cwd()): void {
  const file = [
    path.resolve(root, 'apps/e2e/.env.local'),
    path.resolve(root, '.env.local'),
  ].find((candidate) => fs.existsSync(candidate));
  if (file === undefined) return;
  const parsed = parseEnvLocal(fs.readFileSync(file, 'utf8'));
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

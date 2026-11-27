import fs from 'fs';
import path from 'path';

/**
 * Loads the gitignored `apps/e2e/.env.local` into `process.env` so the sign-in
 * helpers find the `E2E_AUDIT_*` credentials without a shell profile.
 *
 * Real environment values win: `process.loadEnvFile` never overrides a variable
 * that is already set, so CI and an exported shell are unchanged. A missing
 * file is a no-op. Values must be single-quoted: an unquoted `#` starts a
 * comment and cuts the value short. Nothing is returned and nothing is printed.
 *
 * Relative to the working directory, because this module is loaded as both ESM
 * (the contact-sheet hook) and CJS (Playwright), where `import.meta` and
 * `__dirname` are not both available. Run from the repo root or `apps/e2e`.
 */
export function loadE2eEnvLocal(): void {
  const candidates = [
    path.resolve('apps/e2e/.env.local'),
    path.resolve('.env.local'),
  ];
  const file = candidates.find((candidate) => fs.existsSync(candidate));
  if (file !== undefined) process.loadEnvFile(file);
}

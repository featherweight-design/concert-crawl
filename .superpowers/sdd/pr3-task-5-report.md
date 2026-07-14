### PR 3 — Task 5 Report: Wiring — pnpm script, gitignore, auth-state prep

**Status:** DONE — commit 63b51305

---

#### What shipped

**`apps/e2e/src/fixtures/auth.ts` — refactored**

- Extracted `loginAndSave(email, password, outputPath, baseURL): Promise<void>` as a named export.
- Throws `'loginAndSave: email required'` / `'loginAndSave: password required'` when either arg is empty (before any browser is launched).
- `loginAndSave` manages its own browser lifecycle (launch + close), matching the existing inline pattern.
- `globalSetup` now delegates to `loginAndSave` when creds are present; the "creds-missing → warn + write empty storageState + return" contract is preserved exactly.

**`apps/e2e/src/audit/audit-auth.ts` — new**

- `prepareAuditAuth(role: 'user' | 'admin'): Promise<void>`
- Reads `E2E_AUDIT_USER_EMAIL` / `E2E_AUDIT_USER_PASSWORD` (user) or `E2E_AUDIT_ADMIN_EMAIL` / `E2E_AUDIT_ADMIN_PASSWORD` (admin).
- Base URL from `PLAYWRIGHT_AUDIT_BASE_URL`, defaulting to `https://staging.concertcrawl.app`.
- Output: `.auth/audit-user.json` or `.auth/audit-admin.json`.
- Throws with a clear message naming both required vars if either is missing.

**`apps/e2e/src/audit/sweep.ts` — updated**

- Before the route loop, collects the set of roles needed by the filtered manifest.
- Calls `prepareAuditAuth(role)` for each; failures push `{kind: 'auth', message}` to `errors` and add the role to `skippedRoles`.
- Routes whose `auth` matches a skipped role are `continue`d over.

**`apps/e2e/package.json` — updated**

- Added `"audit": "tsx src/audit/sweep.ts"` script.
- `tsx` is at workspace root (`^4.23.1`); no new devDep needed at the `e2e` level.

**`apps/e2e/.gitignore` — updated**

- Added `audit-output/*`, `!audit-output/.gitkeep`, `.auth/audit-*.json`.

**`apps/e2e/audit-output/.gitkeep` — new**

- Empty file to make the `audit-output/` directory exist in git.

---

#### Tests

| File                           | Tests | Notes                                                                                                                                               |
| ------------------------------ | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/audit/auth.test.ts`       | 2     | Validates `loginAndSave` throws on empty email and empty password without launching a browser                                                       |
| `src/audit/audit-auth.test.ts` | 7     | Missing-email and missing-password throws for both roles; correct `loginAndSave` call args for user and admin; `PLAYWRIGHT_AUDIT_BASE_URL` override |

Total: 30 tests passed (was 21). Typecheck: clean across all 16 workspace packages.

---

#### Smoke test

Skipped (requires live staging credentials). Hugh to run manually after PR 3 lands:

```bash
PLAYWRIGHT_AUDIT_BASE_URL=https://staging.concertcrawl.app \
  E2E_AUDIT_ADMIN_EMAIL=... \
  E2E_AUDIT_ADMIN_PASSWORD=... \
  pnpm --filter e2e audit -- --tags=admin
```

Confirm PNG + JSON artifacts land under `apps/e2e/audit-output/<run-id>/`.

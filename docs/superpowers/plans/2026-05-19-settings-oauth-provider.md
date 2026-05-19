# Settings — OAuth Provider Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display connected OAuth provider(s) in the Account section of Settings, and add a Clerk attribution footnote with a privacy policy link.

**Architecture:** Pure frontend change. `AccountManagementRow` already uses `useUser()` from Clerk; we extend it to read `user.externalAccounts` and render one row per provider. No API or DB changes needed.

**Tech Stack:** React, Clerk `useUser()`, Tailwind

**Spec:** `docs/superpowers/specs/2026-05-19-venues-and-oauth-settings-design.md` (Branch B section)

**Worktree:** `.worktrees/feat/settings-oauth` on branch `feat/settings-oauth`

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `apps/web/src/components/settings/AccountManagementRow.tsx` | Modify | Add connected account rows + Clerk footnote |
| `apps/web/src/components/settings/AccountManagementRow.test.tsx` | Create | Tests for OAuth row rendering |

---

## Task 1: Add connected account rows and Clerk footnote

**Files:**
- Modify: `apps/web/src/components/settings/AccountManagementRow.tsx`
- Create: `apps/web/src/components/settings/AccountManagementRow.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `apps/web/src/components/settings/AccountManagementRow.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { AccountManagementRow } from './AccountManagementRow'

const mockUseClerk = vi.fn(() => ({ openUserProfile: vi.fn() }))
const mockUseUser = vi.fn()

vi.mock('@clerk/nextjs', () => ({
  useClerk: () => mockUseClerk(),
  useUser: () => mockUseUser(),
}))

describe('AccountManagementRow', () => {
  it('shows email row', () => {
    mockUseUser.mockReturnValue({ user: { passwordEnabled: false, externalAccounts: [] } })
    render(<AccountManagementRow email="test@example.com" />)
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('shows no connected accounts section when externalAccounts is empty', () => {
    mockUseUser.mockReturnValue({ user: { passwordEnabled: false, externalAccounts: [] } })
    render(<AccountManagementRow email="test@example.com" />)
    expect(screen.queryByText('Connected Account')).not.toBeInTheDocument()
  })

  it('shows connected account row for oauth_google', () => {
    mockUseUser.mockReturnValue({
      user: {
        passwordEnabled: false,
        externalAccounts: [{ provider: 'oauth_google' }],
      },
    })
    render(<AccountManagementRow email="test@example.com" />)
    expect(screen.getByText('Connected Account')).toBeInTheDocument()
    expect(screen.getByText('Google')).toBeInTheDocument()
  })

  it('shows connected account row for oauth_spotify', () => {
    mockUseUser.mockReturnValue({
      user: {
        passwordEnabled: false,
        externalAccounts: [{ provider: 'oauth_spotify' }],
      },
    })
    render(<AccountManagementRow email="test@example.com" />)
    expect(screen.getByText('Spotify')).toBeInTheDocument()
  })

  it('shows multiple connected accounts', () => {
    mockUseUser.mockReturnValue({
      user: {
        passwordEnabled: false,
        externalAccounts: [
          { provider: 'oauth_google' },
          { provider: 'oauth_spotify' },
        ],
      },
    })
    render(<AccountManagementRow email="test@example.com" />)
    expect(screen.getByText('Google')).toBeInTheDocument()
    expect(screen.getByText('Spotify')).toBeInTheDocument()
  })

  it('renders Clerk privacy footnote', () => {
    mockUseUser.mockReturnValue({ user: { passwordEnabled: false, externalAccounts: [] } })
    render(<AccountManagementRow email="test@example.com" />)
    expect(screen.getByRole('link', { name: /privacy policy/i })).toBeInTheDocument()
  })

  it('still shows password row when passwordEnabled is true', () => {
    mockUseUser.mockReturnValue({ user: { passwordEnabled: true, externalAccounts: [] } })
    render(<AccountManagementRow email="test@example.com" />)
    expect(screen.getByText(/password/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @concert-crawl/web test -- AccountManagementRow
```

Expected: FAIL — connected account rows and privacy footnote don't exist yet.

- [ ] **Step 3: Add a provider display name helper**

This helper strips the `oauth_` prefix and title-cases the result. It lives at the top of `AccountManagementRow.tsx`, before the component:

```ts
function providerDisplayName(provider: string): string {
  return provider
    .replace(/^oauth_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}
```

- [ ] **Step 4: Update AccountManagementRow**

Replace the full content of `apps/web/src/components/settings/AccountManagementRow.tsx` with:

```tsx
'use client'

import { useClerk, useUser } from '@clerk/nextjs'
import { SETTINGS_COPY } from './definitions/copy'

interface AccountManagementRowProps {
  email: string
}

function providerDisplayName(provider: string): string {
  return provider
    .replace(/^oauth_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function AccountManagementRow({ email }: AccountManagementRowProps) {
  const { openUserProfile } = useClerk()
  const { user } = useUser()

  return (
    <div className="flex flex-col gap-1.5">
      <div className="overflow-hidden rounded-xl border border-border bg-surface-1">
        {/* Email row */}
        <div className="flex items-center gap-3 px-4 py-3.5">
          <svg
            width="15"
            height="15"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
            className="shrink-0 text-fg-muted"
          >
            <rect x="2.5" y="3.5" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M3 5l5 4 5-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="flex-1 text-[14px] font-medium text-fg">
            {SETTINGS_COPY.emailRow}
          </span>
          <span className="truncate text-[13px] text-fg-muted">{email}</span>
        </div>

        {/* Connected account rows */}
        {user?.externalAccounts?.map((account) => (
          <div key={account.provider}>
            <div className="mx-4 h-px bg-border" />
            <div className="flex items-center gap-3 px-4 py-3.5">
              <svg
                width="15"
                height="15"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden
                className="shrink-0 text-fg-muted"
              >
                <circle cx="4" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="12" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M6.5 7l3-2M6.5 9l3 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <span className="flex-1 text-[14px] font-medium text-fg">
                {SETTINGS_COPY.connectedAccountRow}
              </span>
              <span className="truncate text-[13px] text-fg-muted">
                {providerDisplayName(account.provider)}
              </span>
            </div>
          </div>
        ))}

        {/* Password row — only shown for email/password accounts */}
        {user?.passwordEnabled && (
          <>
            <div className="mx-4 h-px bg-border" />
            <div className="flex items-center gap-3 px-4 py-3.5">
              <svg
                width="15"
                height="15"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden
                className="shrink-0 text-fg-muted"
              >
                <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M5.5 7V5.5a2.5 2.5 0 015 0V7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <span className="flex-1 text-[14px] font-medium text-fg">
                {SETTINGS_COPY.passwordRow}
              </span>
              <button
                type="button"
                onClick={() => openUserProfile()}
                className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-bold uppercase tracking-[0.06em] text-fg-subtle transition-colors hover:text-fg-muted"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Manage →
              </button>
            </div>
          </>
        )}
      </div>

      {/* Clerk attribution */}
      <p
        className="text-fg-subtle"
        style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.04em' }}
      >
        Sign-in credentials and connected accounts are managed by Clerk.{' '}
        <a
          href="https://clerk.com/legal/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-signal hover:underline"
        >
          Privacy Policy →
        </a>
      </p>
    </div>
  )
}
```

- [ ] **Step 5: Add connectedAccountRow to settings copy**

Open `apps/web/src/components/settings/definitions/copy.ts`. Add to `SETTINGS_COPY`:

```ts
connectedAccountRow: 'Connected Account',
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
pnpm --filter @concert-crawl/web test -- AccountManagementRow
```

Expected: all PASS.

- [ ] **Step 7: Typecheck**

```bash
pnpm --filter @concert-crawl/web typecheck
```

Expected: no errors. If Clerk's `externalAccounts` type needs a check, use a type guard: `if (!user?.externalAccounts) return null` rather than casting.

- [ ] **Step 8: Verify Clerk privacy URL**

Confirm `https://clerk.com/legal/privacy` resolves to a valid page. If the URL has changed, update it in `AccountManagementRow.tsx` before committing.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/components/settings/AccountManagementRow.tsx \
        apps/web/src/components/settings/AccountManagementRow.test.tsx \
        apps/web/src/components/settings/definitions/copy.ts
git commit -m "feat(settings): show connected OAuth providers with Clerk attribution (#400)"
```

---

## Task 2: Run full checks and verify

- [ ] **Step 1: Run all checks**

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Expected: all pass.

- [ ] **Step 2: Smoke-test manually**

```bash
pnpm dev
```

Sign in with an OAuth account (Google/Spotify) and check `/me`:
- Connected Account row appears below the email row showing the provider name
- Password row is absent (OAuth users don't have one)
- Clerk footnote with "Privacy Policy →" link appears below the card

Sign in with email/password and check `/me`:
- No Connected Account row
- Password row and Manage button still present
- Footnote still appears

- [ ] **Step 3: Update progress doc**

Open `docs/superpowers/progress.md` and add a row for this PR.

- [ ] **Step 4: Push and open PR**

```bash
git push -u origin feat/settings-oauth
gh pr create --title "feat(settings): display connected OAuth provider (#400)" \
  --body "$(cat .github/pull_request_template.md)"
```

Fill in the PR template referencing `Closes #400`.

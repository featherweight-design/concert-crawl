# Settings v2 Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the profile/settings pages (desktop and mobile) with the v2 design spec across all panels.

**Architecture:** All changes are in `apps/web/src/components/settings/` and `apps/web/src/components/consumer/bottom-nav/`. No new routes, API changes, or DB migrations needed. The worktree is at `/Users/huey/Projects/concert-crawl/.worktrees/fix/settings-v2-polish`.

**Tech Stack:** Next.js 14 App Router, React, Tailwind CSS, CSS custom properties (var(--\*) tokens)

**Issues closed:** #214, #215, #216, #217, #218, #219, #220, #221, #222, #223, #224

---

### Task 1: Desktop topbar (issue #214)

**Files:**

- Modify: `apps/web/src/components/settings/SettingsRouteDesktop.tsx`

- [ ] Add a sticky topbar above the sidebar+panel layout with concertcrawl logo on left and `← Back to browse` link on right

```tsx
// Add at the top of the returned JSX, before the flex div:
<header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-bg-elevated px-6">
  <span className="font-['Caveat'] text-[22px] font-bold tracking-tight text-fg">
    concert<span style={{ color: 'var(--signal)' }}>crawl</span>
    <span style={{ color: 'var(--accent)' }}>.</span>
  </span>
  <Link
    href="/events"
    className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-fg-muted transition-colors hover:text-fg"
    style={{ fontFamily: 'var(--font-mono)' }}
  >
    ← Back to browse
  </Link>
</header>
```

- [ ] Wrap the whole return in a `<div className="flex flex-col min-h-screen">` so the topbar + flex body stack vertically. Remove `min-h-screen` from the inner flex div.

- [ ] Import `Link` from `next/link` if not already imported

- [ ] Commit: `fix(settings): add desktop topbar with logo and back-to-browse link`

---

### Task 2: Desktop sidebar — user profile card + icons (issue #215)

**Files:**

- Modify: `apps/web/src/components/settings/SettingsRouteDesktop.tsx`

Nav icons (inline SVG, 16×16):

```tsx
const NAV_ICONS: Record<NavSection, React.ReactNode> = {
  profile: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M2.5 14c0-3 2.5-4.5 5.5-4.5s5.5 1.5 5.5 4.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  ),
  plan: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect
        x="2"
        y="3"
        width="12"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M5 7h6M5 10h4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  ),
  submissions: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 4h10M3 8h10M3 12h6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  ),
  appearance: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  account: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect
        x="3"
        y="7"
        width="10"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M5.5 7V5.5a2.5 2.5 0 015 0V7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  ),
  danger: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M6.5 2.5L2 13.5h12L9.5 2.5a1.5 1.5 0 00-3 0z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M8 6.5v3M8 11.5v.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  ),
}
```

- [ ] Add `NAV_ICONS` constant above the component

- [ ] Add user profile mini-card at top of sidebar (before nav items):

```tsx
{
  /* Sidebar user card */
}
;<div
  className="mb-4 flex items-center gap-2.5 rounded-xl px-3 py-2.5"
  style={{ background: 'var(--surface-1)' }}
>
  <Avatar handle={profile.handle} avatarColor={profile.avatarColor} size={36} />
  <div className="flex min-w-0 flex-col gap-0.5">
    <span className="truncate text-[13px] font-bold text-fg">
      {profile.handle ? `@${profile.handle}` : 'anonymous fan'}
    </span>
    <span
      className="text-[10px] text-fg-muted"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {profile.city || '—'} · joined {profile.joined}
    </span>
    <CredChip cred={profile.cred} size="sm" />
  </div>
</div>
```

- [ ] Update nav button render to include icon:

```tsx
<button
  key={key}
  type="button"
  onClick={() => setActiveSection(key)}
  className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
  style={{
    background: activeSection === key ? 'var(--surface-2)' : 'transparent',
    color:
      key === 'danger'
        ? activeSection === key
          ? 'var(--danger)'
          : 'var(--danger)'
        : activeSection === key
          ? 'var(--fg)'
          : 'var(--fg-muted)',
    fontWeight: activeSection === key ? 700 : 500,
  }}
>
  {NAV_ICONS[key]}
  {label}
</button>
```

- [ ] Import `Avatar` and `CredChip` at top of file

- [ ] Commit: `fix(settings): add icons and user profile card to desktop sidebar`

---

### Task 3: Desktop profile panel — title, subtitle, edit button, anonymous state (issues #216, #224)

**Files:**

- Modify: `apps/web/src/components/settings/SettingsRouteDesktop.tsx`

- [ ] Replace the profile panel section:

```tsx
{
  activeSection === 'profile' && (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-[22px] font-extrabold text-fg">Profile</h2>
        <p className="text-[13px] text-fg-muted">
          What other fans see when you submit a price.
        </p>
      </div>

      {/* Identity card */}
      <div className="flex items-start gap-3.5 rounded-2xl border border-border bg-surface-1 p-4">
        <Avatar
          handle={profile.handle}
          avatarColor={profile.avatarColor}
          size={56}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[20px] font-black tracking-[-0.02em] text-fg">
            {profile.handle ? (
              <>
                <span className="text-fg-muted font-bold">@</span>
                {profile.handle}
              </>
            ) : (
              'anonymous fan'
            )}
          </span>
          <span
            className="text-[11px] font-semibold text-fg-muted"
            style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}
          >
            {profile.city || '—'} · joined {profile.joined}
          </span>
          <CredChip cred={profile.cred} size="sm" showTooltip />
          {!profile.handle && (
            <span className="text-[11px] text-fg-subtle italic">
              Submissions show as <em>anonymous fan</em>. Pick a handle if you
              want credit.
            </span>
          )}
        </div>
        <Link
          href="/me/edit"
          className="shrink-0 rounded-lg border px-3 py-1.5 text-[12.5px] font-bold text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          style={{
            background: 'var(--surface-2)',
            borderColor: 'var(--border-strong)',
          }}
        >
          Edit
        </Link>
      </div>

      {/* Context card */}
      {profile.handle ? (
        <div className="rounded-xl border border-border bg-surface-1 px-4 py-3.5 text-[13px] leading-relaxed text-fg-muted">
          Other fans see{' '}
          <strong style={{ color: 'var(--signal)' }}>@{profile.handle}</strong>{' '}
          on every price you&apos;ve submitted, and can tag you on
          confirmations. Drop the handle any time to go anonymous — your
          existing submissions get reattributed.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface-1 px-4 py-3.5">
          <p className="text-[13px] font-semibold text-fg">
            Submitting as <em>anonymous fan.</em>
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
            That&apos;s fine — most fans stay anonymous. If you want credit on
            your prices (and the option to be tagged when someone confirms one),
            pick a handle.
          </p>
          <Link
            href="/me/edit"
            className="mt-3 inline-flex rounded-xl px-4 py-2.5 text-[13px] font-bold text-fg"
            style={{ background: 'var(--signal)', color: 'var(--bg)' }}
          >
            Pick a handle
          </Link>
        </div>
      )}
    </div>
  )
}
```

- [ ] Commit: `fix(settings): desktop profile panel - title, subtitle, edit button, anon state`

---

### Task 4: Plan card copy update (issue #217)

**Files:**

- Modify: `apps/web/src/components/settings/definitions/copy.ts`
- Modify: `apps/web/src/components/settings/PlanCard.tsx`
- Modify: `apps/web/src/components/settings/SettingsRouteDesktop.tsx` (plan section subtitle)

- [ ] Update `copy.ts` founder plan card:

```ts
planCard: {
  founder: {
    badge: 'Founder',
    yourPlanLabel: 'Your plan',
    tagline: 'Free for life.',
    body: "You showed up during the private beta — you keep Concert Crawl free, forever. No card needed.",
    subline: '— Yes, even when we charge new users.',
  },
  // ... rest unchanged
}
```

- [ ] Update `PlanCard.tsx` founder render to show two-part badge row:

```tsx
if (plan === 'founder') {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border-2 p-5"
      style={{
        borderColor: 'var(--accent)',
        background:
          'radial-gradient(ellipse at top left, color-mix(in srgb, var(--accent) 12%, transparent), var(--surface-1))',
      }}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-bold uppercase tracking-[0.08em]"
            style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}
          >
            {SETTINGS_COPY.planCard.founder.badge}
          </span>
          <span
            className="text-[11px] font-bold uppercase tracking-[0.08em] text-fg-muted"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {SETTINGS_COPY.planCard.founder.yourPlanLabel}
          </span>
        </div>
        <span className="text-[20px] font-extrabold text-fg">
          {SETTINGS_COPY.planCard.founder.tagline}
        </span>
        <span className="text-[13px] leading-relaxed text-fg-muted">
          {SETTINGS_COPY.planCard.founder.body}
        </span>
        <span className="text-[12px] italic" style={{ color: 'var(--accent)' }}>
          {SETTINGS_COPY.planCard.founder.subline}
        </span>
      </div>
    </div>
  )
}
```

- [ ] Update plan section in `SettingsRouteDesktop` to add subtitle:

```tsx
{
  activeSection === 'plan' && (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-[22px] font-extrabold text-fg">Plan</h2>
        <p className="text-[13px] text-fg-muted">
          What you&apos;re paying us. (Spoiler: nothing.)
        </p>
      </div>
      <PlanCard plan={profile.plan} />
    </div>
  )
}
```

- [ ] Commit: `fix(settings): update plan card copy to match spec`

---

### Task 5: My submissions subtitle (issue #218)

**Files:**

- Modify: `apps/web/src/components/settings/SettingsRouteDesktop.tsx`
- Modify: `apps/web/src/components/settings/SettingsRoute.tsx`

- [ ] Update desktop submissions section to pass confirmed count and show subtitle:

```tsx
{
  activeSection === 'submissions' && (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-[22px] font-extrabold text-fg">My submissions</h2>
        <p className="text-[13px] text-fg-muted">
          {profile.submissionCount} total
          {confirmedCount > 0 &&
            ` · ${confirmedCount} confirmed by other fans.`}
        </p>
      </div>
      <MySubmissionsList
        submissions={submissions}
        totalCount={profile.submissionCount}
        cap={submissions.length}
      />
    </div>
  )
}
```

Where `confirmedCount` is computed as:

```tsx
const confirmedCount = submissions.filter(
  (s) => s.status === 'confirmed',
).length
```

- [ ] Add same subtitle to mobile `SettingsRoute` submissions section label

- [ ] Commit: `fix(settings): add confirmed count subtitle to My submissions`

---

### Task 6: Account section cleanup (issue #219)

**Files:**

- Modify: `apps/web/src/components/settings/SettingsRouteDesktop.tsx`
- Modify: `apps/web/src/components/settings/SettingsRoute.tsx`

- [ ] Remove the "Saved shows" / "Coming soon" row from both account sections

- [ ] Add icons to email and password rows in both sections. Email row gets a mail icon + chevron right. Password row gets a lock icon + "CLERK →" label styled as a link-button:

```tsx
{
  /* Email row */
}
;<div className="flex items-center gap-3 px-5 py-3.5">
  <svg
    width="15"
    height="15"
    viewBox="0 0 15 15"
    fill="none"
    aria-hidden
    className="shrink-0 text-fg-muted"
  >
    <rect
      x="1"
      y="3"
      width="13"
      height="9"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.3"
    />
    <path d="M1 4.5l6.5 4.5L14 4.5" stroke="currentColor" strokeWidth="1.3" />
  </svg>
  <span className="flex-1 text-[14px] font-medium text-fg">
    {SETTINGS_COPY.emailRow}
  </span>
  <span className="text-[13px] text-fg-muted">{profile.email}</span>
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    aria-hidden
    className="shrink-0 text-fg-subtle"
  >
    <path
      d="M5.5 3l4 4-4 4"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
</div>
{
  /* Password row */
}
;<div className="flex items-center gap-3 px-5 py-3.5">
  <svg
    width="15"
    height="15"
    viewBox="0 0 15 15"
    fill="none"
    aria-hidden
    className="shrink-0 text-fg-muted"
  >
    <rect
      x="3"
      y="6.5"
      width="9"
      height="6.5"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.3"
    />
    <path
      d="M5 6.5V5a2.5 2.5 0 015 0v1.5"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
  <span className="flex-1 text-[14px] font-medium text-fg">
    {SETTINGS_COPY.passwordRow}
  </span>
  <a
    href="https://accounts.clerk.dev/user"
    target="_blank"
    rel="noopener noreferrer"
    className="rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-fg-muted transition-colors hover:text-fg"
    style={{ fontFamily: 'var(--font-mono)', background: 'var(--surface-2)' }}
  >
    Clerk →
  </a>
</div>
```

- [ ] Update `SettingsRouteDesktop` and `SettingsRoute` account sections accordingly

- [ ] Add "Account" title + subtitle to desktop account panel:

```tsx
{
  activeSection === 'account' && (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-[22px] font-extrabold text-fg">Account</h2>
        <p className="text-[13px] text-fg-muted">
          The actual login bits. Lives in Clerk, not here.
        </p>
      </div>
      <div className="flex flex-col rounded-xl border border-border bg-surface-1">
        {/* email row */}
        {/* password row */}
      </div>
    </div>
  )
}
```

- [ ] Commit: `fix(settings): account section - remove saved shows row, add icons`

---

### Task 7: Danger zone — icons + bordered delete card (issue #220)

**Files:**

- Modify: `apps/web/src/components/settings/DangerZone.tsx`

- [ ] Replace the entire render with:

```tsx
<>
  <div className="flex flex-col">
    {/* Sign out row */}
    <button
      type="button"
      onClick={() => void signOut().catch(console.error)}
      className="flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-colors hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
        className="shrink-0 text-fg-muted"
      >
        <path
          d="M6 3H3.5A1.5 1.5 0 002 4.5v7A1.5 1.5 0 003.5 13H6"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path
          d="M10 5l3 3-3 3M13 8H6"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="flex flex-col gap-0.5">
        <span className="text-[14px] font-semibold text-fg">
          {SETTINGS_COPY.dangerZone.signOut}
        </span>
        <span className="text-[12px] text-fg-muted">
          {SETTINGS_COPY.dangerZone.signOutSubtitle}
        </span>
      </div>
    </button>

    {/* Delete account card */}
    <div
      className="mt-3 rounded-xl border-2 p-4"
      style={{ borderColor: 'var(--danger)' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <svg
          width="15"
          height="15"
          viewBox="0 0 15 15"
          fill="none"
          aria-hidden
          style={{ color: 'var(--danger)' }}
        >
          <path
            d="M3 4h9M5.5 4V2.5h4V4M6 7v4M9 7v4M4 4l.7 8.5h5.6L11 4"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span
          className="text-[14px] font-bold"
          style={{ color: 'var(--danger)' }}
        >
          {SETTINGS_COPY.dangerZone.deleteAccount}
        </span>
      </div>
      <p className="text-[13px] leading-relaxed text-fg-muted mb-3">
        {SETTINGS_COPY.dangerZone.deleteCardBody}
      </p>
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="rounded-lg border px-3 py-2 text-[13px] font-bold transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
        style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
      >
        {SETTINGS_COPY.dangerZone.deleteAccountCta}
      </button>
    </div>
  </div>

  <DeleteAccountSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
</>
```

- [ ] Add to `copy.ts`:

```ts
dangerZone: {
  // ... existing ...
  deleteCardBody: "This is permanent. Your handle, email, and every price you've submitted will be deleted. You can't undo it. Other fans' confirmations on your prices stay (they belong to them).",
  deleteAccountCta: 'Delete my account',
}
```

- [ ] Add danger zone title + subtitle to desktop panel:

```tsx
{
  activeSection === 'danger' && (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-[22px] font-extrabold text-fg">Danger zone</h2>
        <p className="text-[13px] text-fg-muted">The exits.</p>
      </div>
      <DangerZone />
    </div>
  )
}
```

- [ ] Commit: `fix(settings): danger zone icons and bordered delete card`

---

### Task 8: Delete account — desktop modal dialog (issue #221)

**Files:**

- Modify: `apps/web/src/components/settings/DeleteAccountSheet.tsx`

- [ ] Make the component responsive. On desktop (sm+) render as a centered dialog; on mobile render as bottom sheet. Pass `handle` and `submissionCount` as optional props for personalized copy.

Update the component interface:

```tsx
interface DeleteAccountSheetProps {
  open: boolean
  onClose: () => void
  handle?: string | null
  submissionCount?: number
}
```

- [ ] Detect desktop in the same pattern as ThemePickerInline (useEffect + matchMedia):

```tsx
const [isDesktop, setIsDesktop] = useState(false)
useEffect(() => {
  const mql = window.matchMedia('(min-width: 640px)')
  setIsDesktop(mql.matches)
  const handler = (ev: MediaQueryListEvent) => setIsDesktop(ev.matches)
  mql.addEventListener('change', handler)
  return () => mql.removeEventListener('change', handler)
}, [])
```

- [ ] Desktop dialog markup (sm+):

```tsx
{isDesktop ? (
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="delete-dialog-title"
    className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6 shadow-xl"
    style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
  >
    <h2 id="delete-dialog-title" className="text-[18px] font-bold text-fg mb-2">
      Delete your account?
    </h2>
    <p className="text-[13px] leading-relaxed text-fg-muted mb-4">
      <strong style={{ color: 'var(--danger)' }}>This can&apos;t be undone.</strong>
      {' '}Your handle{handle ? <> <strong>@{handle}</strong>,</> : ','} email, plan, and{' '}
      {submissionCount ?? 0} submitted {submissionCount === 1 ? 'price' : 'prices'} are gone
      the moment you tap delete.
    </p>
    <p className="text-[13px] text-fg-muted mb-3">
      Type <strong>DELETE</strong> to confirm.
    </p>
    <input ... />
    <div className="mt-4 flex gap-3">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 rounded-xl border border-border py-3 text-[14px] font-bold text-fg"
        style={{ background: 'var(--surface-1)' }}
      >
        Keep my account
      </button>
      <button
        type="button"
        onClick={() => void handleDelete()}
        disabled={!isArmed || loading}
        className="flex-1 rounded-xl py-3 text-[14px] font-bold disabled:opacity-40"
        style={{
          background: isArmed ? 'var(--danger)' : 'var(--surface-2)',
          color: isArmed ? 'white' : 'var(--fg-muted)',
        }}
      >
        {loading ? 'Deleting…' : 'Delete forever'}
      </button>
    </div>
  </div>
) : (
  /* existing bottom sheet markup */
)}
```

- [ ] Update `DangerZone.tsx` to pass `handle` and `submissionCount` down from props. Update `DangerZone` to accept these props:

```tsx
interface DangerZoneProps {
  handle?: string | null
  submissionCount?: number
}
```

- [ ] Update `SettingsRouteDesktop` and `SettingsRoute` to pass `profile.handle` and `profile.submissionCount` to `<DangerZone>`.

- [ ] Commit: `fix(settings): delete account modal on desktop, sheet on mobile`

---

### Task 9: Mobile layout — Settings header + spacing (issue #222)

**Files:**

- Modify: `apps/web/src/components/settings/SettingsRoute.tsx`

- [ ] Add a mobile "Settings" header at the very top:

```tsx
{
  /* Mobile header */
}
;<div className="flex items-center justify-between border-b border-border px-4 py-3.5">
  <Link
    href="/events"
    className="text-[13px] font-semibold uppercase tracking-[0.06em] text-fg-muted"
    style={{ fontFamily: 'var(--font-mono)' }}
  >
    ← Done
  </Link>
  <span className="text-[16px] font-extrabold text-fg">Settings</span>
  <div className="w-[52px]" /> {/* spacer to center title */}
</div>
```

- [ ] Wrap entire return in a fragment and add the header before the flex column

- [ ] Fix section label styling for Appearance and My Submissions to match spec (uppercase tracking label with count badge):

```tsx
{
  /* Appearance section label */
}
;<div className="flex items-center justify-between px-4">
  <span
    className="text-[12px] font-bold uppercase tracking-[0.08em] text-fg-muted"
    style={{ fontFamily: 'var(--font-mono)' }}
  >
    Appearance
  </span>
  <span
    className="text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-subtle"
    style={{ fontFamily: 'var(--font-mono)' }}
  >
    tap to switch
  </span>
</div>
```

- [ ] Import `Link` from `next/link` if not present

- [ ] Commit: `fix(settings): mobile layout - add Settings header and fix section labels`

---

### Task 10: Mobile bottom nav ME tab — user avatar (issue #223)

**Files:**

- Modify: `apps/web/src/components/consumer/bottom-nav/BottomNav.tsx`

The ME tab should show a small user avatar (letter on colored disc) instead of a generic person icon. The bottom nav is a client component with `usePathname`, so we can add a `useUser` from Clerk to get avatar data.

- [ ] Convert ME tab icon to use a small Avatar component when user is signed in. Since BottomNav doesn't currently have user data, use `useUser` from `@clerk/nextjs` to get public metadata:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'

// ... existing TABS without me tab ...
const BASE_TABS = [browse, search, saved] // first 3

export function BottomNav() {
  const pathname = usePathname()
  const { user } = useUser()

  const avatarColor = (user?.publicMetadata?.avatarColor as string) ?? 'signal'
  const handle = user?.publicMetadata?.handle as string | undefined
  const initial = handle ? handle[0].toUpperCase() : (user?.firstName?.[0] ?? '?')

  const colorMap: Record<string, string> = {
    signal: 'var(--signal)',
    accent: 'var(--accent)',
    success: 'var(--success)',
    warning: 'var(--warning)',
  }
  const avatarBg = colorMap[avatarColor] ?? 'var(--signal)'

  return (
    <nav ...>
      {BASE_TABS.map(...existing tab render...)}
      {/* ME tab */}
      <Link
        href="/me"
        className="flex flex-col items-center gap-[3px]"
        style={{ color: pathname.startsWith('/me') ? 'var(--signal)' : 'var(--fg-subtle)' }}
      >
        <div
          className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-[10px] font-black"
          style={{
            background: avatarBg,
            color: 'var(--bg)',
            outline: pathname.startsWith('/me') ? `2px solid ${avatarBg}` : 'none',
            outlineOffset: '2px',
          }}
        >
          {initial}
        </div>
        <span
          className="text-[9px] tracking-[0.04em]"
          style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: pathname.startsWith('/me') ? 700 : 500,
          }}
        >
          me
        </span>
      </Link>
    </nav>
  )
}
```

- [ ] Commit: `fix(settings): mobile bottom nav ME tab shows user avatar`

---

### Task 11: Appearance panel titles + Danger zone mobile fix

**Files:**

- Modify: `apps/web/src/components/settings/SettingsRouteDesktop.tsx`

- [ ] Update desktop Appearance section to add title + subtitle:

```tsx
{
  activeSection === 'appearance' && (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-[22px] font-extrabold text-fg">Appearance</h2>
        <p className="text-[13px] text-fg-muted">
          Three flavors. Pick the one that hurts your eyes least.
        </p>
      </div>
      <ThemePickerInline />
    </div>
  )
}
```

- [ ] Commit: `fix(settings): appearance and danger zone panel titles`

---

### Task 12: CLAUDE.md + PR

- [ ] Update CLAUDE.md Current Status to mark Profile & Settings v2 polish as in PR

- [ ] Open PR:

```bash
gh pr create \
  --title "fix(settings): align profile/settings pages with v2 design spec" \
  --body "$(cat <<'EOF'
## Summary
- Adds desktop topbar (logo + back to browse link)
- Adds icons and user profile card to desktop sidebar
- Fixes profile panel: title, subtitle, Edit button, anonymous state
- Updates Plan card to match spec (two-part badge, correct body + tagline)
- Adds confirmed count subtitle to My submissions
- Removes 'Saved shows' stub row from Account section; adds email/password icons
- Redesigns Danger zone with sign-out icon + bordered delete card
- Delete account: desktop shows modal dialog, mobile keeps bottom sheet
- Adds Settings header to mobile layout with ← Done back button
- Mobile bottom nav ME tab now shows user avatar

Closes #214, #215, #216, #217, #218, #219, #220, #221, #222, #223, #224
EOF
)"
```

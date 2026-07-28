// lo-inventory.jsx — #794 deliverable 8: the signed-out state inventory.
// Every surface that changes, what it shows logged out, what it shows signed
// in. This is the artifact the eng plan tasks off. Same content as §"State
// inventory" in README.md — kept in both places on purpose: the table is the
// deliverable, the README is the searchable copy.

const { Mono, LO_MONO, LO_UI } = window;

const LO_INVENTORY = [
  ["Routes", [
    ["/", "Marketing landing. New CTA block: Browse shows (primary) + Sign up. Posters link out.", "Middleware redirects to /events. Unchanged.", "ISR shell, no auth call"],
    ["/events", "Full read-only calendar. Watch eye present at full strength.", "Same, eye toggles.", "Add to public matcher"],
    ["/events/[id]", "Full detail. Prices, sources, tickets link, submit-a-price entry visible.", "Same, plus your watch state.", "Add to public matcher"],
    ["/venues, /venues/[slug]", "Fully public and complete.", "Identical.", "Add to public matcher"],
    ["/artists/[slug]", "Public — but the route does not exist yet; it ships with #1115.", "Identical.", "DEPENDENCY on #1115 — not a no-op"],
    ["/search", "Public. Palette, results, empty states all reachable.", "Identical.", "§3.11"],
    ["/watching", "Designed teaching state: definition + worked example + sign-up CTA. No fetch.", "Your list, or the shipped empty state.", "Public route, GATED PAYLOAD"],
    ["/me, /me?section=*", "Not reachable. Redirect to sign-in with return path.", "Settings.", "Stays gated"],
    ["/onboarding", "Not reachable pre-auth. Becomes post-auth + a permanent route.", "Reachable any time from the account menu.", "Lift invite gate — not #794"],
    ["/auth/code", "Retires with the invite gate.", "n/a", "Beta-artifact retirement"],
    ["/legal/*", "Public. Unchanged.", "Identical.", "Already public"],
  ]],
  ["Shell · mobile", [
    ["Header lockup", "Identical. Links to /events.", "Identical.", ""],
    ["Header search button", "Identical — search is public.", "Identical.", ""],
    ["Header CTA", "Filled Sign up (36px pill).", "Absent.", "§3.5"],
    ["MobileProfileEntry", "Anonymous disc, opens the account menu.", "Avatar, opens the account menu.", "Today: returns null"],
    ["Sign-in rail", "Quiet mono link under the header row.", "Absent.", "Keeps 320px header to one CTA"],
    ["BottomNav tab 1–2", "browse · venues. Identical.", "Identical.", ""],
    ["BottomNav tab 3", "watching — navigates to the signed-out state.", "Navigates to your list.", "§3.3"],
    ["BottomNav tab 4", "me — anonymous disc, opens the account menu.", "Avatar, opens the account menu.", "Today: bare PersonIcon stub"],
  ]],
  ["Shell · desktop", [
    ["TopNav tabs", "Browse · Venues · Watching. All three navigate.", "Identical.", ""],
    ["Search field", "Identical, ⌘K live.", "Identical.", ""],
    ["Sign up / Sign in pair", "Quiet Sign in text + filled Sign up, left of the disc.", "Absent.", "§3.5"],
    ["UserMenu trigger", "Anonymous disc. Already works today.", "Avatar.", "Trigger unchanged"],
    ["UserMenu body", "Get-in card in the identity slot; Theme; How it works; Terms; Privacy; version.", "Identity card; Submitted prices; Theme; How it works; Settings; Sign out; version.", "§3.4 — body is the work"],
  ]],
  ["Account menu rows", [
    ["Identity slot", "Get-in card: anonymous disc, 'Browsing as a guest', Sign up free, Sign in link.", "Identity card: avatar, tier badge, email.", "Same footprint, same position"],
    ["Submitted prices", "Absent — nothing to list.", "Present, N live.", ""],
    ["Theme picker", "Present, functional, persists to localStorage.", "Present, persists to the server.", "§3.4 — device preference"],
    ["How Concert Crawl works", "Present. Opens the tour with Close instead of Skip.", "Present.", "§3.7 permanent route"],
    ["Settings", "Absent — gated.", "Present.", ""],
    ["Terms · Privacy", "Present.", "Present (already reachable via Settings).", "Add to the signed-out body"],
    ["Sign out", "Absent.", "Present.", ""],
    ["Version footer / Changelog", "Present.", "Present, with unread dot.", ""],
  ]],
  ["Affordances", [
    ["Watch eye", "Identical pixels. Tap opens the tier picker. Honest accessible name.", "Toggles watching.", "§3.10 — locked"],
    ["Follow artist", "Identical pixels. Tier picker on tap.", "Toggles following (Premium).", "Inherited from #781"],
    ["Calendar export", "Identical pixels. Tier picker on tap.", "Exports (Premium).", "Inherited from #781"],
    ["Submit a price", "Visible. Tap routes to sign-in with return path.", "Opens the submit modal.", "Submission needs a session"],
    ["Confirm / dispute a price", "Visible. Tap routes to sign-in with return path.", "Opens the corroboration sheet.", "Same seam"],
    ["Spotify sync · alerts · price-drop", "Hidden, not teased.", "Present per tier.", "Background features — #781"],
  ]],
  ["Protected-layout mounts", [
    ["FeedbackEdgeTabGate", "HIDDEN. Gates on pathname.startsWith('/admin') only — add an isSignedIn check.", "Present (until beta-artifact retirement).", "NEW GATE — ships broken otherwise"],
    ["FeatureDropPillGate", "HIDDEN. No auth check today — add one.", "Present.", "NEW GATE — §3.6 + #781"],
    ["FirstWatchNudgeGate", "Renders nothing, but mounts and holds auth-dependent effects.", "Nudge on first watch.", "Early-return before effects"],
    ["OnboardingThemeFlush", "Nothing to flush — logged-out theme is localStorage-only (§3.4).", "Flushes the onboarding theme pick to the server.", "Early-return before effects"],
    ["LifecycleNudgesGate", "Already self-gates (!isSignedIn → null). No change.", "Present.", ""],
  ]],
  ["Copy to fix", [
    ["tier-picker loggedOutEyebrow", "'Save a show · sign in' — VOCABULARY VIOLATION, shipping today.", "→ 'Watching · free with an account'", "One-line edit"],
    ["tier-picker loggedOutTitle", "'Save the ones you can't miss.'", "→ \"Keep an eye on the ones you can't miss.\"", "One-line edit"],
    ["tier-picker loggedOutSub", "\"Watching's free — you just need an account…\"", "→ see LO_PICKER_COPY.sub", "One-line edit"],
    ["settings.watchlistRow", "'Saved shows' — second violation, signed-in surface.", "→ 'Watching'", "Flagged, outside #794's screens"],
    ["Onboarding copy block", "Beta-insider voice throughout, BetaPill present.", "→ public voice, all six steps rewritten", "§3.7"],
  ]],
];

function InventoryTable({ width = 1400, height = 2270 }) {
  return (
    <div style={{ width, height, boxSizing: "border-box", background: "var(--bg)", color: "var(--fg)", fontFamily: LO_UI, padding: 28, display: "flex", flexDirection: "column", gap: 16, overflow: "hidden" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <Mono size={10} color="var(--accent)">Deliverable 8</Mono>
        <span style={{ fontWeight: 900, fontSize: 28, letterSpacing: "-0.035em" }}>Signed-out state inventory.</span>
        <span style={{ fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.5, maxWidth: 820, textWrap: "pretty" }}>
          Every surface × every state. Rows in <span style={{ color: "var(--signal)" }}>signal</span> are new
          work; rows marked identical need no change and are listed so the eng plan can close them out fast.
          <br />
          <strong style={{ color: "var(--warning)" }}>Protected-layout mounts</strong> are the group most likely to be
          missed: <code>(protected)/layout.tsx</code> makes no <code>auth()</code> call — gating is entirely edge
          middleware — so the moment those routes join the public matcher, all five mount for anonymous visitors.
        </span>
      </div>

      <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "220px 1.25fr 1fr 200px", background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
          {["Surface", "Signed out", "Signed in", "Note"].map((h) => (
            <div key={h} style={{ padding: "9px 12px" }}><Mono size={9.5} color="var(--fg-muted)">{h}</Mono></div>
          ))}
        </div>
        {LO_INVENTORY.map(([group, rows]) => (
          <React.Fragment key={group}>
            <div style={{ padding: "8px 12px", background: "color-mix(in oklch, var(--signal) 9%, var(--surface-1))", borderBottom: "1px solid var(--border)", borderTop: "1px solid var(--border)" }}>
              <Mono size={9.5} color="var(--signal)">{group}</Mono>
            </div>
            {rows.map((r, i) => (
              <div key={r[0]} style={{ display: "grid", gridTemplateColumns: "220px 1.25fr 1fr 200px", borderBottom: i === rows.length - 1 ? "none" : "1px solid var(--border)" }}>
                <div style={{ padding: "8px 12px", fontSize: 11.5, fontWeight: 700, color: "var(--fg)", lineHeight: 1.4 }}>{r[0]}</div>
                <div style={{ padding: "8px 12px", fontFamily: LO_MONO, fontSize: 10, color: "var(--fg)", lineHeight: 1.5, letterSpacing: "0.005em" }}>{r[1]}</div>
                <div style={{ padding: "8px 12px", fontFamily: LO_MONO, fontSize: 10, color: "var(--fg-muted)", lineHeight: 1.5, letterSpacing: "0.005em" }}>{r[2]}</div>
                <div style={{ padding: "8px 12px", fontFamily: LO_MONO, fontSize: 9, color: r[3] ? "var(--warning)" : "var(--fg-subtle)", lineHeight: 1.5, letterSpacing: "0.04em", textTransform: "uppercase" }}>{r[3] || "—"}</div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { InventoryTable, LO_INVENTORY });

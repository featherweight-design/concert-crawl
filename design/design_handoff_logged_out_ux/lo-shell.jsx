// lo-shell.jsx — #794 deliverable 1: the signed-out app shell.
// ONE shell (§3.2). Same header, same bottom nav, same four tab slots in the
// same positions. Signing in FILLS SLOTS IN — it never moves you to a
// different product. Nothing is hidden, dimmed, or skeletoned: signed-out
// reads as *different*, not *incomplete*.

const { Lockup, Mono, LO_MONO, LO_UI, IconBrowse, IconVenues, IconEye, IconSearch,
        AnonDisc, InitialDisc, Btn, Phone, Desk, Note, LO_SHOWS, EventRow } = window;

const LO_TABS = [
  { key: "browse", label: "browse", Icon: IconBrowse },
  { key: "venues", label: "venues", Icon: IconVenues },
  { key: "watching", label: "watching", Icon: IconEye },
];

// ── Bottom nav ────────────────────────────────────────────────────────────
// Slot 4 is the account slot. Signed-out it is the anonymous disc and it still
// OPENS THE ACCOUNT MENU (§3.4) — it never renders the bare PersonIcon stub and
// it never disappears. Slot 3 still NAVIGATES to /watching (§3.3).
function BottomNav({ signedOut = true, active = "browse", menuOpen = false }) {
  return (
    <nav aria-label="Main navigation" style={{
      flexShrink: 0, height: 56, display: "flex", alignItems: "center", justifyContent: "space-around",
      borderTop: "1px solid var(--border)", background: "var(--bg-elevated)",
    }}>
      {LO_TABS.map(({ key, label, Icon }) => {
        const on = active === key;
        return (
          <a key={key} href="#" style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            minWidth: 56, minHeight: 44, justifyContent: "center", textDecoration: "none",
            color: on ? "var(--signal)" : "var(--fg-subtle)",
          }}>
            <Icon s={18} />
            <span style={{ fontFamily: LO_MONO, fontSize: 9, fontWeight: on ? 700 : 500, letterSpacing: "0.04em" }}>{label}</span>
          </a>
        );
      })}
      <button type="button"
        aria-label={signedOut ? "Account menu — sign up or sign in" : "Account menu"}
        aria-haspopup="dialog" aria-expanded={menuOpen}
        style={{
          all: "unset", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          minWidth: 56, minHeight: 44, justifyContent: "center",
          color: active === "me" ? "var(--signal)" : "var(--fg-subtle)",
        }}>
        {signedOut ? <AnonDisc size={26} ring={menuOpen} /> : <InitialDisc size={26} letter="H" ring={active === "me"} />}
        <span style={{ fontFamily: LO_MONO, fontSize: 9, fontWeight: menuOpen ? 700 : 500, letterSpacing: "0.04em" }}>me</span>
      </button>
    </nav>
  );
}

// ── Mobile header ─────────────────────────────────────────────────────────
// Signed-out gains the Sign up CTA in the row; the profile-entry slot becomes
// the anonymous disc instead of returning null.
function MobileHeader({ signedOut = true, menuOpen = false }) {
  return (
    <header style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "12px 14px 10px", background: "var(--bg)" }}>
      <Lockup mark={26} size={16} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <button type="button" aria-label="Search" style={{
          all: "unset", cursor: "pointer", width: 36, height: 36, minWidth: 44, minHeight: 44,
          display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: 999, border: "1px solid var(--border-strong)", color: "var(--fg-muted)",
        }}><IconSearch s={15} /></button>
        {signedOut
          ? <Btn kind="primary" size="sm" style={{ minHeight: 36, padding: "8px 13px", fontSize: 13 }}>Sign up</Btn>
          : null}
        <button type="button"
          aria-label={signedOut ? "Account menu — sign up or sign in" : "Account menu"}
          aria-haspopup="dialog" aria-expanded={menuOpen}
          style={{ all: "unset", cursor: "pointer", display: "flex", minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}>
          {signedOut ? <AnonDisc size={32} ring={menuOpen} /> : <InitialDisc size={32} letter="H" />}
        </button>
      </div>
    </header>
  );
}

// Sign-in is a quiet text link one line down on mobile so the 320px header row
// never has to carry two CTAs (§3.5 — filled Sign up primary, Sign in quiet).
function MobileSignInRail() {
  return (
    <div style={{ flexShrink: 0, padding: "0 14px 8px", display: "flex", justifyContent: "flex-end" }}>
      <a href="#" style={{ fontFamily: LO_MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--signal)", textDecoration: "none", padding: "6px 2px", minHeight: 44, display: "flex", alignItems: "center" }}>
        Already in? Sign in
      </a>
    </div>
  );
}

// ── Browse body (context so the shell isn't shown in a vacuum) ────────────
function BrowseBody({ signedOut = true, narrow = false }) {
  return (
    <div style={{ flex: 1, minHeight: 0, overflow: "hidden", padding: narrow ? "4px 12px 8px" : "4px 14px 8px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <Mono size={9.5} color="var(--fg-subtle)">Denver · This week</Mono>
        <span style={{ fontWeight: 900, fontSize: narrow ? 24 : 27, letterSpacing: "-0.03em", color: "var(--fg)" }}>What's on?</span>
      </div>
      <div style={{ display: "flex", gap: 6, overflow: "hidden" }}>
        {["Any date", "Any venue", "Any price"].map((c) => (
          <span key={c} style={{
            fontFamily: LO_MONO, fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", color: "var(--fg-muted)",
            border: "1px solid var(--border)", background: "var(--surface-1)", borderRadius: 999, padding: "8px 11px", whiteSpace: "nowrap",
          }}>{c}</span>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {LO_SHOWS.slice(0, narrow ? 3 : 4).map((s) => (
          <EventRow key={s.artist} show={s} signedOut={signedOut} compact={narrow}
            eyeState={!signedOut && s.artist === "Geese" ? "watching" : "rest"} />
        ))}
      </div>
    </div>
  );
}

// ── Mobile shell screens ──────────────────────────────────────────────────
function ShellMobile({ signedOut = true, width = 390, height = 780, note }) {
  const narrow = width <= 340;
  return (
    <Phone width={width} height={height}>
      <MobileHeader signedOut={signedOut} />
      {signedOut && <MobileSignInRail />}
      <BrowseBody signedOut={signedOut} narrow={narrow} />
      <BottomNav signedOut={signedOut} active="browse" />
      {note && <Note>{note}</Note>}
    </Phone>
  );
}

// ── Desktop header ────────────────────────────────────────────────────────
// The UserMenu trigger already works signed-out today, so the disc stays put.
// Signed-out ADDS the Sign up / Sign in pair to its left; nothing is removed.
function DesktopHeader({ signedOut = true, active = "Browse", menuOpen = false }) {
  return (
    <header style={{
      flexShrink: 0, height: 64, display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 28px", background: "var(--bg-elevated)", borderBottom: "1px solid var(--border)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
        <Lockup mark={30} size={17} />
        <nav style={{ display: "flex", gap: 4 }}>
          {["Browse", "Venues", "Watching"].map((t) => {
            const on = t === active;
            return (
              <a key={t} href="#" style={{
                textDecoration: "none", borderRadius: 9, padding: "8px 14px", fontSize: 13, letterSpacing: "-0.01em",
                background: on ? "var(--surface-2)" : "transparent",
                fontWeight: on ? 700 : 500, color: on ? "var(--fg)" : "var(--fg-muted)",
                minHeight: 44, display: "flex", alignItems: "center",
              }}>{t}</a>
            );
          })}
        </nav>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 268, height: 38, borderRadius: 9, border: "1px solid var(--border)", background: "var(--surface-1)",
          display: "flex", alignItems: "center", gap: 9, padding: "0 12px", color: "var(--fg-subtle)",
        }}>
          <IconSearch s={14} />
          <span style={{ flex: 1, fontSize: 13 }}>Search artists or venues…</span>
          <span style={{ fontFamily: LO_MONO, fontSize: 10, border: "1px solid var(--border-strong)", borderRadius: 4, padding: "2px 5px" }}>⌘K</span>
        </div>
        {signedOut && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <a href="#" style={{ fontFamily: LO_UI, fontSize: 13, fontWeight: 700, color: "var(--fg-muted)", textDecoration: "none", padding: "10px 10px", minHeight: 44, display: "flex", alignItems: "center" }}>Sign in</a>
            <Btn kind="primary" size="sm" style={{ minHeight: 38, padding: "9px 15px", fontSize: 13.5 }}>Sign up</Btn>
          </div>
        )}
        <button type="button"
          aria-label={signedOut ? "Account menu — sign up or sign in" : "Account menu"}
          aria-haspopup="dialog" aria-expanded={menuOpen}
          style={{ all: "unset", cursor: "pointer", display: "flex", minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}>
          {signedOut ? <AnonDisc size={36} ring={menuOpen} /> : <InitialDisc size={36} letter="H" />}
        </button>
      </div>
    </header>
  );
}

function DesktopBrowseBody({ signedOut = true }) {
  return (
    <div style={{ flex: 1, minHeight: 0, overflow: "hidden", padding: "26px 28px 0" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Mono size={10} color="var(--fg-subtle)">Denver · This week</Mono>
          <span style={{ fontWeight: 900, fontSize: 34, letterSpacing: "-0.03em", color: "var(--fg)" }}>What's on?</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {LO_SHOWS.slice(0, 5).map((s) => (
            <EventRow key={s.artist} show={s} signedOut={signedOut} eyeState={!signedOut && s.artist === "Geese" ? "watching" : "rest"} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ShellDesktop({ signedOut = true, width = 1200, height = 700, note }) {
  return (
    <Desk width={width} height={height}>
      <DesktopHeader signedOut={signedOut} />
      <DesktopBrowseBody signedOut={signedOut} />
      {note && <Note>{note}</Note>}
    </Desk>
  );
}

// ── Slot-by-slot comparison table (the "slots fill in" model, made legible) ─
const LO_SLOTS = [
  { slot: "Header · brand lockup", out: "identical", inn: "identical" },
  { slot: "Header · search", out: "identical — search is public (§3.11)", inn: "identical" },
  { slot: "Header · CTA pair", out: "filled Sign up + quiet Sign in", inn: "absent" },
  { slot: "Header · account disc", out: "anonymous disc, opens menu", inn: "avatar, opens menu" },
  { slot: "Nav tab 1 · browse", out: "identical", inn: "identical" },
  { slot: "Nav tab 2 · venues", out: "identical", inn: "identical" },
  { slot: "Nav tab 3 · watching", out: "navigates → signed-out state", inn: "navigates → your list" },
  { slot: "Nav tab 4 · me", out: "anonymous disc → account menu", inn: "avatar → account menu" },
  { slot: "Watch eye on a card", out: "identical pixels · tier picker on tap", inn: "toggles watching" },
];

function SlotTable({ width = 640, height = 510 }) {
  return (
    <div style={{ width, height, background: "var(--bg)", color: "var(--fg)", fontFamily: LO_UI, padding: 20, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <Mono size={10} color="var(--accent)">Shell parity</Mono>
        <span style={{ fontWeight: 900, fontSize: 21, letterSpacing: "-0.025em" }}>Every slot exists on both sides.</span>
        <span style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.5 }}>
          Nothing returns null. Nothing dims. Signing in fills slots in.
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.2fr 1fr", gap: 0, border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        {["Slot", "Signed out", "Signed in"].map((h) => (
          <div key={h} style={{ padding: "9px 11px", background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
            <Mono size={9} color="var(--fg-muted)">{h}</Mono>
          </div>
        ))}
        {LO_SLOTS.map((r, i) => (
          <React.Fragment key={r.slot}>
            <div style={{ padding: "9px 11px", borderBottom: i === LO_SLOTS.length - 1 ? "none" : "1px solid var(--border)", fontSize: 11.5, fontWeight: 700, color: "var(--fg)" }}>{r.slot}</div>
            <div style={{ padding: "9px 11px", borderBottom: i === LO_SLOTS.length - 1 ? "none" : "1px solid var(--border)", fontFamily: LO_MONO, fontSize: 10, color: "var(--signal)", letterSpacing: "0.01em", lineHeight: 1.5 }}>{r.out}</div>
            <div style={{ padding: "9px 11px", borderBottom: i === LO_SLOTS.length - 1 ? "none" : "1px solid var(--border)", fontFamily: LO_MONO, fontSize: 10, color: "var(--fg-muted)", letterSpacing: "0.01em", lineHeight: 1.5 }}>{r.inn}</div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { BottomNav, MobileHeader, MobileSignInRail, BrowseBody, ShellMobile, DesktopHeader, DesktopBrowseBody, ShellDesktop, SlotTable });

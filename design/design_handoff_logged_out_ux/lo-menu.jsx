// lo-menu.jsx — #794 deliverable 2: the signed-out account menu.
// §3.4 — the menu STAYS A MENU. It carries every auth-independent item: theme
// picker, the welcome tour (§3.7's permanent route), legal, version. The
// Sign up / Sign in pair takes the identity card's position — first thing the
// eye and the keyboard both reach, and the slot stays where it always was.

const { Mono, LO_MONO, LO_UI, IconChevron, IconArrow, AnonDisc, InitialDisc, Btn,
        Phone, Desk, Note, Scrim, Sheet, MobileHeader, BottomNav, BrowseBody,
        DesktopHeader, DesktopBrowseBody, ThemeGrid, LO_THEMES, MiniMark } = window;

// The menu's theme row is a trigger; expanding it reveals the shipped 3×3
// picker (design_handoff_theme_picker, Variation B) — all nine themes, each
// with its own mini gig card. Signed-out it writes to localStorage only.

function MenuRow({ label, meta, danger = false, last = false, trailing }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "13px 14px", minHeight: 46,
      borderBottom: last ? "none" : "1px solid var(--border)", boxSizing: "border-box",
    }}>
      <span style={{ flex: 1, minWidth: 0, fontFamily: LO_UI, fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.005em", color: danger ? "var(--warning)" : "var(--fg)" }}>{label}</span>
      {meta && <Mono size={10} ls="0.1em" color="var(--fg-subtle)">{meta}</Mono>}
      {trailing}
    </div>
  );
}

function SectionLabel({ children }) {
  return <div style={{ padding: "11px 14px 4px" }}><Mono size={10}>{children}</Mono></div>;
}

// ── The signed-out identity slot ──────────────────────────────────────────
// Same footprint as the identity card, same border, same position. It reads as
// a different thing in the same place — not as an empty card.
function GetInCard({ focusPrimary = false }) {
  return (
    <div style={{ padding: "14px 14px 13px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 11 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <AnonDisc size={42} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          <Mono size={10} color="var(--accent)">Not signed in</Mono>
          <span style={{ fontFamily: LO_UI, fontSize: 14, fontWeight: 800, letterSpacing: "-0.015em", color: "var(--fg)" }}>Browsing as a guest</span>
        </div>
      </div>
      <Btn kind="primary" full focus={focusPrimary}>Sign up free<IconArrow /></Btn>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <span style={{ fontFamily: LO_UI, fontSize: 12.5, fontWeight: 500, color: "var(--fg-muted)" }}>Already have an account?</span>
        <a href="#" style={{ fontFamily: LO_UI, fontSize: 12.5, fontWeight: 700, color: "var(--signal)", textDecoration: "none" }}>Sign in</a>
      </div>
    </div>
  );
}

function VersionFooter() {
  return (
    <div style={{ padding: "11px 14px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-1)" }}>
      <Mono size={9.5} ls="0.1em" color="var(--fg-subtle)">v1.0.0 · a3f19c2</Mono>
      <Mono size={9.5} ls="0.1em" color="var(--signal)">Changelog</Mono>
    </div>
  );
}

// ── Menu bodies ───────────────────────────────────────────────────────────
function MenuBodyOut({ themeOpen = true, activeTheme = "Electric", focusPrimary = false }) {
  return (
    <div style={{ fontFamily: LO_UI, color: "var(--fg)" }}>
      <GetInCard focusPrimary={focusPrimary} />
      <SectionLabel>App</SectionLabel>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 14px", minHeight: 46, borderBottom: themeOpen ? "none" : "1px solid var(--border)" }}>
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: "var(--fg)" }}>Theme</span>
        <span style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--fg-muted)" }}>
          <MiniMark t={LO_THEMES[0].t} size={18} />
          <Mono size={11} ls="-0.005em" style={{ textTransform: "none" }}>{activeTheme}</Mono>
          <IconChevron dir={themeOpen ? "down" : "right"} />
        </span>
      </div>
      {themeOpen && (
        <div style={{ padding: "4px 12px 12px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
          <ThemeGrid activeKey="electric" dense />
          <Mono size={9} ls="0.08em" color="var(--fg-subtle)">9 themes · saved on this device, no account needed</Mono>
        </div>
      )}
      <MenuRow label="How Concert Crawl works" meta="2 min" trailing={<span style={{ color: "var(--fg-subtle)" }}><IconChevron /></span>} />
      <MenuRow label="Terms" trailing={<span style={{ color: "var(--fg-subtle)" }}><IconChevron /></span>} />
      <MenuRow label="Privacy" last trailing={<span style={{ color: "var(--fg-subtle)" }}><IconChevron /></span>} />
      <VersionFooter />
    </div>
  );
}

function MenuBodyIn() {
  return (
    <div style={{ fontFamily: LO_UI, color: "var(--fg)" }}>
      <div style={{ padding: "14px 14px 12px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border)" }}>
        <InitialDisc size={42} letter="H" />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          <Mono size={10} color="var(--accent)">Free</Mono>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>hugh@concertcrawl.app</span>
        </div>
        <span style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-muted)" }}><IconChevron dir="down" /></span>
      </div>
      <SectionLabel>You</SectionLabel>
      <MenuRow label="Submitted prices" meta="3 live" last />
      <SectionLabel>App</SectionLabel>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 14px", minHeight: 46, borderBottom: "1px solid var(--border)" }}>
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>Theme</span>
        <span style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--fg-muted)" }}>
          <MiniMark t={LO_THEMES[0].t} size={18} />
          <Mono size={11} ls="-0.005em" style={{ textTransform: "none" }}>Electric</Mono><IconChevron />
        </span>
      </div>
      <MenuRow label="How Concert Crawl works" meta="2 min" />
      <MenuRow label="Settings" last />
      <div style={{ borderTop: "1px solid var(--border)" }} />
      <MenuRow label="Sign out" danger last />
      <VersionFooter />
    </div>
  );
}

// ── Standalone popover / sheet ────────────────────────────────────────────
function AccountMenuPopover({ signedOut = true, focusPrimary = false }) {
  return (
    <div role="dialog" aria-modal="false" aria-label={signedOut ? "Account menu" : "Account menu"} style={{
      width: 360, background: "var(--bg-elevated)", border: "1px solid var(--border-strong)",
      borderRadius: 14, overflow: "hidden",
      boxShadow: "0 24px 64px color-mix(in oklch, var(--bg) 78%, transparent)",
    }}>
      {signedOut ? <MenuBodyOut focusPrimary={focusPrimary} /> : <MenuBodyIn />}
    </div>
  );
}

function MenuStandalone({ signedOut = true, width = 400, height = 850, focusPrimary = false }) {
  return (
    <div style={{ width, height, background: "var(--bg)", padding: 20, boxSizing: "border-box", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
      <AccountMenuPopover signedOut={signedOut} focusPrimary={focusPrimary} />
    </div>
  );
}

// ── In-context ────────────────────────────────────────────────────────────
function MenuSheetMobile({ width = 390, height = 780, note }) {
  return (
    <Phone width={width} height={height}>
      <MobileHeader signedOut menuOpen />
      <BrowseBody signedOut narrow={width <= 340} />
      <BottomNav signedOut active="browse" menuOpen />
      <Scrim>
        <Sheet><MenuBodyOut /></Sheet>
      </Scrim>
      {note && <Note>{note}</Note>}
    </Phone>
  );
}

function MenuDropdownDesktop({ width = 1200, height = 700, note }) {
  return (
    <Desk width={width} height={height}>
      <DesktopHeader signedOut menuOpen />
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <div style={{ opacity: 0.5, height: "100%" }}><DesktopBrowseBody signedOut /></div>
        <div style={{ position: "absolute", top: 8, right: 28, zIndex: 10 }}>
          <AccountMenuPopover signedOut />
        </div>
      </div>
      {note && <Note>{note}</Note>}
    </Desk>
  );
}

Object.assign(window, { AccountMenuPopover, MenuBodyOut, MenuBodyIn, MenuStandalone, MenuSheetMobile, MenuDropdownDesktop, GetInCard });

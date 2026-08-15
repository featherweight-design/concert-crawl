// me-screens.jsx — /me routes for this handoff.
//   <MeHubMobile>       single-scroll hub, all 8 sections, real order
//   <MeNotifDesktop>    desktop Notifications panel
//   <MeAccountDesktop>  desktop Account panel

function MeSectionLabel({ children, count }) {
  const { MonoEyebrow } = window;
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 9, padding: "0 2px" }}>
      <span style={{ fontFamily: window.ME_UI, fontSize: 17, fontWeight: 900, letterSpacing: "-0.02em", color: "var(--fg)" }}>{children}</span>
      {count && <MonoEyebrow size={9}>{count}</MonoEyebrow>}
    </div>
  );
}

// Compact stand-ins for the sections this pass doesn't touch — they exist so
// the two new controls can be judged in their real neighbourhood.
function MeStubSection({ title, rows, count }) {
  const { SettingsRowGroup, MeNavRow } = window;
  return (
    <section>
      <MeSectionLabel count={count}>{title}</MeSectionLabel>
      <SettingsRowGroup>
        {rows.map((r, i) => <MeNavRow key={r.label} label={r.label} detail={r.detail} last={i === rows.length - 1} />)}
      </SettingsRowGroup>
    </section>
  );
}

function MeProfileBlock() {
  const { ME_UI, MonoEyebrow } = window;
  return (
    <section style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 54, height: 54, borderRadius: 999, flexShrink: 0, background: "color-mix(in oklch, var(--signal) 30%, var(--surface-1))", border: "1.5px solid var(--signal)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ME_UI, fontWeight: 900, fontSize: 21, color: "var(--fg)" }}>H</div>
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontFamily: ME_UI, fontSize: 18, fontWeight: 900, letterSpacing: "-0.02em" }}>@hughcrawls</div>
        <MonoEyebrow size={9.5} ls="0.12em">BETA · FOUNDER · DENVER</MonoEyebrow>
      </div>
    </section>
  );
}

function MeHubMobile({
  productEmail = true, tier = "premium", exportState = "rest", wait = "43 minutes",
  scrollTo = null, w = 393, onToggleEmail = () => {}, onExport = () => {}, insetTop = 0, insetBottom = 0,
}) {
  const { MeShellMobile, NotificationsSection, AccountSection, DangerZoneSection } = window;
  return (
    <MeShellMobile scrollTo={scrollTo === "top" ? null : scrollTo} w={w} insetTop={insetTop} insetBottom={insetBottom}>
      <MeProfileBlock />
      <MeStubSection title="Plan" rows={[{ label: "Founder · $0 forever", detail: "Beta invite #004" }]} />
      <MeStubSection title="Appearance" rows={[{ label: "Theme", detail: "Electric" }]} />
      <section data-screen-label="notifications">
        <MeSectionLabel>Notifications</MeSectionLabel>
        <NotificationsSection productEmail={productEmail} tier={tier} onToggleEmail={onToggleEmail} />
      </section>
      <MeStubSection title="Connections" rows={[{ label: "Spotify", detail: "Not connected" }]} />
      <MeStubSection title="Submitted prices" count="12 LIVE" rows={[{ label: "Your price submissions", detail: "12 live · 3 confirmed this month" }]} />
      <section data-screen-label="account">
        <MeSectionLabel>Account</MeSectionLabel>
        <AccountSection exportState={exportState} wait={wait} onExport={onExport} />
      </section>
      <section data-screen-label="danger-zone">
        <MeSectionLabel>Danger zone</MeSectionLabel>
        <DangerZoneSection showRail={false} />
      </section>
    </MeShellMobile>
  );
}

function MeNotifDesktop({ productEmail = true, tier = "premium", onToggleEmail = () => {} }) {
  const { MeShellDesktop, NotificationsSection } = window;
  return (
    <MeShellDesktop active="notifications" title="Notifications"
      subtitle="What reaches you, and where. Push is per-device; email is per-account.">
      <NotificationsSection productEmail={productEmail} tier={tier} onToggleEmail={onToggleEmail} />
    </MeShellDesktop>
  );
}

function MeAccountDesktop({ exportState = "rest", wait = "43 minutes", onExport = () => {} }) {
  const { MeShellDesktop, AccountSection } = window;
  return (
    <MeShellDesktop active="account" title="Account" subtitle="Who you are to us, and how to take it with you.">
      <AccountSection exportState={exportState} wait={wait} onExport={onExport} />
    </MeShellDesktop>
  );
}

// Separate desktop page — Delete account lives here, not in Account.
function MeDangerDesktop() {
  const { MeShellDesktop, DangerZoneSection } = window;
  return (
    <MeShellDesktop active="danger" title="Danger zone" subtitle="The exits.">
      <DangerZoneSection showRail={false} />
    </MeShellDesktop>
  );
}

Object.assign(window, { MeHubMobile, MeNotifDesktop, MeAccountDesktop, MeDangerDesktop, MeSectionLabel, MeStubSection, MeProfileBlock });

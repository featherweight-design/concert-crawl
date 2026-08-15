// email-export.jsx — the two new controls.
//   <EmailFromUsGroup on/>       — product-email opt-out. Own group, outside the
//                                  push master AND outside entitlement.
//   <BillingFootnote/>           — billing email explained as prose, not a row.
//   <DataExportRow state/>       — rest · pending · limited · failed.
//   <NotificationsSection/>      — the section in context (push + gated + email).
//   <AccountSection/>            — the section in context (export in place).

const EX_COPY = {
  email: {
    rail: "Email from us",
    label: "News, offers, and the occasional nudge",
    onDetail: "Rare. A discount, or a heads-up when a gift is running out.",
    offDetail: "Off. Nothing from us but billing.",
    footnote: "Billing email always sends: receipts, a failed charge, a card about to expire. Those aren't news, they're your subscription talking, and missing one is how people lose a plan without knowing why.",
  },
  export: {
    label: "Download your data",
    restDetail: "Everything we store on you, as a file. Takes a second.",
    pendingDetail: "Putting your file together…",
    chipRest: "JSON",
    chipPending: "WORKING",
    limited: (wait) => `One export an hour. Try again in ${wait}.`,
    limitedRail: "HOLD ON",
    failed: "Signal lost. The export didn't come through. Give it another go.",
    failedRail: "DIDN'T WORK",
  },
};

// ── Product-email group ───────────────────────────────────────
// Sits between the push group and the entitlement-gated "Artists you
// follow" group. Above the gate on purpose: a control that free users
// need most must never sit under an upgrade card.
function EmailFromUsGroup({ on = true, onToggle = () => {}, showRail = true }) {
  const { SectionRail, SettingsRowGroup, MeToggleRow, GroupFootnote, MeIcon } = window;
  const C = EX_COPY.email;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }} data-screen-label="email-from-us">
      {showRail && <SectionRail title={C.rail} />}
      <SettingsRowGroup>
        <MeToggleRow
          leading={MeIcon.mail}
          label={C.label}
          detail={on ? C.onDetail : C.offDetail}
          on={on} last onToggle={onToggle} />
      </SettingsRowGroup>
      <GroupFootnote>{C.footnote}</GroupFootnote>
    </div>
  );
}

// ── Status line — lives BENEATH the row, never inside it ──────
function ExportStatusLine({ tone = "warning", rail, children }) {
  const { MonoEyebrow, MeIcon, ME_UI } = window;
  const color = tone === "danger" ? "var(--danger)" : "var(--warning)";
  return (
    <div role="status" style={{
      display: "flex", gap: 9, alignItems: "flex-start", padding: "10px 12px",
      borderRadius: 10, background: `color-mix(in oklch, ${color} 8%, var(--surface-1))`,
      border: `1px solid color-mix(in oklch, ${color} 34%, var(--border))`,
    }}>
      <span style={{ color, marginTop: 1, flexShrink: 0, display: "inline-flex" }}>{tone === "danger" ? MeIcon.alert : MeIcon.clock}</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
        <MonoEyebrow size={9} color={color} ls="0.12em">{rail}</MonoEyebrow>
        <span style={{ fontFamily: ME_UI, fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.45, textWrap: "pretty" }}>{children}</span>
      </div>
    </div>
  );
}

function SpinnerDot() {
  return (
    <>
      <style>{`@keyframes ex-spin{to{transform:rotate(360deg)}}`}</style>
      <svg width="11" height="11" viewBox="0 0 12 12" style={{ animation: "ex-spin 800ms linear infinite" }} aria-hidden="true">
        <circle cx="6" cy="6" r="4.6" stroke="currentColor" strokeWidth="1.6" fill="none" opacity="0.28" />
        <path d="M6 1.4A4.6 4.6 0 0 1 10.6 6" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </svg>
    </>
  );
}

// ── Data export row ──────────────────────────────────────────
// Whole row is the button — the Save-to-calendar precedent. Pending is
// inline (the row reports on itself); refusals are a status line below,
// so the row's own copy never has to double as an error message.
function DataExportRow({ state = "rest", wait = "43 minutes", onPress = () => {}, showRail = true, railTitle = "Your data" }) {
  const { SectionRail, MonoEyebrow, MeIcon, ME_UI, ME_MONO } = window;
  const C = EX_COPY.export;
  const pending = state === "pending";
  const limited = state === "limited";
  const disabled = pending || limited;
  const [hover, setHover] = React.useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }} data-screen-label={"export-" + state}>
      {showRail && <SectionRail title={railTitle} meta="1 / HOUR" />}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button type="button" onClick={disabled ? undefined : onPress} disabled={disabled} aria-busy={pending || undefined}
          onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
          style={{
            all: "unset", boxSizing: "border-box", display: "flex", alignItems: "center", gap: 14, width: "100%",
            padding: "14px 16px", borderRadius: 12, fontFamily: ME_UI,
            background: hover && !disabled ? "var(--surface-2)" : "var(--surface-1)",
            border: "1px solid var(--border)", color: "var(--fg)",
            cursor: disabled ? "default" : "pointer", opacity: limited ? 0.62 : 1,
            transition: "background 120ms ease, opacity 120ms ease",
          }}>
          <span style={{
            width: 36, height: 36, borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center",
            background: "var(--surface-2)", color: pending ? "var(--fg-muted)" : "var(--signal)", flexShrink: 0,
          }}>{pending ? <SpinnerDot /> : MeIcon.download}</span>
          <span style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 3, textAlign: "left" }}>
            <span style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: "-0.005em" }}>{C.label}</span>
            <span style={{ fontFamily: ME_MONO, fontSize: 11, color: "var(--fg-muted)", letterSpacing: "0.02em", lineHeight: 1.4 }}>
              {pending ? C.pendingDetail : C.restDetail}
            </span>
          </span>
          <span style={{
            fontFamily: ME_MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
            color: pending ? "var(--fg-subtle)" : "var(--signal)",
            border: `1px solid color-mix(in oklch, ${pending ? "var(--fg-subtle)" : "var(--signal)"} 50%, transparent)`,
            padding: "3px 7px", borderRadius: 3, flexShrink: 0,
          }}>{pending ? C.chipPending : C.chipRest}</span>
        </button>
        {limited && <ExportStatusLine tone="warning" rail={C.limitedRail}>{C.limited(wait)}</ExportStatusLine>}
        {state === "failed" && <ExportStatusLine tone="danger" rail={C.failedRail}>{C.failed}</ExportStatusLine>}
      </div>
    </div>
  );
}

// ── Notifications section, in context ────────────────────────
// Order: push master + subs → EMAIL FROM US → Artists you follow
// (entitlement-gated, holds the weekly digest).
function NotificationsSection({ productEmail = true, onToggleEmail = () => {}, tier = "premium", pushOn = true }) {
  const { SectionRail, SettingsRowGroup, MeToggleRow, MeIcon, ME_UI, MonoEyebrow } = window;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }} data-screen-label="push-group">
        <SectionRail title="Push" meta={pushOn ? "ON" : "OFF"} metaColor={pushOn ? "var(--signal)" : "var(--fg-subtle)"} />
        <SettingsRowGroup>
          <MeToggleRow leading={MeIcon.bell} label="Push notifications" detail={pushOn ? "On for this device." : "Off. Nothing buzzes."} on={pushOn} last={!pushOn} />
          {pushOn && <>
            <MeToggleRow label="New show alerts" detail="An artist you follow books a Denver date." on last={false} />
            <MeToggleRow label="Watch updates" detail="Something changes on a show you're watching." on last={false} />
            <MeToggleRow label="Price drops" detail="A price you're watching falls." on last />
          </>}
        </SettingsRowGroup>
      </div>

      <EmailFromUsGroup on={productEmail} onToggle={onToggleEmail} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }} data-screen-label="follow-group">
        <SectionRail title="Artists you follow" meta={tier === "free" ? "PREMIUM" : "3 FOLLOWED"} metaColor={tier === "free" ? "var(--accent)" : "var(--fg-subtle)"} />
        {tier === "free" ? (
          <div style={{ background: "var(--surface-1)", border: "1px solid color-mix(in oklch, var(--accent) 34%, var(--border))", borderRadius: 12, padding: "16px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--accent)" }}>{MeIcon.star}<MonoEyebrow size={9.5} color="var(--accent)">PREMIUM</MonoEyebrow></div>
            <div style={{ fontFamily: ME_UI, fontSize: 14.5, fontWeight: 800, letterSpacing: "-0.01em" }}>New show alerts</div>
            <div style={{ fontFamily: ME_UI, fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.5, textWrap: "pretty" }}>Following artists is part of Premium. Upgrade and these switch on.</div>
            <div style={{ marginTop: 4 }}>
              <span style={{ display: "inline-flex", padding: "9px 14px", borderRadius: 999, background: "var(--signal)", color: "var(--fg-on-accent)", fontFamily: ME_UI, fontSize: 13, fontWeight: 800 }}>See Premium</span>
            </div>
          </div>
        ) : (
          <SettingsRowGroup>
            <MeToggleRow label="Weekly digest" detail="Email, Thursday mornings. Everything your artists announced." on last />
          </SettingsRowGroup>
        )}
      </div>
    </div>
  );
}

// ── Account section, in context ──────────────────────────────
// Export sits as a sibling of the email / password rows, last thing in
// Account, immediately above Danger zone.
function AccountSection({ exportState = "rest", wait = "43 minutes", onExport = () => {} }) {
  const { SectionRail, SettingsRowGroup, MeNavRow, MeStaticRow, MonoEyebrow, ME_UI, MeIcon } = window;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }} data-screen-label="account-group">
        <SectionRail title="Account" meta="FOUNDER" />
        <SettingsRowGroup>
          <MeNavRow label="Email address" detail="hugh@concertcrawl.app" />
          <MeNavRow label="Password" detail="Last changed in March" />
          <MeStaticRow label="Member since" detail="May 2026 · invite #004" last trailing={<MonoEyebrow size={9}>BETA</MonoEyebrow>} />
        </SettingsRowGroup>
      </div>
      <DataExportRow state={exportState} wait={wait} onPress={onExport} />
    </div>
  );
}

// Danger zone is its own section / its own desktop page — never inside Account.
function DangerZoneSection({ showRail = true }) {
  const { SectionRail, ME_UI } = window;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }} data-screen-label="danger">
      {showRail && <SectionRail title="Danger zone" meta="NO UNDO" metaColor="var(--danger)" />}
      <div style={{ background: "var(--surface-1)", border: "1px solid color-mix(in oklch, var(--danger) 30%, var(--border))", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: ME_UI, fontSize: 14.5, fontWeight: 700 }}>Delete account</div>
          <div style={{ fontFamily: ME_UI, fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.4 }}>Gone means gone.</div>
        </div>
        <span style={{ fontFamily: window.ME_MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--danger)", border: "1px solid color-mix(in oklch, var(--danger) 50%, transparent)", padding: "6px 10px", borderRadius: 6 }}>Delete…</span>
      </div>
    </div>
  );
}

Object.assign(window, { EX_COPY, EmailFromUsGroup, ExportStatusLine, DataExportRow, NotificationsSection, AccountSection, DangerZoneSection, SpinnerDot });

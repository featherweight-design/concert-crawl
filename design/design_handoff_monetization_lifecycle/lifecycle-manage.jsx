// lifecycle-manage.jsx — #780 Manage subscription sheet
//
//   <ManageSheet variant tier periodEnd/>   variant ∈ "mobile" | "desktop"
//
// Entry: "Manage subscription" CTA on the active Plan card.
// Design's call (brief): TWO visually separated groups —
//   • "On Concert Crawl" — in-app emotional/retention actions (change plan, cancel)
//   • "Billing & receipts" — Stripe-portal tooling, each row tagged `Stripe ↗`
// Rationale: the in-app/portal split is a real routing distinction; grouping it
// reads cleaner than a flat list peppered with chips, and front-loads the
// actions where our voice + retention live.

const { MMark, TierBadge, MonoEyebrow, RailHeader, SheetChrome, ModalChrome, DragHandle } = window;

function PortalChip() {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 7px", borderRadius: 5,
      background: "var(--surface-2)", border: "1px solid var(--border-strong)",
      fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 8.5,
      letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-muted)",
      whiteSpace: "nowrap", flexShrink: 0,
    }}>
      Stripe
      <svg width="9" height="9" viewBox="0 0 12 12" style={{ marginTop: -1 }}>
        <path d="M4 8 L8 4 M8 4 H4.6 M8 4 V7.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
}

function ManageRow({ icon, label, sub, portal, danger }) {
  return (
    <button style={{
      all: "unset", cursor: "pointer", boxSizing: "border-box", width: "100%",
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 13px", borderRadius: 11,
      background: "var(--surface-1)", border: "1px solid var(--border)",
    }}>
      <span style={{
        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
        background: "var(--surface-2)", border: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: danger ? "var(--danger)" : "var(--fg-muted)",
      }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 14, letterSpacing: "-0.01em", color: danger ? "var(--danger)" : "var(--fg)" }}>{label}</div>
        <div style={{ fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 12, color: "var(--fg-subtle)", letterSpacing: "-0.005em" }}>{sub}</div>
      </div>
      {portal
        ? <PortalChip/>
        : <svg width="15" height="15" viewBox="0 0 14 14" style={{ flexShrink: 0, color: "var(--fg-subtle)" }}><path d="M5 3 L9 7 L5 11" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>}
    </button>
  );
}

const I = {
  swap: <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 5 H11 M9 3 L11 5 L9 7 M13 11 H5 M7 9 L5 11 L7 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  leave: <svg width="16" height="16" viewBox="0 0 16 16"><path d="M9 3 H4 V13 H9 M11 5.5 L13.5 8 L11 10.5 M13.5 8 H6.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  card: <svg width="16" height="16" viewBox="0 0 16 16"><rect x="2" y="4" width="12" height="8.5" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M2 6.8 H14" stroke="currentColor" strokeWidth="1.5"/></svg>,
  receipt: <svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 2.5 V13.5 L6 12.5 L8 13.5 L10 12.5 L12 13.5 V2.5 Z M6 6 H10 M6 8.5 H10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  mail: <svg width="16" height="16" viewBox="0 0 16 16"><rect x="2" y="3.5" width="12" height="9" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M2.6 4.5 L8 8.5 L13.4 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  globe: <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M2.5 8 H13.5 M8 2.5 C10 5 10 11 8 13.5 C6 11 6 5 8 2.5" fill="none" stroke="currentColor" strokeWidth="1.3"/></svg>,
};

function ManageBody({ tier = "premium", periodEnd = "Jul 15", wide }) {
  const priceText = tier === "founder" ? "$3/MO" : tier === "supporter" ? "$2/MO" : "$5/MO";
  const tierName = tier === "founder" ? "Founder" : tier === "supporter" ? "Supporter" : "Premium";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: "Inter, system-ui", color: "var(--fg)" }}>
      <RailHeader tone="signal" eyebrow={`Manage · ${tierName}`} code={priceText}/>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ fontWeight: 900, fontSize: wide ? 26 : 23, letterSpacing: "-0.03em", lineHeight: 1.05 }}>Manage subscription</div>
          <div style={{ fontWeight: 500, fontSize: 13, color: "var(--fg-muted)", letterSpacing: "-0.005em" }}>
            {tierName} · renews {periodEnd}. Change it, pause it, or just grab a receipt.
          </div>
        </div>
        {wide && <TierBadge tier={tier} size="lg"/>}
      </div>

      {/* GROUP 1 — in-app */}
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        <MonoEyebrow size={9.5} letterSpacing="0.16em">On Concert Crawl</MonoEyebrow>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <ManageRow icon={I.swap} label="Change plan" sub="Upgrade, downgrade, or switch tiers"/>
          <ManageRow icon={I.leave} label="Cancel subscription" sub={`Keep ${tierName} until ${periodEnd}, then roll to Free`}/>
        </div>
      </div>

      {/* GROUP 2 — Stripe portal */}
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <MonoEyebrow size={9.5} letterSpacing="0.16em">Billing & receipts</MonoEyebrow>
          <MonoEyebrow size={9} color="var(--fg-subtle)" letterSpacing="0.12em">Opens Stripe in a new tab</MonoEyebrow>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <ManageRow icon={I.card} label="Payment method" sub="Update the card on file" portal/>
          <ManageRow icon={I.receipt} label="Invoices & receipts" sub="Download past charges" portal/>
          <ManageRow icon={I.mail} label="Billing email" sub="Where receipts get sent" portal/>
          <ManageRow icon={I.globe} label="Tax & region" sub="Country, VAT, tax ID" portal/>
        </div>
      </div>

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--fg-subtle)",
        letterSpacing: "0.12em", textTransform: "uppercase",
      }}>
        <MMark size={13}/> Stripe handles cards · we never see them
      </div>
    </div>
  );
}

function ManageSheet({ variant = "mobile", tier = "premium", periodEnd = "Jul 15" }) {
  if (variant === "desktop") {
    return (
      <ModalChrome width={460}>
        <div style={{ padding: "24px 26px 22px" }}>
          <ManageBody tier={tier} periodEnd={periodEnd} wide/>
        </div>
      </ModalChrome>
    );
  }
  return (
    <SheetChrome height="auto">
      <DragHandle/>
      <div style={{ padding: "4px 16px 22px" }}>
        <ManageBody tier={tier} periodEnd={periodEnd}/>
      </div>
    </SheetChrome>
  );
}

Object.assign(window, { ManageSheet, ManageRow, PortalChip });

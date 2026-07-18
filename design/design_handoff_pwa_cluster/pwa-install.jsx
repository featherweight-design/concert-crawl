// pwa-install.jsx — #969 install-prompt polish
// Header slot (installable / post-dismiss / iOS variant) + the iOS "Here's how"
// bottom-sheet walkthrough. Tokens only. Primary CTA = --signal.

const { PWA_FONT: IF, PWA_MONO: IM } = window;
const { CCMark, Wordmark, Eyebrow, BottomSheet, PrimaryButton, Icon, AccountButton, SearchCircle } = window;
const { INSTALL_COPY } = window;

// ── Shared app chrome — hosts the install slot + offline pill ──────────────
// Matches the real browse AppBar. Mobile: mark + wordmark left (shrinkable so a
// wide right cluster still fits at 320), then the optional slot + a search
// circle. Desktop: mark + wordmark + nav, slot next to the account menu.
// Account itself lives in the bottom tab bar on mobile — never top-right.
function AppChrome({ slot = null, desktop = false, tight = false }) {
  const showWordmark = !(tight && !desktop);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 10, padding: desktop ? "16px 24px" : "56px 14px 10px", background: "var(--bg)",
      borderBottom: desktop ? "1px solid var(--border)" : "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: "0 1 auto" }}>
        <div style={{ flexShrink: 0, display: "flex" }}><CCMark size={desktop ? 30 : 28} /></div>
        {showWordmark && (
          <div style={{ minWidth: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
            <Wordmark size={desktop ? 19 : 17} />
          </div>
        )}
        {desktop && (
          <nav style={{ display: "flex", gap: 20, marginLeft: 22, flexShrink: 0 }} aria-label="Primary">
            {["Browse", "Venues", "Watching"].map((l, i) => (
              <span key={l} style={{ fontFamily: IF, fontWeight: 600, fontSize: 14,
                color: i === 0 ? "var(--fg)" : "var(--fg-muted)" }}>{l}</span>
            ))}
          </nav>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {slot}
        {desktop ? <AccountButton /> : <SearchCircle />}
      </div>
    </div>
  );
}

// ── Install slot — the action in the top-right chrome ──────────────────────
// variant: "installable" (native prompt available) | "ios" (opens sheet).
// Real <button>, aria-label, ≥44px tap target.
function InstallSlot({ variant = "installable", onClick, compact = false }) {
  const label = INSTALL_COPY.slotLabel;
  return (
    <button type="button" onClick={onClick} aria-label={INSTALL_COPY.slotAria}
      style={{ all: "unset", boxSizing: "border-box", cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 7,
        minHeight: 44, padding: compact ? "0 12px" : "0 14px", borderRadius: 999,
        border: "1px solid color-mix(in oklab, var(--signal) 45%, transparent)",
        background: "color-mix(in oklab, var(--signal) 12%, transparent)",
        color: "var(--signal)", fontFamily: IF, fontWeight: 700, fontSize: 13,
        letterSpacing: "-0.01em" }}>
      <Icon name={variant === "ios" ? "share" : "download"} size={15} color="var(--signal)" />
      {label}
    </button>
  );
}

// ── iOS action-sheet row (illustration inside the walkthrough) ─────────────
function IosSheetRowMock() {
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)",
      background: "var(--surface-1)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "11px 14px", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontFamily: IF, fontSize: 13.5, color: "var(--fg-muted)" }}>Copy</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="8" y="8" width="12" height="12" rx="2.5" stroke="var(--fg-subtle)" strokeWidth="1.6" />
          <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" stroke="var(--fg-subtle)" strokeWidth="1.6" />
        </svg>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "11px 14px", background: "color-mix(in oklab, var(--signal) 10%, transparent)" }}>
        <span style={{ fontFamily: IF, fontSize: 13.5, fontWeight: 700, color: "var(--fg)" }}>Add to Home Screen</span>
        <div style={{ width: 22, height: 22, borderRadius: 5,
          border: "1.6px solid var(--signal)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="plus" size={13} color="var(--signal)" />
        </div>
      </div>
    </div>
  );
}

// ── One walkthrough step ───────────────────────────────────────────────────
function Step({ step, illo }) {
  return (
    <div style={{ display: "flex", gap: 13 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: "color-mix(in oklab, var(--signal) 14%, transparent)",
          color: "var(--signal)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={step.icon} size={18} color="var(--signal)" />
        </div>
        <span style={{ fontFamily: IM, fontSize: 9, fontWeight: 700, color: "var(--fg-subtle)",
          letterSpacing: "0.1em" }}>{step.n}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
        <div style={{ fontFamily: IF, fontWeight: 800, fontSize: 15, color: "var(--fg)",
          letterSpacing: "-0.01em", textWrap: "pretty" }}>{step.label}</div>
        <div style={{ fontFamily: IF, fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.45,
          marginTop: 2, textWrap: "pretty" }}>{step.detail}</div>
        {illo && <div style={{ marginTop: 10 }}>{illo}</div>}
      </div>
    </div>
  );
}

// ── iOS "Here's how" bottom sheet ──────────────────────────────────────────
function IosHowToSheet({ open, onClose }) {
  const c = INSTALL_COPY.sheet;
  return (
    <BottomSheet open={open} onClose={onClose} labelId="ios-howto-title">
      <Eyebrow color="var(--accent)" style={{ marginBottom: 8 }}>{c.eyebrow}</Eyebrow>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 4 }}>
        <div style={{ flexShrink: 0, marginTop: 2 }}><CCMark size={40} /></div>
        <div>
          <h2 id="ios-howto-title" style={{ margin: 0, fontFamily: IF, fontWeight: 900,
            fontSize: 20, letterSpacing: "-0.02em", color: "var(--fg)", lineHeight: 1.15 }}>{c.title}</h2>
          <p style={{ margin: "6px 0 0", fontFamily: IF, fontSize: 13.5, color: "var(--fg-muted)",
            lineHeight: 1.45, textWrap: "pretty" }}>{c.sub}</p>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, margin: "20px 0 8px" }}>
        <Step step={c.steps[0]} />
        <Step step={c.steps[1]} illo={<IosSheetRowMock />} />
        <Step step={c.steps[2]} illo={
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{ display: "inline-flex", alignItems: "center", padding: "7px 18px",
              borderRadius: 9, background: "var(--signal)", color: "var(--fg-on-accent)",
              fontFamily: IF, fontWeight: 700, fontSize: 14 }}>Add</div>
          </div>
        } />
      </div>
      <PrimaryButton full onClick={onClose} style={{ marginTop: 12 }}>{c.done}</PrimaryButton>
    </BottomSheet>
  );
}

// ── Post-dismiss note (the artboard-only explainer of the persistence UX) ──
function DismissNote() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
      borderRadius: 12, background: "var(--surface-1)", border: "1px solid var(--border)" }}>
      <Icon name="check" size={16} color="var(--fg-subtle)" />
      <span style={{ fontFamily: IF, fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.4,
        textWrap: "pretty" }}>{INSTALL_COPY.dismissNote}</span>
    </div>
  );
}

Object.assign(window, { AppChrome, InstallSlot, IosHowToSheet, IosSheetRowMock, InstallStep: Step, DismissNote });

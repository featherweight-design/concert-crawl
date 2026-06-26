// lifecycle-deletion.jsx — #780 Account-deletion while subscribed
//
//   <DeleteWarningSheet variant gifted periodEnd/>   first sheet (warning + dual CTA)
//   <DeleteConfirmSheet variant email/>              second sheet (type-email-to-confirm)
//
// Brief §7: deleting cancels the sub IMMEDIATELY (no grace) and wipes everything.
// Dual CTAs on sheet 1: a [Cancel subscription only] off-ramp (→ cancel flow,
// keeps the grace path) and the [Delete account] danger advance.
//
// Voice (Design's call): mostly plain — this is the one place Sour Patch doesn't
// joke. Sheet 1 carries exactly one small wry line; sheet 2 is fully sober.
// Gifted users get a body that swaps the Stripe-cancel language for "cancels the comp."

const { MonoEyebrow, RailHeader, SheetChrome, ModalChrome, DragHandle } = window;

function DeleteSurface({ variant, width = 440, children }) {
  if (variant === "desktop") {
    return <ModalChrome width={width}><div style={{ padding: "24px 26px 22px" }}>{children}</div></ModalChrome>;
  }
  return (
    <SheetChrome height="auto">
      <DragHandle/>
      <div style={{ padding: "4px 16px 22px" }}>{children}</div>
    </SheetChrome>
  );
}

const REMOVED = [
  "Saved shows — everything you're Watching",
  "Concert history — every show you've logged",
  "Following — all the artists you track",
  "Submitted prices — your contributions",
  "Your account, profile, and all data",
];

// ── Sheet 1 — warning ────────────────────────────────────────
function DeleteWarningSheet({ variant = "mobile", gifted = false, periodEnd = "Jul 15" }) {
  const wide = variant === "desktop";
  return (
    <DeleteSurface variant={variant} width={460}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: "Inter, system-ui", color: "var(--fg)" }}>
        <RailHeader tone="warning" eyebrow="Delete account" code="PERMANENT"/>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontWeight: 900, fontSize: wide ? 27 : 23, letterSpacing: "-0.03em", lineHeight: 1.08 }}>
            {gifted ? "You're on lifetime Premium." : `You're on Premium until ${periodEnd}.`}
          </div>
          <div style={{ fontWeight: 500, fontSize: wide ? 14.5 : 13.5, color: "var(--fg-muted)", letterSpacing: "-0.005em", lineHeight: 1.5 }}>
            {gifted
              ? "Deleting your account gives up the comp and removes everything — right now, not on any renewal date. "
              : `Deleting your account cancels Premium right now — no grace period, no ${periodEnd}. It removes everything. `}
            This can't be undone; there's no restore-from-trash.
          </div>
        </div>

        {/* what gets removed — danger-tinted rail */}
        <div style={{
          padding: "14px 14px", borderRadius: 12,
          background: "color-mix(in oklch, var(--danger) 7%, var(--surface-1))",
          border: "1px solid color-mix(in oklch, var(--danger) 30%, var(--border))",
          display: "flex", flexDirection: "column", gap: 9,
        }}>
          <MonoEyebrow size={9.5} color="var(--danger)" letterSpacing="0.16em">Gone for good</MonoEyebrow>
          {REMOVED.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 13, color: "var(--fg)", letterSpacing: "-0.005em" }}>
              <svg width="13" height="13" viewBox="0 0 12 12" style={{ flexShrink: 0, marginTop: 2.5 }}><path d="M3 3 L9 9 M9 3 L3 9" fill="none" stroke="var(--danger)" strokeWidth="1.7" strokeLinecap="round"/></svg>
              <span>{r}</span>
            </div>
          ))}
        </div>

        {/* off-ramp note */}
        <div style={{ fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.5 }}>
          Just want to stop paying? You don't have to delete anything — cancel the subscription and keep your account, your saved shows, and your history.
        </div>

        {/* dual CTAs — off-ramp ghost + delete danger */}
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <button style={{
            all: "unset", cursor: "pointer", textAlign: "center", boxSizing: "border-box", width: "100%",
            padding: "13px 16px", borderRadius: 12, background: "transparent",
            border: "1px solid var(--border-strong)", color: "var(--fg)",
            fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 14,
          }}>Cancel subscription only — keep my account</button>
          <button style={{
            all: "unset", cursor: "pointer", textAlign: "center", boxSizing: "border-box", width: "100%",
            padding: "13px 16px", borderRadius: 12,
            background: "var(--danger)", color: "var(--fg-on-accent)",
            fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 14,
          }}>Delete account</button>
        </div>
        <div style={{ textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--fg-subtle)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          {gifted ? "No card on file · nothing to refund" : "Cancels immediately · no refund for the current cycle"}
        </div>
      </div>
    </DeleteSurface>
  );
}

// ── Sheet 2 — confirm-twice (type email) ─────────────────────
function DeleteConfirmSheet({ variant = "mobile", email = "hugh@featherweight.design" }) {
  const wide = variant === "desktop";
  const [val, setVal] = React.useState("");
  const match = val.trim().toLowerCase() === email.toLowerCase();
  return (
    <DeleteSurface variant={variant} width={440}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: "Inter, system-ui", color: "var(--fg)" }}>
        <RailHeader tone="warning" eyebrow="Delete account · confirm" code="LAST STEP"/>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontWeight: 900, fontSize: wide ? 27 : 23, letterSpacing: "-0.03em", lineHeight: 1.08 }}>Type your email to confirm.</div>
          <div style={{ fontWeight: 500, fontSize: wide ? 14.5 : 13.5, color: "var(--fg-muted)", letterSpacing: "-0.005em", lineHeight: 1.5 }}>
            This permanently deletes your account and everything in it. Enter <strong style={{ color: "var(--fg)" }}>{email}</strong> below to confirm.
          </div>
        </div>

        {/* email input */}
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <MonoEyebrow size={9.5} letterSpacing="0.16em">Your email</MonoEyebrow>
          <input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder={email}
            spellCheck={false}
            style={{
              all: "unset", boxSizing: "border-box", width: "100%",
              padding: "13px 14px", borderRadius: 11,
              background: "var(--surface-1)",
              border: `1px solid ${match ? "color-mix(in oklch, var(--danger) 55%, var(--border-strong))" : "var(--border-strong)"}`,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 13.5, color: "var(--fg)",
              letterSpacing: "0.01em",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 7, minHeight: 14 }}>
            {match && (
              <>
                <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6 L5 9 L10 3" fill="none" stroke="var(--danger)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <MonoEyebrow size={9} color="var(--danger)" letterSpacing="0.12em">Match · deletion unlocked</MonoEyebrow>
              </>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <button disabled={!match} style={{
            all: "unset", cursor: match ? "pointer" : "default", textAlign: "center", boxSizing: "border-box", width: "100%",
            padding: "13px 16px", borderRadius: 12,
            background: match ? "var(--danger)" : "var(--surface-2)",
            color: match ? "var(--fg-on-accent)" : "var(--fg-subtle)",
            border: match ? "none" : "1px solid var(--border)",
            opacity: match ? 1 : 0.7,
            fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 14,
            boxShadow: match ? "0 0 18px color-mix(in oklch, var(--danger) 28%, transparent)" : "none",
          }}>Delete my account, permanently</button>
          <button style={{
            all: "unset", cursor: "pointer", textAlign: "center", boxSizing: "border-box", width: "100%",
            padding: "12px 16px", borderRadius: 12, background: "transparent",
            border: "1px solid var(--border-strong)", color: "var(--fg-muted)",
            fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13.5,
          }}>Keep my account</button>
        </div>
        <div style={{ textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--fg-subtle)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          One click · no second chance · no undo
        </div>
      </div>
    </DeleteSurface>
  );
}

Object.assign(window, { DeleteWarningSheet, DeleteConfirmSheet });

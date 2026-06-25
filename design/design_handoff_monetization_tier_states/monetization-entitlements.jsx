// monetization-entitlements.jsx — Round 5
// Visual rendering of the brief §6 canonical entitlements matrix.
// 7 features × 6 user states, four cell semantics:
//   visible-active     → feature renders, fully usable
//   paywall-on-tap     → visible-locked; tap opens the Free→Premium mini sheet
//   tier-picker-on-tap → visible-locked; tap opens the full tier picker
//   hidden             → not rendered; no upsell affordance
//
// Active affordances are visible-locked when gated; background features stay
// hidden (hybrid gating, §4). Mobile = compact icon grid; desktop = full table.
//
// Exports (window): EntitlementsMatrix, ENT_STATES, ENT_GROUPS, entCell

const { MonoEyebrow, RailHeader } = window;

const ENT_STATES = [
  { key: "logged-out", label: "Logged out", short: "LO" },
  { key: "free",       label: "Free",       short: "FR" },
  { key: "supporter",  label: "Supporter",  short: "SU" },
  { key: "premium",    label: "Premium",    short: "PR", hot: true },
  { key: "founder",    label: "Founder",    short: "FO", hot: true },
  { key: "gifted",     label: "Gifted",     short: "GI", hot: true },
];

const ENT_GROUPS = [
  {
    label: "Active affordances",
    note: "A visible control sits on the page. When gated it renders visible-locked (lock + “Premium” chip).",
    features: [
      { key: "watching",  label: "Watching",        sub: "the heart", freeForSignedIn: true },
      { key: "history",   label: "Concert history", sub: "attended" },
      { key: "export",    label: "Calendar export", sub: "Apple + Google" },
      { key: "following", label: "Following",       sub: "artists" },
    ],
    kind: "affordance",
  },
  {
    label: "Background features",
    note: "No native on-page surface to lock against — these stay hidden until Premium. No scattered upsell prompts.",
    features: [
      { key: "alerts",  label: "Alerts",           sub: "push + email" },
      { key: "spotify", label: "Spotify sync",     sub: null },
      { key: "drops",   label: "Price-drop alerts", sub: null },
    ],
    kind: "background",
  },
];

const PAID = ["premium", "founder", "gifted"];

// derive the cell value from feature + group + state
// Amendment 2026-06-25: Watching is a Free feature for all signed-in users
// (cheap to operate — it's just tracking a show in a DB). Only logged-out is
// gated, routing to the full picker. Premium gating stays on attending/history,
// follows, and alerts.
function entCell(feature, groupKind, stateKey) {
  if (feature && feature.freeForSignedIn) {
    return stateKey === "logged-out" ? "picker" : "active";
  }
  if (PAID.includes(stateKey)) return "active";
  if (groupKind === "background") return "hidden";
  // active affordance, non-paid:
  return stateKey === "logged-out" ? "picker" : "paywall";
}

const CELL_META = {
  active: { label: "Active",  routeNote: "Renders fully · usable" },
  paywall: { label: "Locked", routeNote: "Tap → upgrade sheet" },
  picker: { label: "Locked",  routeNote: "Tap → tier picker" },
  hidden: { label: "Hidden",  routeNote: "Not rendered" },
};

// ── glyphs ───────────────────────────────────────────────────
function CheckGlyph({ size = 14, color = "var(--signal)" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14"><path d="M3 7.5 L6 10.5 L11 4" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  );
}
function LockGlyph({ size = 13, color = "var(--fg-muted)" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14">
      <rect x="2.5" y="6" width="9" height="6.5" rx="1.4" fill="none" stroke={color} strokeWidth="1.4"/>
      <path d="M4.5 6 V4.3 a2.5 2.5 0 0 1 5 0 V6" fill="none" stroke={color} strokeWidth="1.4"/>
    </svg>
  );
}

// ── desktop table cell ───────────────────────────────────────
function DesktopCell({ value }) {
  if (value === "active") {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 10px", borderRadius: 999,
        background: "color-mix(in oklch, var(--signal) 14%, transparent)", border: "1px solid color-mix(in oklch, var(--signal) 36%, transparent)" }}>
        <CheckGlyph size={13}/>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--signal)" }}>Active</span>
      </div>
    );
  }
  if (value === "hidden") {
    return <span style={{ color: "var(--fg-subtle)", fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>—</span>;
  }
  // paywall or picker — both visible-locked, differ by route
  const isPicker = value === "picker";
  const c = isPicker ? "var(--accent)" : "var(--fg-muted)";
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 9px", borderRadius: 999,
        background: isPicker ? "color-mix(in oklch, var(--accent) 10%, transparent)" : "var(--surface-2)",
        border: `1px solid ${isPicker ? "color-mix(in oklch, var(--accent) 34%, transparent)" : "var(--border-strong)"}` }}>
        <LockGlyph size={12} color={c}/>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: c }}>Premium</span>
      </div>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 8.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fg-subtle)" }}>
        {isPicker ? "→ picker" : "→ sheet"}
      </span>
    </div>
  );
}

// ── mobile compact cell (icon only) ──────────────────────────
function MobileCell({ value }) {
  if (value === "active") return <CheckGlyph size={15}/>;
  if (value === "hidden") return <span style={{ color: "var(--fg-subtle)", fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>—</span>;
  const isPicker = value === "picker";
  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <LockGlyph size={14} color={isPicker ? "var(--accent)" : "var(--fg-muted)"}/>
    </div>
  );
}

function LegendChip({ glyph, label, note }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 22, height: 22, borderRadius: 6, background: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{glyph}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <span style={{ fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 12, color: "var(--fg)", letterSpacing: "-0.005em" }}>{label}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--fg-subtle)", letterSpacing: "0.04em", textTransform: "uppercase" }}>{note}</span>
      </div>
    </div>
  );
}

function Legend({ compact = false }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr 1fr" : "repeat(4, auto)", gap: compact ? "10px 14px" : 22, alignItems: "center" }}>
      <LegendChip glyph={<CheckGlyph size={13}/>} label="Active" note="Renders · usable"/>
      <LegendChip glyph={<LockGlyph size={12} color="var(--fg-muted)"/>} label="Locked → sheet" note="Free→Premium mini"/>
      <LegendChip glyph={<LockGlyph size={12} color="var(--accent)"/>} label="Locked → picker" note="Full tier picker"/>
      <LegendChip glyph={<span style={{ color: "var(--fg-subtle)", fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>—</span>} label="Hidden" note="No affordance"/>
    </div>
  );
}

// ── Desktop full table ───────────────────────────────────────
function EntitlementsMatrixDesktop() {
  const colCount = ENT_STATES.length;
  const grid = `minmax(200px, 1.3fr) repeat(${colCount}, minmax(116px, 1fr))`;
  return (
    <div style={{
      width: "100%", height: "100%", overflow: "auto",
      background: "var(--bg-elevated)", color: "var(--fg)", fontFamily: "Inter, system-ui",
      padding: "30px 34px 30px", display: "flex", flexDirection: "column", gap: 18,
    }}>
      <RailHeader tone="signal" eyebrow="Entitlements · canonical matrix" code="§6"/>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 360 }}>
          <div style={{ fontWeight: 900, fontSize: 38, letterSpacing: "-0.035em", lineHeight: 1.02 }}>Who sees what.</div>
          <div style={{ fontWeight: 500, fontSize: 14.5, color: "var(--fg-muted)", letterSpacing: "-0.005em", maxWidth: 640, lineHeight: 1.45 }}>
            Every feature × every state. The cell tells the renderer two things at once: can you use it (only “Active” returns true), and if not, which surface opens when you try.
          </div>
        </div>
        <Legend/>
      </div>

      {/* table */}
      <div style={{ display: "grid", gridTemplateColumns: grid, alignItems: "stretch" }}>
        {/* header row */}
        <div style={{ borderBottom: "1px solid var(--border-strong)" }}/>
        {ENT_STATES.map(s => (
          <div key={s.key} style={{
            padding: "10px 12px 12px", borderBottom: "1px solid var(--border-strong)",
            display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start",
            background: s.hot ? "color-mix(in oklch, var(--signal) 5%, transparent)" : "transparent",
            borderTopLeftRadius: 10, borderTopRightRadius: 10,
          }}>
            <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: "-0.01em" }}>{s.label}</span>
            {s.hot && <MonoEyebrow size={8.5} color="var(--signal)" letterSpacing="0.14em">Full set</MonoEyebrow>}
          </div>
        ))}

        {/* groups */}
        {ENT_GROUPS.map((g, gi) => (
          <React.Fragment key={g.label}>
            {/* group header spanning all columns */}
            <div style={{ gridColumn: `1 / span ${colCount + 1}`, padding: gi === 0 ? "16px 0 8px" : "22px 0 8px", display: "flex", flexDirection: "column", gap: 3 }}>
              <MonoEyebrow size={10} color={g.kind === "affordance" ? "var(--accent)" : "var(--fg-muted)"} letterSpacing="0.16em">{g.label}</MonoEyebrow>
              <span style={{ fontSize: 11.5, color: "var(--fg-subtle)", fontWeight: 500, maxWidth: 720, lineHeight: 1.4 }}>{g.note}</span>
            </div>
            {g.features.map((f, fi) => {
              const last = gi === ENT_GROUPS.length - 1 && fi === g.features.length - 1;
              return (
                <React.Fragment key={f.key}>
                  <div style={{
                    padding: "13px 8px 13px 4px", borderBottom: last ? "none" : "1px solid var(--border)",
                    display: "flex", flexDirection: "column", justifyContent: "center", gap: 2,
                  }}>
                    <span style={{ fontWeight: 700, fontSize: 13.5, letterSpacing: "-0.005em", color: "var(--fg)" }}>{f.label}</span>
                    {f.sub && <MonoEyebrow size={8.5} letterSpacing="0.1em">{f.sub}</MonoEyebrow>}
                  </div>
                  {ENT_STATES.map(s => {
                    const v = entCell(f, g.kind, s.key);
                    return (
                      <div key={s.key} style={{
                        padding: "13px 12px", borderBottom: last ? "none" : "1px solid var(--border)",
                        display: "flex", alignItems: "center", justifyContent: "flex-start",
                        background: s.hot ? "color-mix(in oklch, var(--signal) 3%, transparent)" : "transparent",
                      }}>
                        <DesktopCell value={v}/>
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--fg-subtle)",
        letterSpacing: "0.1em", textTransform: "uppercase", lineHeight: 1.6,
      }}>
        canUseFeature(plan, feature) === true only for “Active”. The other three are all false — they differ only in which surface renders on the attempt.
      </div>
    </div>
  );
}

// ── Mobile compact grid ──────────────────────────────────────
function EntitlementsMatrixMobile() {
  const grid = `92px repeat(6, 1fr)`;
  return (
    <div style={{
      width: "100%", height: "100%", overflow: "auto",
      background: "var(--bg)", color: "var(--fg)", fontFamily: "Inter, system-ui",
      padding: "60px 14px 28px", display: "flex", flexDirection: "column", gap: 16,
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <MonoEyebrow size={10} color="var(--signal)" letterSpacing="0.16em">Entitlements · §6</MonoEyebrow>
        <div style={{ fontWeight: 900, fontSize: 27, letterSpacing: "-0.03em", lineHeight: 1.05 }}>Who sees what.</div>
        <div style={{ fontWeight: 500, fontSize: 13, color: "var(--fg-muted)", letterSpacing: "-0.005em", lineHeight: 1.45 }}>
          Every feature, every state. Only “Active” is usable — the locks tell you where a tap goes.
        </div>
      </div>

      <div style={{ padding: "12px 12px", borderRadius: 12, background: "var(--surface-1)", border: "1px solid var(--border)" }}>
        <Legend compact/>
      </div>

      {/* grid */}
      <div style={{ display: "grid", gridTemplateColumns: grid, alignItems: "stretch", gap: 0 }}>
        {/* header */}
        <div style={{ borderBottom: "1px solid var(--border-strong)" }}/>
        {ENT_STATES.map(s => (
          <div key={s.key} style={{
            padding: "0 0 8px", borderBottom: "1px solid var(--border-strong)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
          }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: 10.5,
              letterSpacing: "0.06em", color: s.hot ? "var(--signal)" : "var(--fg-muted)",
            }}>{s.short}</span>
          </div>
        ))}

        {ENT_GROUPS.map((g, gi) => (
          <React.Fragment key={g.label}>
            <div style={{ gridColumn: "1 / span 7", padding: gi === 0 ? "12px 0 6px" : "16px 0 6px" }}>
              <MonoEyebrow size={9} color={g.kind === "affordance" ? "var(--accent)" : "var(--fg-muted)"} letterSpacing="0.14em">{g.label}</MonoEyebrow>
            </div>
            {g.features.map((f, fi) => {
              const last = gi === ENT_GROUPS.length - 1 && fi === g.features.length - 1;
              return (
                <React.Fragment key={f.key}>
                  <div style={{ padding: "11px 6px 11px 0", borderBottom: last ? "none" : "1px solid var(--border)", display: "flex", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, fontSize: 11.5, letterSpacing: "-0.01em", color: "var(--fg)", lineHeight: 1.2 }}>{f.label}</span>
                  </div>
                  {ENT_STATES.map(s => (
                    <div key={s.key} style={{
                      padding: "11px 0", borderBottom: last ? "none" : "1px solid var(--border)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: s.hot ? "color-mix(in oklch, var(--signal) 4%, transparent)" : "transparent",
                    }}>
                      <MobileCell value={entCell(f, g.kind, s.key)}/>
                    </div>
                  ))}
                </React.Fragment>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {ENT_STATES.map(s => (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 26, fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: 10, color: s.hot ? "var(--signal)" : "var(--fg-muted)" }}>{s.short}</span>
            <span style={{ fontSize: 12, color: "var(--fg-muted)", fontWeight: 500 }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EntitlementsMatrix({ variant = "desktop" }) {
  return variant === "mobile" ? <EntitlementsMatrixMobile/> : <EntitlementsMatrixDesktop/>;
}

Object.assign(window, {
  EntitlementsMatrix, EntitlementsMatrixDesktop, EntitlementsMatrixMobile,
  ENT_STATES, ENT_GROUPS, entCell,
});

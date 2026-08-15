// me-primitives.jsx — /me shell + settings-row primitives for the
// email-prefs + data-export pass (#? · Aug 2026).
//
// Nothing here is new invention: every primitive is the shipped settings
// vocabulary re-expressed so this handoff can render it in isolation.
//   SettingsRowGroup / MeToggleRow  ← profile-settings-screens.jsx NotificationsSection
//   ToggleSwitch (40×24)            ← shipped primitive, role="switch"
//   SectionRail                     ← crew-social-rail.jsx (mono eyebrow + meta)
//   MeActionRow                     ← history-screens.jsx SaveCalendarRow
//   MeShellMobile / MeShellDesktop  ← /me (single-scroll hub · 240px sidebar + panel)
//
// CCMark below is an inline copy of the source of truth in browse-home.jsx.

const ME_UI = "Inter, system-ui, sans-serif";
const ME_MONO = "'JetBrains Mono', monospace";

// ── Cluster Path mark — VERBATIM COPY. Source of truth: browse-home.jsx ──
function CCMark({ size = 24 }) {
  const trail = [
    { x: 14, y: 76, r: 1.5 }, { x: 24, y: 70, r: 2 },
    { x: 34, y: 64, r: 2.5 }, { x: 42, y: 58, r: 3 },
    { x: 50, y: 50, r: 4 },   { x: 58, y: 42, r: 5 },
    { x: 66, y: 32, r: 6 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 96 96">
      <rect width="96" height="96" fill="var(--bg)" rx="16" />
      <circle cx="72" cy="24" r="20" fill="var(--accent)" opacity="0.22" />
      <circle cx="72" cy="24" r="12" fill="var(--accent)" opacity="0.42" />
      <circle cx="72" cy="24" r="7"  fill="var(--signal)" />
      {trail.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="var(--signal)" opacity={0.35 + i * 0.09} />
      ))}
    </svg>
  );
}

function MeWordmark({ size = 17 }) {
  return (
    <span style={{ fontFamily: ME_UI, fontWeight: 800, fontSize: size, letterSpacing: "-0.02em", color: "var(--fg)" }}>
      concert<span style={{ color: "var(--accent)" }}>crawl.</span>
    </span>
  );
}

// ── Mono eyebrow ─────────────────────────────────────────────
function MonoEyebrow({ children, size = 9.5, color = "var(--fg-subtle)", ls = "0.14em", weight = 700 }) {
  return (
    <span style={{ fontFamily: ME_MONO, fontSize: size, fontWeight: weight, letterSpacing: ls, textTransform: "uppercase", color, whiteSpace: "nowrap" }}>{children}</span>
  );
}

// Group header rail — title left, optional meta right.
function SectionRail({ title, meta, metaColor = "var(--fg-subtle)" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 2px" }}>
      <MonoEyebrow size={10}>{title}</MonoEyebrow>
      <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
      {meta && <MonoEyebrow size={9} color={metaColor} ls="0.10em">{meta}</MonoEyebrow>}
    </div>
  );
}

// ── Card + row group ─────────────────────────────────────────
function SettingsRowGroup({ children, style }) {
  return (
    <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", ...style }}>{children}</div>
  );
}

// ── ToggleSwitch — shipped primitive, 40×24 ──────────────────
function ToggleSwitch({ on, disabled, label, onClick }) {
  return (
    <button type="button" role="switch" aria-checked={!!on} aria-label={label} disabled={disabled}
      onClick={onClick}
      style={{
        all: "unset", boxSizing: "border-box", cursor: disabled ? "not-allowed" : "pointer",
        width: 40, height: 24, borderRadius: 999, flexShrink: 0, position: "relative",
        opacity: disabled ? 0.5 : 1,
        background: on ? "var(--signal)" : "var(--surface-3)",
        border: `1px solid ${on ? "var(--signal)" : "var(--border-strong)"}`,
        transition: "background 140ms ease, border-color 140ms ease",
      }}>
      <span style={{
        position: "absolute", top: 2, left: on ? 18 : 2, width: 18, height: 18, borderRadius: 999,
        background: on ? "var(--fg-on-accent)" : "var(--fg-subtle)",
        transition: "left 140ms cubic-bezier(.2,.7,.3,1)",
      }} />
    </button>
  );
}

// ── Toggle row — a div, never a button (switch must not nest) ─
function MeToggleRow({ leading, label, detail, on, disabled, last, onToggle }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 14px", borderBottom: last ? "none" : "1px solid var(--border)" }}>
      {leading && <span style={{ flexShrink: 0, display: "inline-flex", color: "var(--fg-muted)" }}>{leading}</span>}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ fontFamily: ME_UI, fontSize: 14.5, fontWeight: 600, color: disabled ? "var(--fg-muted)" : "var(--fg)", letterSpacing: "-0.005em" }}>{label}</div>
        {detail && <div style={{ fontFamily: ME_UI, fontSize: 12.5, fontWeight: 500, color: "var(--fg-muted)", letterSpacing: "-0.005em", lineHeight: 1.4, textWrap: "pretty" }}>{detail}</div>}
      </div>
      <ToggleSwitch on={on} disabled={disabled} label={label} onClick={onToggle} />
    </div>
  );
}

// ── Static row — same anatomy, no control. Used for anything the
//    user cannot change (and for read-only account facts). ─────
function MeStaticRow({ label, detail, trailing, last }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 14px", borderBottom: last ? "none" : "1px solid var(--border)" }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ fontFamily: ME_UI, fontSize: 14.5, fontWeight: 600, color: "var(--fg)", letterSpacing: "-0.005em" }}>{label}</div>
        {detail && <div style={{ fontFamily: ME_UI, fontSize: 12.5, fontWeight: 500, color: "var(--fg-muted)", letterSpacing: "-0.005em", lineHeight: 1.4, textWrap: "pretty", overflow: "hidden", textOverflow: "ellipsis" }}>{detail}</div>}
      </div>
      {trailing}
    </div>
  );
}

// Chevron-bearing navigation row (email / password in Account).
function MeNavRow({ label, detail, last }) {
  return (
    <MeStaticRow label={label} detail={detail} last={last} trailing={
      <svg width="7" height="12" viewBox="0 0 7 12" fill="none" style={{ flexShrink: 0 }} aria-hidden="true">
        <path d="M1 1l5 5-5 5" stroke="var(--fg-subtle)" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    } />
  );
}

// ── Group footnote — prose, no row anatomy, no card. ─────────
// The billing-email explanation lands here: visible and explained,
// deliberately NOT shaped like a control.
function GroupFootnote({ children, icon = true }) {
  return (
    <div style={{ display: "flex", gap: 8, padding: "0 4px" }}>
      {icon && (
        <svg width="13" height="13" viewBox="0 0 14 14" style={{ marginTop: 3, flexShrink: 0 }} aria-hidden="true">
          <circle cx="7" cy="7" r="6" stroke="var(--fg-subtle)" strokeWidth="1.3" fill="none" />
          <path d="M7 4v3.4M7 9.6v.1" stroke="var(--fg-subtle)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
      <span style={{ fontFamily: ME_UI, fontSize: 11.5, color: "var(--fg-subtle)", lineHeight: 1.5, letterSpacing: "-0.003em", textWrap: "pretty" }}>{children}</span>
    </div>
  );
}

// ── Icons ────────────────────────────────────────────────────
const MeIcon = {
  bell: (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2a4 4 0 0 0-4 4v2.5L3 11h10l-1-2.5V6a4 4 0 0 0-4-4Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M6.4 13a1.7 1.7 0 0 0 3.2 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  mail: (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.8" y="3.6" width="12.4" height="8.8" rx="1.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.4 4.6 8 8.7l5.6-4.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  download: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2v7.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4.8 6.6 8 9.9l3.2-3.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.6 11.6v1.2a1 1 0 0 0 1 1h8.8a1 1 0 0 0 1-1v-1.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  clock: (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5.7" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7 4.2V7l2.1 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  alert: (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 1.9 12.9 12H1.1L7 1.9Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M7 5.6v2.6M7 10.1v.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  star: (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1.8l1.9 4 4.3.6-3.1 3 .74 4.3L8 11.7l-3.84 2 .74-4.3-3.1-3 4.3-.6L8 1.8Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  ),
  shield: (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1.9l5 1.8v4.1c0 3-2.1 5.3-5 6.3-2.9-1-5-3.3-5-6.3V3.7l5-1.8Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  ),
};

// ── /me mobile shell — single-scroll hub ─────────────────────
function MeShellMobile({ children, title = "Me", scrollTo = null, w = 393, insetTop = 0, insetBottom = 0 }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const m = ref.current; if (!m) return;
    if (!scrollTo) { m.scrollTop = 0; return; }
    const el = m.querySelector('[data-screen-label="' + scrollTo + '"]');
    m.scrollTop = el ? Math.max(0, el.offsetTop - m.offsetTop - 10) : 0;
  }, [scrollTo]);
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)", display: "flex", flexDirection: "column", fontFamily: ME_UI, overflow: "hidden", position: "relative" }}>
      <header style={{ flexShrink: 0, padding: (14 + insetTop) + "px 20px 10px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--border)" }}>
        <CCMark size={22} />
        <span style={{ fontFamily: ME_UI, fontSize: 15, fontWeight: 800, letterSpacing: "-0.02em" }}>{title}</span>
      </header>
      <main ref={ref} style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: w <= 320 ? "16px 14px 24px" : "18px 18px 28px", display: "flex", flexDirection: "column", gap: 24 }}>{children}</main>
      <MeBottomNav w={w} insetBottom={insetBottom} />
    </div>
  );
}

function MeBottomNav({ active = "me", w = 393, insetBottom = 0 }) {
  const tabs = ["browse", "search", "watching", "me"];
  return (
    <nav style={{ flexShrink: 0, borderTop: "1px solid var(--border)", background: "var(--bg-elevated)", display: "grid", gridTemplateColumns: "repeat(4,1fr)", padding: `9px 4px ${16 + insetBottom}px` }}>
      {tabs.map(t => (
        <div key={t} style={{ minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <MonoEyebrow size={w <= 320 ? 8.5 : 9.5} ls="0.10em" color={t === active ? "var(--signal)" : "var(--fg-subtle)"}>{t}</MonoEyebrow>
        </div>
      ))}
    </nav>
  );
}

// ── /me desktop shell — 240px sidebar + right panel ──────────
const ME_SECTIONS = [
  { key: "profile", label: "Profile" },
  { key: "plan", label: "Plan" },
  { key: "appearance", label: "Appearance" },
  { key: "notifications", label: "Notifications" },
  { key: "connections", label: "Connections" },
  { key: "submissions", label: "Submitted prices" },
  { key: "account", label: "Account" },
  { key: "danger", label: "Danger zone", danger: true },
];

function MeShellDesktop({ active = "notifications", title, subtitle, children }) {
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)", display: "flex", fontFamily: ME_UI, overflow: "hidden" }}>
      <aside style={{ width: 240, flexShrink: 0, borderRight: "1px solid var(--border)", background: "var(--bg-elevated)", padding: "20px 14px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 6px" }}>
          <CCMark size={24} /><MeWordmark />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {ME_SECTIONS.map(s => {
            const on = s.key === active;
            return (
              <div key={s.key} style={{
                padding: "9px 12px", borderRadius: 8, fontSize: 13.5,
                fontWeight: on ? 800 : 600,
                color: on ? "var(--fg)" : (s.danger ? "var(--danger)" : "var(--fg-muted)"),
                background: on ? "color-mix(in oklch, var(--signal) 14%, var(--surface-1))" : "transparent",
                border: on ? "1px solid color-mix(in oklch, var(--signal) 40%, var(--border))" : "1px solid transparent",
              }}>{s.label}</div>
            );
          })}
        </div>
      </aside>
      <main style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "34px 40px 48px" }}>
        <div style={{ maxWidth: 620, display: "flex", flexDirection: "column", gap: 24 }}>
          {title && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em" }}>{title}</div>
              {subtitle && <div style={{ fontSize: 13.5, color: "var(--fg-muted)", lineHeight: 1.5, textWrap: "pretty" }}>{subtitle}</div>}
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}

Object.assign(window, {
  ME_UI, ME_MONO, ME_SECTIONS, CCMark, MeWordmark, MonoEyebrow, SectionRail,
  SettingsRowGroup, ToggleSwitch, MeToggleRow, MeStaticRow, MeNavRow, GroupFootnote,
  MeIcon, MeShellMobile, MeShellDesktop, MeBottomNav,
});

// email-primitives.jsx — #783 monetization email family · shared atoms
//
// EMAIL CONSTRAINT (inherited from design_handoff_shareable_cards/digest-email.jsx,
// which lives at design_handoff_spotify_sync/digest-email.jsx in this repo):
// email clients can't parse CSS custom properties, so this whole family uses
// INLINE HEX — the one deliberate exception to the token-only rule. Single
// branded palette (electric-derived), NOT per-user themed (Hugh dropped the
// theme ask 2026-07-15). Table layout, mobile-first (600px max, 320 baseline),
// every template ships a plain-text fallback.
//
// Palette + wordmark + header/footer/button/art are lifted verbatim in spirit
// from digest-email.jsx so the family reads as one system.
//
// Exports (window): ME, EmShell, EmPreheader, EmWordmark, EmHeader, EmLede,
//   EmButton, EmGhostLink, EmDivider, EmMonoEyebrow, EmArt, EmTierBadge,
//   EmFeatureList, EmDataTable, EmPricePromise, EmFooter, EmCallout,
//   EmSeatStamp, PlainText, TIER_ACCENT, TIER_META

// ── Palette — electric-derived (matches digest-email DE_C, extended) ──
const ME = {
  page:   "#04050C", // outer page bg
  card:   "#0B0E20", // email card
  surf:   "#11162E", // panel surface
  surf2:  "#171D3A", // nested surface (receipt rows / callouts)
  border: "#242C4E",
  borderSoft: "#1A2140",
  fg:     "#E8F3FF",
  muted:  "#9AA8C7",
  subtle: "#5A6788",
  signal: "#7AE6FF", // primary CTA · Premium accent
  accent: "#FF7BD4", // brand presence · Supporter / Gifted accent
  onSignal: "#070A1A",
  onAccent: "#1A0713",
  amber:  "#FFC24B", // dunning "needs attention" — calm, not alarm
  amberSoft: "rgba(255,194,75,0.10)",
  signalSoft: "rgba(122,230,255,0.09)",
  accentSoft: "rgba(255,123,212,0.09)",
};

// tier → single-color accent within the one palette (maps to app tier shells)
const TIER_ACCENT = {
  premium:   ME.signal,
  supporter: ME.accent,
  founder:   ME.signal,   // paired with accent halo where a single color is needed
  gifted:    ME.accent,
};

const TIER_META = {
  premium:   { label: "Premium",   price: "$5", unit: "/ month" },
  supporter: { label: "Supporter", price: "$2", unit: "/ month" },
  founder:   { label: "Founder",   price: "$3", unit: "/ mo · locked" },
  gifted:    { label: "Premium",   price: "$0", unit: "on us" },
};

const FONT = "Inter, -apple-system, 'Segoe UI', Arial, sans-serif";
const MONO = "'JetBrains Mono', 'SFMono-Regular', Menlo, monospace";

// ── Outer shell — page bg + centered 600 card ────────────────
function EmShell({ children, maxWidth = 600 }) {
  return (
    <div style={{ background: ME.page, padding: "24px 0", fontFamily: FONT }}>
      <table role="presentation" width={maxWidth} cellPadding="0" cellSpacing="0" align="center"
        style={{ width: maxWidth, maxWidth: "100%", margin: "0 auto", background: ME.card, borderRadius: 16, overflow: "hidden", border: `1px solid ${ME.border}` }}>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

// Hidden inbox-preview line (renders in the list, not in the body).
function EmPreheader({ children }) {
  return (
    <tr aria-hidden="true"><td style={{ display: "none", maxHeight: 0, overflow: "hidden", opacity: 0, color: "transparent", fontSize: 1, lineHeight: "1px" }}>{children}</td></tr>
  );
}

// ── Wordmark — canonical concert + crawl. lockup ─────────────
function EmWordmark({ size = 17 }) {
  return (
    <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: size, color: ME.fg, letterSpacing: "-0.02em" }}>
      concert<span style={{ color: ME.accent }}>crawl.</span>
    </span>
  );
}

// ── Header row — wordmark left, mono eyebrow right ───────────
function EmHeader({ eyebrow }) {
  return (
    <tr><td style={{ padding: "22px 26px 0" }}>
      <table role="presentation" width="100%" cellPadding="0" cellSpacing="0"><tbody><tr>
        <td style={{ verticalAlign: "middle" }}><EmWordmark /></td>
        {eyebrow && (
          <td style={{ textAlign: "right", verticalAlign: "middle", fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.16em", color: ME.subtle, textTransform: "uppercase", fontWeight: 700 }}>{eyebrow}</td>
        )}
      </tr></tbody></table>
    </td></tr>
  );
}

// ── Mono eyebrow (section labels) ────────────────────────────
function EmMonoEyebrow({ children, color = ME.subtle, size = 10, style }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: size, letterSpacing: "0.15em", color, textTransform: "uppercase", fontWeight: 700, ...style }}>{children}</div>
  );
}

// ── Lede — eyebrow + big headline + sub ──────────────────────
function EmLede({ eyebrow, title, sub, titleSize = 26 }) {
  return (
    <tr><td style={{ padding: "24px 26px 4px" }}>
      {eyebrow && <EmMonoEyebrow color={ME.subtle} style={{ marginBottom: 11 }}>{eyebrow}</EmMonoEyebrow>}
      <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: titleSize, color: ME.fg, letterSpacing: "-0.025em", lineHeight: 1.12 }}>{title}</div>
      {sub && <div style={{ fontFamily: FONT, fontSize: 14.5, color: ME.muted, lineHeight: 1.5, marginTop: 10 }}>{sub}</div>}
    </td></tr>
  );
}

// ── Primary CTA — block button ───────────────────────────────
function EmButton({ children, tone = "signal", href = "#" }) {
  const bg = tone === "signal" ? ME.signal
           : tone === "accent" ? ME.accent
           : "transparent";
  const color = tone === "signal" ? ME.onSignal
              : tone === "accent" ? ME.onAccent
              : ME.fg;
  const border = tone === "ghost" ? `1px solid ${ME.border}` : "1px solid transparent";
  return (
    <table role="presentation" width="100%" cellPadding="0" cellSpacing="0"><tbody><tr><td style={{ textAlign: "center" }}>
      <a href={href} style={{ display: "block", background: bg, color, border, fontFamily: FONT, fontWeight: 800, fontSize: 14.5, textDecoration: "none", padding: "14px", borderRadius: 12, letterSpacing: "-0.01em" }}>{children}</a>
    </td></tr></tbody></table>
  );
}

function EmGhostLink({ children, href = "#", color = ME.signal }) {
  return <a href={href} style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color, textDecoration: "none" }}>{children}</a>;
}

function EmDivider({ pad = "0 26px" }) {
  return (
    <tr><td style={{ padding: pad }}>
      <div style={{ borderTop: `1px solid ${ME.border}` }} />
    </td></tr>
  );
}

// ── Art placeholder (show / entity) — gradient block ─────────
function EmArt({ hue = 280, size = 52 }) {
  return <div style={{ width: size, height: size, borderRadius: 9, background: `linear-gradient(135deg, hsl(${hue} 45% 42%), hsl(${hue + 40} 40% 26%))`, flexShrink: 0 }} />;
}

// ── Tier badge — small pill ──────────────────────────────────
function EmTierBadge({ tier = "premium", beta = false }) {
  const grad = tier === "founder";
  const accent = TIER_ACCENT[tier];
  const label = TIER_META[tier].label;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, verticalAlign: "middle" }}>
      <span style={{
        display: "inline-block", padding: "4px 9px", borderRadius: 6,
        background: grad ? "linear-gradient(135deg, rgba(122,230,255,0.16), rgba(255,123,212,0.16))" : `${accent}22`,
        border: `1px solid ${accent}55`,
        fontFamily: MONO, fontWeight: 700, fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: accent,
      }}>{label}</span>
      {beta && (
        <span style={{ display: "inline-block", padding: "4px 9px", borderRadius: 6, background: ME.surf2, border: `1px solid ${ME.border}`, fontFamily: MONO, fontWeight: 700, fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: ME.muted }}>Beta</span>
      )}
    </span>
  );
}

// ── Feature list — checkmark rows ────────────────────────────
function EmFeatureList({ items = [], accent = ME.signal }) {
  return (
    <table role="presentation" width="100%" cellPadding="0" cellSpacing="0"><tbody>
      {items.map((f, i) => {
        const text = typeof f === "string" ? f : f.text;
        const future = typeof f === "object" && f.future;
        return (
          <tr key={i}><td style={{ padding: "5px 0", verticalAlign: "top" }}>
            <table role="presentation" cellPadding="0" cellSpacing="0"><tbody><tr>
              <td style={{ width: 20, verticalAlign: "top", paddingTop: 3 }}>
                {future ? (
                  <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 12, color: accent }}>★</span>
                ) : (
                  <span style={{ display: "inline-block", width: 12, height: 12 }}>
                    <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6 L5 9 L10 3" fill="none" stroke={accent} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                )}
              </td>
              <td style={{ fontFamily: FONT, fontSize: 13.5, fontWeight: 500, color: ME.fg, lineHeight: 1.4, opacity: future ? 0.62 : 1 }}>{text}</td>
            </tr></tbody></table>
          </td></tr>
        );
      })}
    </tbody></table>
  );
}

// ── Data table (receipts) — label / value rows ───────────────
function EmDataTable({ rows = [] }) {
  return (
    <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style={{ background: ME.surf, borderRadius: 12, border: `1px solid ${ME.border}`, overflow: "hidden" }}>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td style={{ padding: "12px 16px", borderBottom: i < rows.length - 1 ? `1px solid ${ME.borderSoft}` : "none", fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: ME.subtle, whiteSpace: "nowrap", verticalAlign: "top", width: "42%" }}>{r.label}</td>
            <td style={{ padding: "12px 16px", borderBottom: i < rows.length - 1 ? `1px solid ${ME.borderSoft}` : "none", fontFamily: r.mono === false ? FONT : MONO, fontSize: 12.5, fontWeight: r.strong ? 700 : 500, color: r.color || ME.fg, textAlign: "right", verticalAlign: "top" }}>
              {r.link ? <a href="#" style={{ color: ME.signal, textDecoration: "none", fontWeight: 700 }}>{r.value}</a> : r.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Callout panel — tinted box for a single reinforced idea ──
function EmCallout({ children, accent = ME.signal, soft }) {
  return (
    <div style={{ borderRadius: 12, padding: "15px 16px", background: soft || `${accent}14`, border: `1px solid ${accent}44` }}>{children}</div>
  );
}

// ── Price-promise line (locked microcopy) ────────────────────
// premium/supporter: "Whatever you pay, you pay. We never raise it."
// founder: "$3 is $3. New folks may pay double someday — never you."
const PRICE_PROMISE = {
  supporter: "Whatever you pay, you pay. We never raise it.",
  premium:   "Whatever you pay, you pay. We never raise it.",
  founder:   "$3 is $3. New folks may pay double someday — never you.",
};
function EmPricePromise({ tier = "premium", subtle = false }) {
  const text = PRICE_PROMISE[tier];
  if (!text) return null;
  if (subtle) {
    return (
      <div style={{ fontFamily: MONO, fontSize: 10, color: ME.subtle, letterSpacing: "0.04em", lineHeight: 1.5, display: "flex", alignItems: "flex-start", gap: 7 }}>
        <span style={{ display: "inline-block", width: 11, marginTop: 1 }}>
          <svg width="11" height="11" viewBox="0 0 14 14"><rect x="3" y="6" width="8" height="5.5" rx="1.2" fill="none" stroke={ME.accent} strokeWidth="1.2" /><path d="M4.6 6 V4.5 a2.4 2.4 0 0 1 4.8 0 V6" fill="none" stroke={ME.accent} strokeWidth="1.2" /></svg>
        </span>
        <span>{text}</span>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "11px 13px", borderRadius: 10, background: ME.accentSoft, border: `1px solid ${ME.accent}33` }}>
      <span style={{ display: "inline-block", width: 14, marginTop: 1, flexShrink: 0 }}>
        <svg width="14" height="14" viewBox="0 0 14 14"><rect x="3" y="6" width="8" height="5.5" rx="1.2" fill="none" stroke={ME.accent} strokeWidth="1.3" /><path d="M4.6 6 V4.5 a2.4 2.4 0 0 1 4.8 0 V6" fill="none" stroke={ME.accent} strokeWidth="1.3" /></svg>
      </span>
      <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12.5, color: ME.muted, lineHeight: 1.45 }}>{text}</span>
    </div>
  );
}

// ── Founder seat stamp — #N of 100, understated ──────────────
function EmSeatStamp({ seat = 37 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", borderRadius: 12, background: "linear-gradient(150deg, rgba(255,123,212,0.10), rgba(122,230,255,0.08))", border: `1px solid ${ME.signal}44` }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 40, lineHeight: 1, color: ME.fg, letterSpacing: "-0.04em" }}>#{seat}</div>
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: ME.subtle, marginTop: 5 }}>of 100</div>
      </div>
      <div style={{ borderLeft: `1px solid ${ME.border}`, paddingLeft: 14 }}>
        <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 15, color: ME.fg, letterSpacing: "-0.01em" }}>Founder. Locked in.</div>
        <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.06em", color: ME.signal, marginTop: 4 }}>$3 / mo — never goes up, ever</div>
      </div>
    </div>
  );
}

// ── Footer — per-family unsub first, all-email secondary, manage where relevant ──
function EmFooter({ family = "billing", showManage = true, note }) {
  return (
    <tr><td style={{ padding: "18px 26px 24px", borderTop: `1px solid ${ME.border}` }}>
      {note && <div style={{ fontFamily: FONT, fontSize: 11.5, color: ME.subtle, lineHeight: 1.6, marginBottom: 10 }}>{note}</div>}
      <div style={{ fontFamily: FONT, fontSize: 11.5, color: ME.subtle, lineHeight: 1.7 }}>
        <a href="#" style={{ color: ME.muted, textDecoration: "underline" }}>Turn off {family} emails</a>
        <span style={{ color: ME.border }}> &nbsp;·&nbsp; </span>
        <a href="#" style={{ color: ME.subtle, textDecoration: "underline" }}>all email settings</a>
        {showManage && (<>
          <span style={{ color: ME.border }}> &nbsp;·&nbsp; </span>
          <a href="#" style={{ color: ME.subtle, textDecoration: "underline" }}>manage subscription</a>
        </>)}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 9.5, color: ME.subtle, marginTop: 12, letterSpacing: "0.06em" }}>Concert Crawl · Denver, CO</div>
    </td></tr>
  );
}

// ── Plain-text fallback renderer ─────────────────────────────
function PlainText({ children }) {
  return (
    <pre style={{ margin: 0, padding: "18px 20px", background: ME.surf, border: `1px solid ${ME.border}`, borderRadius: 12, color: ME.muted, fontFamily: MONO, fontSize: 11, lineHeight: 1.55, whiteSpace: "pre-wrap", overflowX: "auto" }}>{children}</pre>
  );
}

Object.assign(window, {
  ME, TIER_ACCENT, TIER_META, PRICE_PROMISE,
  EmShell, EmPreheader, EmWordmark, EmHeader, EmMonoEyebrow, EmLede,
  EmButton, EmGhostLink, EmDivider, EmArt, EmTierBadge, EmFeatureList,
  EmDataTable, EmCallout, EmPricePromise, EmSeatStamp, EmFooter, PlainText,
});

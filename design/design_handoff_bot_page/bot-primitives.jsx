// bot-primitives.jsx — building blocks for the public /bot page.
// Token-only. No app chrome: this page has no nav, no auth, no theme picker.

// ── Cluster Path mark ──────────────────────────────────────────
// VERBATIM COPY. Source of truth: browse-home.jsx → CCMark. Do not restyle.
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
        <circle key={i} cx={d.x} cy={d.y} r={d.r}
          fill="var(--signal)" opacity={0.35 + i * 0.09} />
      ))}
    </svg>
  );
}

const BOT_MONO = "'JetBrains Mono', ui-monospace, monospace";
const BOT_SANS = "Inter, system-ui, sans-serif";

// ── Lockup ─────────────────────────────────────────────────────
// Canonical pairing, per CLAUDE.md §1 / AppBar in browse-home.jsx.
function BotLockup({ size = 24 }) {
  return (
    <a href="https://concertcrawl.app" style={{
      display: "inline-flex", alignItems: "center", gap: 9, textDecoration: "none",
    }}>
      <CCMark size={size} />
      <span style={{
        fontFamily: BOT_SANS, fontWeight: 800, fontSize: 17,
        letterSpacing: "-0.02em", color: "var(--fg)",
      }}>concert<span style={{ color: "var(--accent)" }}>crawl.</span></span>
    </a>
  );
}

function MonoTag({ children, tone = "var(--fg-muted)", size = 9.5 }) {
  return (
    <span style={{
      fontFamily: BOT_MONO, fontSize: size, fontWeight: 700,
      letterSpacing: "0.14em", textTransform: "uppercase", color: tone,
    }}>{children}</span>
  );
}

// ── Section rail ───────────────────────────────────────────────
// Numbered mono eyebrow + heading. The number is the page's spine — a reader
// scanning for one fact should be able to say "section 3" to a colleague.
function BotSectionHead({ n, title, note }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <MonoTag tone="var(--signal)">{n}</MonoTag>
        <div style={{ height: 1, flex: 1, background: "var(--border)" }} />
      </div>
      <h2 style={{
        margin: 0, fontFamily: BOT_SANS, fontSize: 19, fontWeight: 800,
        letterSpacing: "-0.02em", color: "var(--fg)",
      }}>{title}</h2>
      {note ? (
        <p style={{
          margin: 0, fontFamily: BOT_SANS, fontSize: 14, lineHeight: 1.55,
          color: "var(--fg-muted)", textWrap: "pretty", maxWidth: "62ch",
        }}>{note}</p>
      ) : null}
    </div>
  );
}

// ── Fact group + fact row ──────────────────────────────────────
// The spec block. One bordered card per section; rows are a mono key and a
// prose value. Two columns from 560px up, stacked below — the key never
// truncates and the value never wraps to a 12-character column.
function FactGroup({ children }) {
  return (
    <div style={{
      background: "var(--bg-elevated)", border: "1px solid var(--border)",
      borderRadius: 12, overflow: "hidden",
    }}>{children}</div>
  );
}

function FactRow({ label, children, wide, first }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: wide ? "168px 1fr" : "1fr",
      gap: wide ? 20 : 7,
      padding: wide ? "16px 20px" : "14px 16px",
      borderTop: first ? "none" : "1px solid var(--border)",
      alignItems: "start",
    }}>
      <div style={{ paddingTop: wide ? 3 : 0 }}><MonoTag>{label}</MonoTag></div>
      <div style={{
        fontFamily: BOT_SANS, fontSize: 14.5, lineHeight: 1.6, fontWeight: 500,
        color: "var(--fg)", textWrap: "pretty", minWidth: 0,
      }}>{children}</div>
    </div>
  );
}

// ── Copyable code ──────────────────────────────────────────────
// The two strings an operator actually needs to lift off this page: the exact
// UA, and the robots.txt block. Both are selectable text first — the button is
// a convenience, never the only way to get the string.
function CopyBlock({ text, lines, label = "Copy" }) {
  const [copied, setCopied] = React.useState(false);
  const body = lines || [text];
  // Only confirm on a resolved write. writeText rejects in an insecure context,
  // and a "Copied" that lied would send an operator away with an empty clipboard
  // and no reason to look at the selectable text sitting next to the button.
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(body.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (err) {
      console.warn("Clipboard write failed; the string is selectable.", err);
    }
  };
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      background: "var(--surface-1)", border: "1px solid var(--border)",
      borderRadius: 10, padding: "10px 10px 10px 13px",
    }}>
      <code style={{
        fontFamily: BOT_MONO, fontSize: 12.5, lineHeight: 1.7, fontWeight: 500,
        color: "var(--fg)", flex: 1, minWidth: 0, wordBreak: "break-all",
        whiteSpace: "pre-wrap", userSelect: "all",
      }}>{body.join("\n")}</code>
      <button type="button" onClick={copy} aria-label={`${label} to clipboard`} style={{
        all: "unset", cursor: "pointer", flexShrink: 0,
        fontFamily: BOT_MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em",
        textTransform: "uppercase", padding: "7px 10px", borderRadius: 7, minHeight: 44,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        color: copied ? "var(--fg-on-accent)" : "var(--fg-muted)",
        background: copied ? "var(--signal)" : "var(--surface-2)",
        border: "1px solid var(--border)", transition: "background .12s, color .12s",
      }}>{copied ? "Copied" : label}</button>
    </div>
  );
}

// ── Contact card ───────────────────────────────────────────────
// The page's one destination. Bordered in --signal so it reads as the action
// even to someone who scrolled past every fact above it.
function ContactCard({ email, children, wide }) {
  return (
    <div style={{
      background: "color-mix(in oklch, var(--signal) 7%, var(--bg-elevated))",
      border: "1px solid color-mix(in oklch, var(--signal) 38%, var(--border))",
      borderRadius: 12, padding: wide ? "22px 24px" : "18px 16px",
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      <a href={`mailto:${email}`} style={{
        fontFamily: BOT_MONO, fontSize: wide ? 20 : 16, fontWeight: 700,
        color: "var(--signal)", textDecoration: "none", wordBreak: "break-word",
        letterSpacing: "-0.01em",
      }}>{email}</a>
      <div style={{
        fontFamily: BOT_SANS, fontSize: 14.5, lineHeight: 1.6, fontWeight: 500,
        color: "var(--fg)", textWrap: "pretty",
      }}>{children}</div>
    </div>
  );
}

Object.assign(window, {
  CCMark, BotLockup, MonoTag, BotSectionHead,
  FactGroup, FactRow, CopyBlock, ContactCard,
  BOT_MONO, BOT_SANS,
});

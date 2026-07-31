// triage-icons.jsx — the five fault glyphs + two queue glyphs.
// All traced from lucide-react (no new dependency: production imports them from
// lucide-react directly; these are stand-ins so the mock is self-contained).
//   blocked  → Ban
//   failed   → OctagonAlert
//   wentDark → TrendingDown
//   ceiling  → ArrowUpToLine
//   coverage → Link2Off
//   flags    → Flag
//   prices   → Tag
// Five glyphs, three inks. Glyph carries the condition, ink carries severity.

function TriageIcon({ name, size = 16, strokeWidth = 1.7 }) {
  const p = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
    strokeWidth, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", focusable: "false",
  };
  const paths = {
    blocked: <><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></>,
    failed: <><path d="M8.4 2.6h7.2l5.8 5.8v7.2l-5.8 5.8H8.4l-5.8-5.8V8.4z" /><path d="M12 8v4.5M12 16.2h.01" /></>,
    wentDark: <><path d="M22 17l-8.5-8.5-5 5L2 7" /><path d="M16 17h6v-6" /></>,
    ceiling: <><path d="M4 4h16" /><path d="M12 20V9" /><path d="M7.5 13.5L12 9l4.5 4.5" /></>,
    coverage: <><path d="M9.5 17H7.5a5 5 0 010-10h2" /><path d="M14.5 7h2a5 5 0 013.9 8.2" /><path d="M8.5 12H12" /><path d="M3 3l18 18" /></>,
    flags: <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><path d="M4 22v-7" /></>,
    prices: <><path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L2 12V2h10l8.6 8.6a2 2 0 010 2.8z" /><path d="M7 7h.01" /></>,
    check: <path d="M5 12.5l4.5 4.5L19 7" />,
    chevR: <path d="M9 6l6 6-6 6" />,
    refresh: <><path d="M21 12a9 9 0 11-3-6.7" /><path d="M21 4v5h-5" /></>,
  };
  return <svg {...p}>{paths[name] || null}</svg>;
}

// EvidenceBars — the went-dark / ceiling micro-chart. N daily counts, the last
// one being the run that tripped the condition. Never the only carrier of the
// number: the same figures are written out in the evidence line beside it.
function EvidenceBars({ series = [], tone = "var(--warning)", width = 74, height = 22, label }) {
  const max = Math.max(...series, 1);
  const last = series.length - 1;
  return (
    <span role="img" aria-label={label} style={{
      display: "inline-flex", alignItems: "flex-end", gap: 2,
      width, height, flexShrink: 0,
    }}>
      {series.map((v, i) => (
        <span key={i} style={{
          flex: 1, minWidth: 3,
          height: `${Math.max(5, (v / max) * height)}px`,
          borderRadius: 1.5,
          background: i === last ? tone : "var(--border-strong)",
          opacity: i === last ? 1 : 0.75,
        }} />
      ))}
    </span>
  );
}

window.TriageIcon = TriageIcon;
window.EvidenceBars = EvidenceBars;

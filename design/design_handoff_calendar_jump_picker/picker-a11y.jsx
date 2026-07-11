// picker-a11y.jsx — #642 · accessibility annotation pass (WCAG AA)
//
// Numbered callout pins over a live open picker + a legend, a keyboard map,
// and a screen-reader walkthrough. Self-contained (no cross-folder deps).

const { MonoEyebrow, JumpPicker, CJP_TODAY_ISO } = window;

function PA11yPin({ n, top, left, tone = "signal" }) {
  const c = tone === "warning" ? "var(--warning)" : tone === "danger" ? "var(--danger)" : "var(--signal)";
  return (
    <div style={{
      position: "absolute", top, left, transform: "translate(-50%, -50%)",
      width: 22, height: 22, borderRadius: 22, zIndex: 20,
      background: c, color: "var(--fg-on-accent)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: 11,
      boxShadow: `0 0 0 3px color-mix(in oklch, ${c} 26%, transparent), 0 2px 8px rgba(0,0,0,0.4)`,
    }}>{n}</div>
  );
}

function PA11yLegend({ title, items, tone = "signal" }) {
  const c = tone === "warning" ? "var(--warning)" : "var(--signal)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 13, fontFamily: "Inter, system-ui" }}>
      <MonoEyebrow size={11} color={c} letterSpacing="0.16em">{title}</MonoEyebrow>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((it) => (
          <div key={it.n} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
            <div style={{ width: 21, height: 21, borderRadius: 21, flexShrink: 0, marginTop: 1, background: c, color: "var(--fg-on-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: 11 }}>{it.n}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--fg)", letterSpacing: "-0.005em" }}>{it.label}</div>
              <div style={{ fontWeight: 500, fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.45 }}>{it.detail}</div>
              {it.code && <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: c, background: `color-mix(in oklch, ${c} 12%, transparent)`, padding: "2px 6px", borderRadius: 5, marginTop: 2, alignSelf: "flex-start" }}>{it.code}</code>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const PA11Y_ITEMS = [
  { n: 1, label: "role=\"dialog\" + aria-label", detail: "The picker is a non-modal dialog anchored to the cue. It names itself with the visible month + year so SR users know where they are.", code: "role=\"dialog\" aria-label=\"Jump to a date — June 2026\"" },
  { n: 2, label: "Cue owns aria-expanded / -haspopup", detail: "The month/year button announces its open/closed state and that it summons a dialog. Focus returns to it on close.", code: "aria-haspopup=\"dialog\" aria-expanded" },
  { n: 3, label: "Month pager buttons are labelled", detail: "Icon-only ◂ ▸ get explicit names; they're aria-disabled at the ends of the forward window, not just dimmed.", code: "aria-label=\"Previous month\" · aria-disabled" },
  { n: 4, label: "Grid semantics", detail: "role=\"grid\" with gridcell children; each day's aria-label reads weekday, date, show count, and \u201ctoday\u201d. No orphaned dots.", code: "role=\"grid\" / gridcell + aria-label" },
  { n: 5, label: "Selection + today are not colour-only", detail: "Selected carries aria-selected; today keeps a 1.5px ring AND accent text so it survives the 3:1 non-text contrast bar without relying on hue.", code: "aria-selected=\"true\"" },
  { n: 6, label: "Disabled days are inert", detail: "Out-of-month and past days are aria-disabled and skipped by arrow keys — no dead tab-stops, no confusing focus.", code: "aria-disabled=\"true\"" },
  { n: 7, label: "Close = tap-scrim · X · Esc", detail: "All three dismiss and return focus to the cue. The X carries an explicit label; the scrim catch is pointer-only (Esc covers keyboard).", code: "aria-label=\"Close date picker\" · Esc" },
];

function AnnotatedPicker({ theme = "electric" }) {
  return (
    <window.ThemeProvider theme={theme} style={{ width: "100%", height: "100%" }}>
      <div style={{ width: "100%", height: "100%", background: "var(--bg)", display: "grid", gridTemplateColumns: "360px 1fr", fontFamily: "Inter, system-ui" }}>
        <div style={{ position: "relative", borderRight: "1px solid var(--border)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "34px 20px" }}>
          <div style={{ position: "relative" }}>
            <JumpPicker initialY={2026} initialM={5} selectedISO={"2026-06-27"} indicators="dots" closing="both" weekendEmphasis anim="fade" width={300} />
            <PA11yPin n={1} top="4%" left="50%" />
            <PA11yPin n={3} top="9%" left="9%" />
            <PA11yPin n={7} top="9%" left="92%" />
            <PA11yPin n={4} top="46%" left="50%" />
            <PA11yPin n={5} top="63%" left="79%" />
            <PA11yPin n={6} top="30%" left="9%" />
            <PA11yPin n={2} top="-3%" left="20%" />
          </div>
        </div>
        <div style={{ padding: "30px 30px", overflow: "auto" }}>
          <PA11yLegend title="Jump picker · a11y · WCAG AA" items={PA11Y_ITEMS} />
        </div>
      </div>
    </window.ThemeProvider>
  );
}

// ── keyboard map + SR walkthrough ────────────────────────────
const PA11Y_KEYS = [
  { k: "Enter / Space", a: "On the cue: open the picker (focus moves to the selected day). On a day: select it + close." },
  { k: "Esc", a: "Close the picker, return focus to the month/year cue. Selection unchanged." },
  { k: "← → ↑ ↓", a: "Move day-by-day / week-by-week within the grid; wraps across weeks, skips disabled days." },
  { k: "PageUp / PageDown", a: "Previous / next month (same as the ◂ ▸ pager). Shift+Page = ± year." },
  { k: "Home / End", a: "Jump to the first / last day of the current week row." },
  { k: "Tab", a: "Cycles the pager buttons, the grid (one stop), Today, then out — the grid is a single tab-stop; arrows move within it." },
];

function KeyboardMap({ theme = "electric" }) {
  return (
    <window.ThemeProvider theme={theme} style={{ width: "100%", height: "100%" }}>
      <div style={{ width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)", fontFamily: "Inter, system-ui", padding: "30px 34px", overflow: "auto" }}>
        <MonoEyebrow size={11} color="var(--signal)" letterSpacing="0.16em" style={{ marginBottom: 18 }}>Keyboard model — full nav without a pointer</MonoEyebrow>
        <div style={{ display: "grid", gridTemplateColumns: "170px 1fr", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
          {PA11Y_KEYS.map((r, i) => (
            <React.Fragment key={i}>
              <div style={{ padding: "13px 14px", fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, fontWeight: 700, color: "var(--signal)", background: i % 2 ? "color-mix(in oklch, var(--surface-1) 50%, var(--bg))" : "var(--bg)", borderBottom: i === PA11Y_KEYS.length - 1 ? "none" : "1px solid var(--border)", borderRight: "1px solid var(--border)" }}>{r.k}</div>
              <div style={{ padding: "13px 16px", fontSize: 12.5, lineHeight: 1.5, color: "var(--fg-muted)", background: i % 2 ? "color-mix(in oklch, var(--surface-1) 50%, var(--bg))" : "var(--bg)", borderBottom: i === PA11Y_KEYS.length - 1 ? "none" : "1px solid var(--border)" }}>{r.a}</div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </window.ThemeProvider>
  );
}

const PA11Y_SR = [
  { action: "Focuses the cue.", reads: "\u201cApril 2026, jump to a date, button, collapsed.\u201d The visible label doubles as the accessible name." },
  { action: "Activates it.", reads: "\u201cJump to a date, April 2026, dialog.\u201d Focus lands on the selected day; the dialog is labelled by the visible month + year." },
  { action: "Pages to June.", reads: "\u201cNext month, button.\u201d then, on landing, the grid re-labels: cells now read \u201cJune\u2026\u201d. The month heading is a polite live region." },
  { action: "Arrows to Sat the 27th.", reads: "\u201cSaturday, June 27, 3 shows.\u201d Count is spoken with the date \u2014 the dot is never the only signal." },
  { action: "Selects it.", reads: "\u201cSelected.\u201d The picker closes, focus returns to the cue (now \u201cJune 2026\u2026 expanded\u2192collapsed\u201d), and the day list below updates." },
  { action: "Lands on an empty month.", reads: "\u201cCrickets in December, try later.\u201d The empty line is associated so it's read after the grid, not lost." },
];

function SRWalkthrough({ theme = "electric" }) {
  return (
    <window.ThemeProvider theme={theme} style={{ width: "100%", height: "100%" }}>
      <div style={{ width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)", fontFamily: "Inter, system-ui", padding: "30px 34px", overflow: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 18 }}>
          <MonoEyebrow size={10} color="var(--signal)" letterSpacing="0.16em">Jump picker · reaching a future weekend</MonoEyebrow>
          <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: "-0.02em" }}>How a screen-reader user makes the jump</div>
        </div>
        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 11 }}>
          {PA11Y_SR.map((s, i) => (
            <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 22, height: 22, borderRadius: 22, flexShrink: 0, marginTop: 1, background: "color-mix(in oklch, var(--signal) 18%, transparent)", border: "1px solid color-mix(in oklch, var(--signal) 45%, transparent)", color: "var(--signal)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: 11 }}>{i + 1}</div>
              <div style={{ flex: 1, paddingTop: 1 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: "var(--fg)" }}>{s.action}</span>{" "}
                <span style={{ fontWeight: 500, fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.5 }}>{s.reads}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </window.ThemeProvider>
  );
}

Object.assign(window, { AnnotatedPicker, KeyboardMap, SRWalkthrough });

// calendar-picker.jsx — #642 Calendar Jump Picker · core
//
// The picker lives in the WeekStrip header on the Browse · Cal surface. It lets
// a user jump straight to a specific future weekend instead of nudging the
// ± week chevrons day-by-day (the beta complaint that opened this track).
//
// Two-mode nav is preserved:
//   · ◂ ▸ chevrons  → page the loaded week (SSR week-paging in prod)
//   · tap month/year → open the jump grid, pick any day (client history.replace)
//
// Every "Open for Design to call" item is a PROP so the canvas can show each
// direction and the Tweaks panel can drive them live:
//   cueStyle:         "chip" | "caret" | "underline"   (header interactive cue)
//   indicators:       "dots" | "heat" | "none"          (event density in grid)
//   closing:          "both" | "scrim" | "x"            (dismiss affordance)
//   weekendEmphasis:  bool                              (tint Sat/Sun columns)
//   anim:             "scale" | "slide" | "fade"        (open motion shape)
//
// Exports (window): CJP_TODAY_ISO, cjpEventsFor, cjpFmtDate,
//   WeekStripHeader, JumpPicker, ArtRect

const { MonoEyebrow } = window;

// ── time anchors ─────────────────────────────────────────────
// "Today" = Tue Apr 28 2026 (matches the app's demo TODAY).
const CJP_TODAY = { y: 2026, m: 3, d: 28 };
const CJP_TODAY_ISO = "2026-04-28";
const CJP_MIN = { y: 2026, m: 3 };   // can't page before the current month
const CJP_MAX = { y: 2027, m: 3 };   // forward window ≈ 12 months

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MON3 = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DOW1 = ["S","M","T","W","T","F","S"];
const DOWFULL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const pad2 = (n) => String(n).padStart(2, "0");
const isoOf = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`;
const ymd = (y, m, d) => y * 10000 + (m + 1) * 100 + d;
const TODAY_YMD = ymd(CJP_TODAY.y, CJP_TODAY.m, CJP_TODAY.d);

// ── event density (deterministic) ────────────────────────────
// A couple of months are forced empty to exercise the empty-month treatment.
const CJP_EMPTY_MONTHS = new Set(["2026-11"]); // December 2026 = nothing booked
function cjpShowCount(y, m, d) {
  if (CJP_EMPTY_MONTHS.has(`${y}-${m}`)) return 0;
  if (ymd(y, m, d) < TODAY_YMD) return 0; // past days carry no forward shows
  const dow = new Date(y, m, d).getDay();
  const seed = ((y * 372 + (m + 1) * 31 + d) * 2654435761) >>> 0;
  const r = seed % 100;
  if (dow === 5 || dow === 6) return r < 26 ? 0 : 1 + (r % 6);       // Fri/Sat — busy
  if (dow === 4 || dow === 0) return r < 52 ? 0 : 1 + (r % 4);       // Thu/Sun — medium
  return r < 70 ? 0 : 1 + (r % 3);                                   // weekday — light
}
function cjpMonthHasShows(y, m) {
  const dim = new Date(y, m + 1, 0).getDate();
  for (let d = 1; d <= dim; d++) if (cjpShowCount(y, m, d) > 0) return true;
  return false;
}

// 6×7 matrix of days for a month view (Sunday-first), with prev/next spill.
function cjpMatrix(y, m) {
  const startDow = new Date(y, m, 1).getDay();
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const dt = new Date(y, m, 1 - startDow + i);
    cells.push({ y: dt.getFullYear(), m: dt.getMonth(), d: dt.getDate(), inMonth: dt.getMonth() === m });
  }
  return cells;
}

// ── named event rows (for the day list under the header) ─────
function artHue(s) {
  const h = s.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return [280, 200, 340, 160, 30, 220, 310, 180][h % 8];
}
const CJP_EVENTS = {
  "2026-04-28": [
    { artist: "Wednesday", venue: "Larimer Lounge", time: "8:00 PM", tier: "$" },
    { artist: "MJ Lenderman", venue: "Bluebird Theater", time: "9:00 PM", tier: "$$" },
  ],
  "2026-05-02": [
    { artist: "Jessica Pratt", venue: "Gothic Theatre", time: "8:30 PM", tier: "$$" },
    { artist: "Toro y Moi", venue: "Ogden Theatre", time: "9:00 PM", tier: "$$" },
    { artist: "DIIV", venue: "Summit", time: "7:30 PM", tier: "$$" },
  ],
  "2026-06-27": [
    { artist: "Sleep Token", venue: "Fillmore Auditorium", time: "8:00 PM", tier: "$$$" },
    { artist: "Julien Baker", venue: "Boettcher", time: "7:30 PM", tier: "$$" },
    { artist: "Anemone", venue: "Hi-Dive", time: "9:00 PM", tier: "$" },
  ],
};
function cjpEventsFor(iso) { return CJP_EVENTS[iso] || []; }
function cjpFmtDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][dt.getDay()]}, ${MON3[m - 1]} ${d}`;
}

// ── one-time style (motion + reduced-motion) ─────────────────
if (typeof document !== "undefined" && !document.getElementById("cjp-styles")) {
  const s = document.createElement("style");
  s.id = "cjp-styles";
  s.textContent = [
    ".cjp-pop{transition:transform .13s cubic-bezier(.2,.7,.3,1),opacity .13s ease}",
    ".cjp-pop.scale{transform:scale(.95);opacity:0;transform-origin:34px -6px}",
    ".cjp-pop.slide{transform:translateY(-10px);opacity:0}",
    ".cjp-pop.fade{opacity:0}",
    ".cjp-pop.cjp-in{transform:none;opacity:1}",
    ".cjp-day{cursor:pointer;transition:background .12s,box-shadow .12s}",
    ".cjp-day.cjp-dis{cursor:default}",
    ".cjp-hit:hover:not(.cjp-dis){background:var(--overlay-hover)}",
    ".cjp-cue{cursor:pointer;transition:background .12s,border-color .12s}",
    ".cjp-cue:hover{background:var(--overlay-hover)}",
    ".cjp-chev{cursor:pointer;transition:background .12s,opacity .12s}",
    ".cjp-chev:hover:not(:disabled){background:var(--overlay-hover)}",
    ".cjp-chev:disabled{opacity:.32;cursor:default}",
    ".cjp-car{transition:transform .16s cubic-bezier(.2,.7,.3,1)}",
    "@media (prefers-reduced-motion: reduce){.cjp-pop{transition:none!important;transform:none!important;opacity:1!important}.cjp-car{transition:none!important}}",
  ].join("\n");
  document.head.appendChild(s);
}

// ── image placeholder ────────────────────────────────────────
function ArtRect({ label, size = 52, radius = 9 }) {
  const hue = artHue(label);
  return (
    <div style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      background: `linear-gradient(135deg, oklch(0.34 0.09 ${hue}), oklch(0.2 0.05 ${hue + 40}))`,
      display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
    }}>
      <span style={{ fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: size * 0.4, color: `oklch(0.78 0.12 ${hue})`, opacity: 0.7 }}>
        {label.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

// ── chevron glyph ────────────────────────────────────────────
function Chevron({ dir = "left", size = 14, color = "var(--fg-muted)", w = 2 }) {
  const d = dir === "left" ? "M10 3L5 8l5 5" : "M6 3l5 5-5 5";
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d={d} stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// WeekStripHeader — the calendar surface header (rest state)
//   The month/year label is the tappable jump affordance.
// ─────────────────────────────────────────────────────────────
function WeekStripHeader({
  week, selectedISO, monthLabel, cueStyle = "chip", open = false,
  onToggle = () => {}, onPrevWeek = () => {}, onNextWeek = () => {},
  onSelectDay = () => {}, atMin = false, atMax = false, beforeChevrons = null,
}) {
  // cue chrome
  const cueBase = {
    display: "inline-flex", alignItems: "center", gap: 7,
    fontFamily: "Inter, system-ui", fontWeight: 800, letterSpacing: "-0.02em",
    color: "var(--fg)", fontSize: 17, lineHeight: 1,
    border: "1px solid transparent", borderRadius: 999, padding: "7px 12px",
  };
  const cueChrome =
    cueStyle === "chip"
      ? { background: open ? "var(--overlay-press)" : "var(--surface-2)", border: `1px solid ${open ? "var(--border-focus)" : "var(--border-strong)"}` }
      : cueStyle === "underline"
      ? { background: open ? "var(--overlay-hover)" : "transparent", borderBottom: "2px dotted var(--border-focus)", borderRadius: 0, padding: "6px 4px" }
      : { background: open ? "var(--overlay-hover)" : "transparent", padding: "6px 6px" }; // caret

  return (
    <div style={{ padding: "2px 12px 10px" }}>
      {/* month/year cue + ± week chevrons */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <button
          type="button" className="cjp-cue" onClick={onToggle}
          aria-haspopup="dialog" aria-expanded={open} aria-label={`${monthLabel}. Jump to a date`}
          style={{ ...cueBase, ...cueChrome, cursor: "pointer" }}
        >
          <span>{monthLabel}</span>
          <span className="cjp-car" style={{ display: "inline-flex", transform: open ? "rotate(180deg)" : "none" }}>
            <svg width="11" height="7" viewBox="0 0 11 7" aria-hidden="true">
              <path d="M1 1l4.5 4.5L10 1" stroke="var(--fg-muted)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {beforeChevrons}
          <button type="button" className="cjp-chev" onClick={onPrevWeek} disabled={atMin}
            aria-label="Previous week"
            style={{ all: "unset", width: 34, height: 34, borderRadius: 9, border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}>
            <Chevron dir="left" />
          </button>
          <button type="button" className="cjp-chev" onClick={onNextWeek} disabled={atMax}
            aria-label="Next week"
            style={{ all: "unset", width: 34, height: 34, borderRadius: 9, border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}>
            <Chevron dir="right" />
          </button>
        </div>
      </div>

      {/* 7-day week strip */}
      <div style={{ display: "flex", gap: 2 }}>
        {week.map((wd) => {
          const sel = wd.iso === selectedISO;
          const today = wd.iso === CJP_TODAY_ISO;
          const has = cjpShowCount(wd.y, wd.m, wd.d) > 0;
          return (
            <button key={wd.iso} type="button" onClick={() => onSelectDay(wd.iso)}
              aria-label={`${DOWFULL[new Date(wd.y, wd.m, wd.d).getDay()]} ${MON3[wd.m]} ${wd.d}${has ? ", shows" : ""}`}
              aria-pressed={sel}
              style={{
                all: "unset", flex: 1, boxSizing: "border-box", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                padding: "8px 0 6px", borderRadius: 10,
                background: sel ? "var(--signal)" : "transparent",
              }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 500, letterSpacing: "0.04em", color: sel ? "var(--fg-on-accent)" : "var(--fg-subtle)" }}>
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date(wd.y, wd.m, wd.d).getDay()]}
              </span>
              <span style={{ fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 16, color: sel ? "var(--fg-on-accent)" : today ? "var(--accent)" : "var(--fg)" }}>
                {wd.d}
              </span>
              <div style={{ width: 4, height: 4, borderRadius: 4, background: has ? (sel ? "var(--fg-on-accent)" : "var(--accent)") : "transparent" }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// JumpPicker — the open mini-month grid
// ─────────────────────────────────────────────────────────────
function JumpPicker({
  initialY = CJP_TODAY.y, initialM = CJP_TODAY.m, selectedISO,
  onSelect = () => {}, onClose = () => {},
  indicators = "dots", closing = "both", weekendEmphasis = true, anim = "scale",
  width = 300, showTodayChip = true,
}) {
  // shared "snap to today" glyph (same mark as the on-surface BackToTodayControl)
  const RotateCcw = window.RotateCcwGlyph;
  const [view, setView] = React.useState({ y: initialY, m: initialM });
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { const r = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(r); }, []);

  const atMin = view.y === CJP_MIN.y && view.m === CJP_MIN.m;
  const atMax = view.y === CJP_MAX.y && view.m === CJP_MAX.m;
  const pageMonth = (delta) => {
    const dt = new Date(view.y, view.m + delta, 1);
    const ny = dt.getFullYear(), nm = dt.getMonth();
    if (ymd(ny, nm, 1) < ymd(CJP_MIN.y, CJP_MIN.m, 1)) return;
    if (ymd(ny, nm, 1) > ymd(CJP_MAX.y, CJP_MAX.m, 1)) return;
    setView({ y: ny, m: nm });
  };

  const cells = cjpMatrix(view.y, view.m);
  const monthEmpty = !cjpMonthHasShows(view.y, view.m);
  const showX = closing === "both" || closing === "x";

  const cell = 38, gap = 2;

  return (
    <div
      role="dialog" aria-modal="false" aria-label={`Jump to a date — ${MONTHS[view.m]} ${view.y}`}
      className={`cjp-pop ${anim} ${mounted ? "cjp-in" : ""}`}
      style={{
        width, background: "var(--bg-elevated)", border: "1px solid var(--border-strong)",
        borderRadius: 16, boxShadow: "0 20px 50px rgba(0,0,0,0.42), 0 2px 8px rgba(0,0,0,0.3)",
        padding: 14, boxSizing: "border-box", color: "var(--fg)", fontFamily: "Inter, system-ui",
      }}>
      {/* pager header */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <button type="button" className="cjp-chev" onClick={() => pageMonth(-1)} disabled={atMin} aria-label="Previous month"
          style={{ all: "unset", width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}>
          <Chevron dir="left" color="var(--fg)" />
        </button>
        <div style={{ flex: 1, textAlign: "center", fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 15, letterSpacing: "-0.01em" }}>
          {MONTHS[view.m]} <span style={{ color: "var(--fg-muted)", fontWeight: 700 }}>{view.y}</span>
        </div>
        <button type="button" className="cjp-chev" onClick={() => pageMonth(1)} disabled={atMax} aria-label="Next month"
          style={{ all: "unset", width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}>
          <Chevron dir="right" color="var(--fg)" />
        </button>
        {showX && (
          <button type="button" className="cjp-chev" onClick={onClose} aria-label="Close date picker"
            style={{ all: "unset", width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box", marginLeft: 2 }}>
            <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true">
              <path d="M2 2l9 9M11 2l-9 9" stroke="var(--fg-muted)" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* weekday header */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap, marginBottom: 4 }}>
        {DOW1.map((l, i) => (
          <div key={i} aria-hidden="true" style={{
            textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
            letterSpacing: "0.06em", color: (i === 0 || i === 6) && weekendEmphasis ? "var(--fg-muted)" : "var(--fg-subtle)",
            paddingBottom: 2,
          }}>{l}</div>
        ))}
      </div>

      {/* day grid */}
      <div role="grid" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap }}>
        {cells.map((c, i) => {
          const iso = isoOf(c.y, c.m, c.d);
          const dow = new Date(c.y, c.m, c.d).getDay();
          const isWknd = dow === 0 || dow === 6;
          const count = c.inMonth ? cjpShowCount(c.y, c.m, c.d) : 0;
          const past = ymd(c.y, c.m, c.d) < TODAY_YMD;
          const sel = iso === selectedISO;
          const today = iso === CJP_TODAY_ISO;
          const disabled = !c.inMonth || past;

          // background: selected > heat tint > weekend tint
          let bg = "transparent";
          if (sel) bg = "var(--signal)";
          else if (indicators === "heat" && count > 0 && !disabled) {
            const a = Math.min(0.34, 0.08 + count * 0.045);
            bg = `color-mix(in oklch, var(--signal) ${Math.round(a * 100)}%, transparent)`;
          } else if (weekendEmphasis && isWknd && c.inMonth && !disabled) {
            bg = "color-mix(in oklch, var(--surface-2) 60%, transparent)";
          }

          const numColor = sel ? "var(--fg-on-accent)"
            : !c.inMonth ? "var(--fg-subtle)"
            : past ? "var(--fg-subtle)"
            : today ? "var(--accent)" : "var(--fg)";

          return (
            <button key={i} type="button" role="gridcell"
              className={`cjp-day cjp-hit ${disabled ? "cjp-dis" : ""}`}
              onClick={disabled ? undefined : () => onSelect(iso)}
              aria-disabled={disabled} aria-selected={sel}
              aria-label={`${DOWFULL[dow]}, ${MONTHS[c.m]} ${c.d}${count > 0 ? `, ${count} show${count > 1 ? "s" : ""}` : ", no shows"}${today ? ", today" : ""}`}
              style={{
                all: "unset", boxSizing: "border-box", position: "relative",
                height: cell, borderRadius: 9, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 2,
                background: bg, opacity: !c.inMonth ? 0.4 : past ? 0.45 : 1,
                boxShadow: today && !sel ? "inset 0 0 0 1.5px var(--accent)" : "none",
                cursor: disabled ? "default" : "pointer",
              }}>
              <span style={{ fontFamily: "Inter, system-ui", fontWeight: sel || today ? 800 : 600, fontSize: 13.5, color: numColor, lineHeight: 1 }}>
                {c.d}
              </span>
              {/* dot indicator */}
              {indicators === "dots" && count > 0 && !disabled && (
                <span style={{ width: 4, height: 4, borderRadius: 4, background: sel ? "var(--fg-on-accent)" : "var(--accent)" }} />
              )}
              {indicators !== "dots" && <span style={{ height: 4 }} />}
            </button>
          );
        })}
      </div>

      {/* footer: today reset + empty-month line */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 12, minHeight: 22 }}>
        {showTodayChip ? (
          <button type="button" onClick={() => { setView({ y: CJP_TODAY.y, m: CJP_TODAY.m }); onSelect(CJP_TODAY_ISO); }}
            aria-label="Snap to today"
            style={{
              all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
              padding: "5px 10px", borderRadius: 999, border: "1px solid var(--border-strong)",
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em",
              textTransform: "uppercase", color: "var(--fg-muted)",
            }}>
            {RotateCcw ? <RotateCcw size={12} color="var(--accent)" /> : <span style={{ width: 5, height: 5, borderRadius: 5, background: "var(--accent)" }} />} Today
          </button>
        ) : <span />}
        {monthEmpty
          ? <MonoEyebrow size={9.5} color="var(--fg-subtle)" letterSpacing="0.1em">Crickets in {MON3[view.m]}. Try later.</MonoEyebrow>
          : <MonoEyebrow size={9.5} color="var(--fg-subtle)" letterSpacing="0.1em">Dots = shows on sale</MonoEyebrow>}
      </div>
    </div>
  );
}

Object.assign(window, {
  CJP_TODAY_ISO, CJP_TODAY, CJP_MIN, CJP_MAX, MONTHS, MON3,
  cjpShowCount, cjpMonthHasShows, cjpMatrix, cjpEventsFor, cjpFmtDate,
  isoOf, ymd, WeekStripHeader, JumpPicker, ArtRect, Chevron,
});

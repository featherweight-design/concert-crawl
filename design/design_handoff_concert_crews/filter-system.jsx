// ────────────────────────────────────────────────────────────────
// Filter system — shared between Browse Home (mobile) and
// Browse Desktop. Exposes:
//   • FILTER_DEFS        — concrete options for each filter
//   • applyFilters()     — pure filter function (events × filters → events)
//   • <FilterSheet>      — mobile bottom sheet (slides up from bottom)
//   • <FilterPopover>    — desktop popover (anchored beneath chip)
//
// All filters are SINGLE-SELECT for now — one value per dimension,
// reset by tapping the same option again or "Any …".
// ────────────────────────────────────────────────────────────────

// ── Concrete options ────────────────────────────────────────────
// Today is 2026-04-28 in the demo data set. "This week" = Mon–Sun
// containing today (2026-04-27 → 2026-05-03).
const TODAY = "2026-04-28";

function inThisWeekend(dateStr) {
  // Apr 28 = Tue. This weekend = Sat May 2 + Sun May 3 — but for the
  // demo we accept "Fri May 1" too as the kickoff of the weekend.
  return ["2026-05-01", "2026-05-02", "2026-05-03"].includes(dateStr);
}
function inThisWeek(dateStr) {
  // Mon Apr 27 → Sun May 3
  return dateStr >= "2026-04-27" && dateStr <= "2026-05-03";
}
function inNextWeek(dateStr) {
  // Mon May 4 → Sun May 10
  return dateStr >= "2026-05-04" && dateStr <= "2026-05-10";
}

const FILTER_DEFS_FS = {
  date: {
    label: "When",
    placeholder: "Any date",
    options: [
      { value: "tonight",       label: "Tonight",       match: e => e.date === TODAY },
      { value: "this-weekend",  label: "This weekend",  match: e => inThisWeekend(e.date) },
      { value: "this-week",     label: "This week",     match: e => inThisWeek(e.date) },
      { value: "next-week",     label: "Next week",     match: e => inNextWeek(e.date) },
    ],
  },
  venue: {
    label: "Where",
    placeholder: "Any venue",
    options: [
      { value: "red-rocks",       label: "Red Rocks Amphitheatre", match: e => e.venue === "Red Rocks Amphitheatre" },
      { value: "gothic",          label: "Gothic Theatre",         match: e => e.venue === "Gothic Theatre" },
      { value: "bluebird",        label: "Bluebird Theater",       match: e => e.venue === "Bluebird Theater" },
      { value: "ogden",           label: "Ogden Theatre",          match: e => e.venue === "Ogden Theatre" },
      { value: "mission",         label: "Mission Ballroom",       match: e => e.venue === "Mission Ballroom" },
    ],
  },
  price: {
    label: "How much",
    placeholder: "Any price",
    options: [
      { value: "under-25",  label: "Under $25",   match: e => priceMin(e.price) !== null && priceMin(e.price) < 25 },
      { value: "25-50",     label: "$25 – $50",   match: e => priceMin(e.price) !== null && priceMin(e.price) >= 25 && priceMin(e.price) <= 50 },
      { value: "50-plus",   label: "$50 +",       match: e => priceMin(e.price) !== null && priceMin(e.price) > 50 },
      { value: "tbd",       label: "Price TBD",   match: e => !e.price },
    ],
  },
  genre: {
    label: "Vibe",
    placeholder: "Any vibe",
    options: [
      { value: "rock",        label: "Rock & punk",       match: e => hasGenre(e, ["punk","garage rock","alt rock","indie rock","noise rock","shoegaze"]) },
      { value: "electronic",  label: "Electronic",        match: e => hasGenre(e, ["electronic","house","hyperpop"]) },
      { value: "metal",       label: "Metal & heavy",     match: e => hasGenre(e, ["metalcore"]) },
      { value: "americana",   label: "Americana & folk",  match: e => hasGenre(e, ["americana"]) },
      { value: "regional",    label: "Regional mexican",  match: e => hasGenre(e, ["regional mexican"]) },
    ],
  },
};

// Extract the lower bound of a "$28" / "$55–$95" string, or null if missing.
function priceMin(p) {
  if (!p) return null;
  const m = String(p).match(/\$(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}
function hasGenre(e, candidates) {
  if (!Array.isArray(e.genre) || e.genre.length === 0) return false;
  const set = new Set(candidates);
  return e.genre.some(g => set.has(g));
}

// ── Pure filter ─────────────────────────────────────────────────
function applyFiltersFS(events, filters) {
  if (!filters) return events;
  let out = events;
  for (const [key, value] of Object.entries(filters)) {
    if (!value) continue;
    const def = FILTER_DEFS_FS[key];
    if (!def) continue;
    const opt = def.options.find(o => o.value === value);
    if (!opt) continue;
    out = out.filter(opt.match);
  }
  return out;
}

// Pretty-print the active value of a filter for the chip label.
function activeLabelFS(key, value) {
  if (!value) return null;
  const def = FILTER_DEFS_FS[key];
  if (!def) return null;
  const opt = def.options.find(o => o.value === value);
  return opt ? opt.label : null;
}

// Count how many filters are active.
function countActiveFS(filters) {
  if (!filters) return 0;
  return Object.values(filters).filter(Boolean).length;
}

// ── Mobile bottom sheet ─────────────────────────────────────────
// Slides up from the bottom of the device. Single-pane: chooses one
// filter dimension at a time. Tap a chip to open; tap an option to
// apply and dismiss.
function FilterSheet({ open, filterKey, currentValue, onApply, onClose }) {
  const def = filterKey ? FILTER_DEFS_FS[filterKey] : null;
  if (!def) return null;

  return (
    <>
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{
          position: "absolute", inset: 0,
          background: open ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0)",
          pointerEvents: open ? "auto" : "none",
          transition: "background 0.18s ease",
          zIndex: 90,
        }}
      />
      {/* Sheet */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        background: "var(--bg-elevated)",
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        borderTop: "1px solid var(--border-strong)",
        boxShadow: "0 -20px 40px -20px rgba(0,0,0,0.6)",
        transform: open ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.22s cubic-bezier(0.32,0.72,0.36,1)",
        zIndex: 91,
        paddingBottom: 22,
      }}>
        {/* Grabber */}
        <div style={{
          display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 4,
        }}>
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: "var(--border-strong)",
          }} />
        </div>

        {/* Header */}
        <div style={{
          padding: "10px 20px 12px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid var(--border)",
        }}>
          <div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              color: "var(--signal)", letterSpacing: "0.14em",
              textTransform: "uppercase", fontWeight: 700, marginBottom: 2,
            }}>{def.label}</div>
            <div style={{
              fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 18,
              color: "var(--fg)",
            }}>{def.placeholder}</div>
          </div>
          <button onClick={onClose} style={{
            all: "unset", cursor: "pointer",
            width: 32, height: 32, borderRadius: 16,
            background: "var(--surface-1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--fg-muted)",
          }}>
            <svg width="14" height="14" viewBox="0 0 16 16">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor"
                strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            </svg>
          </button>
        </div>

        {/* "Any X" reset row */}
        <button
          onClick={() => { onApply(null); onClose(); }}
          style={{
            all: "unset", cursor: "pointer",
            display: "block", width: "100%", boxSizing: "border-box",
            padding: "16px 20px",
            fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 15.5,
            color: !currentValue ? "var(--signal)" : "var(--fg-muted)",
            borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
        >
          <span>{def.placeholder}</span>
          {!currentValue && <Checkmark />}
        </button>

        {/* Options */}
        {def.options.map(opt => {
          const active = currentValue === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => { onApply(opt.value); onClose(); }}
              style={{
                all: "unset", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", boxSizing: "border-box",
                padding: "16px 20px",
                fontFamily: "Inter, system-ui", fontWeight: active ? 700 : 500, fontSize: 15.5,
                color: active ? "var(--signal)" : "var(--fg)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span>{opt.label}</span>
              {active && <Checkmark />}
            </button>
          );
        })}
      </div>
    </>
  );
}

function Checkmark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 8.5l3.2 3.2L13 5" stroke="var(--signal)"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

// ── Desktop popover ──────────────────────────────────────────────
// Anchored beneath an arbitrary chip element. Closes on outside click
// or Escape.
function FilterPopover({ open, anchorEl, filterKey, currentValue, onApply, onClose }) {
  const ref = React.useRef(null);

  // Position relative to anchor.
  const [pos, setPos] = React.useState({ top: 0, left: 0 });
  React.useLayoutEffect(() => {
    if (!open || !anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    setPos({ top: rect.bottom + 8, left: rect.left });
  }, [open, anchorEl]);

  // Outside click / escape.
  React.useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target) && e.target !== anchorEl) {
        onClose();
      }
    }
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, anchorEl, onClose]);

  if (!open || !filterKey) return null;
  const def = FILTER_DEFS_FS[filterKey];
  if (!def) return null;

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: pos.top, left: pos.left,
        minWidth: 240, maxWidth: 320,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-strong)",
        borderRadius: 12,
        boxShadow: "0 20px 48px -12px rgba(0,0,0,0.55), 0 4px 12px -4px rgba(0,0,0,0.35)",
        zIndex: 200,
        padding: "6px 0",
        fontFamily: "Inter, system-ui",
      }}
    >
      {/* Label header */}
      <div style={{
        padding: "8px 14px 6px",
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
        color: "var(--signal)", letterSpacing: "0.14em",
        textTransform: "uppercase", fontWeight: 700,
      }}>{def.label}</div>

      <button
        onClick={() => { onApply(null); onClose(); }}
        style={{
          all: "unset", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", boxSizing: "border-box",
          padding: "10px 14px",
          fontWeight: 500, fontSize: 13.5,
          color: !currentValue ? "var(--signal)" : "var(--fg-muted)",
        }}
      >
        <span>{def.placeholder}</span>
        {!currentValue && <Checkmark />}
      </button>

      {def.options.map(opt => {
        const active = currentValue === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => { onApply(opt.value); onClose(); }}
            style={{
              all: "unset", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", boxSizing: "border-box",
              padding: "10px 14px",
              fontWeight: active ? 700 : 500, fontSize: 13.5,
              color: active ? "var(--signal)" : "var(--fg)",
              background: active ? "var(--surface-1)" : "transparent",
              transition: "background 0.12s",
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--surface-1)"; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
          >
            <span>{opt.label}</span>
            {active && <Checkmark />}
          </button>
        );
      })}
    </div>
  );
}

// ── No-results empty state ──────────────────────────────────────
// Friendly fallback when filters return zero events. Has a "Clear
// filters" CTA to reset.
function NoResultsState({ onClearFilters, dense = false }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", textAlign: "center",
      padding: dense ? "40px 24px" : "60px 32px",
      gap: 14,
    }}>
      {/* Text-only empty state for now — illustration to be added
          in a later enhancement pass. */}
      <div>
        <div style={{
          fontFamily: "Inter, system-ui", fontWeight: 800,
          fontSize: dense ? 22 : 28, color: "var(--fg)",
          letterSpacing: "-0.02em", marginBottom: 6,
        }}>
          Crickets.
        </div>
        <div style={{
          fontFamily: "Inter, system-ui", fontSize: dense ? 13 : 14,
          color: "var(--fg-muted)", maxWidth: 340, lineHeight: 1.4,
          textWrap: "pretty",
        }}>
          No shows match these filters. Try a wider date range or
          drop a filter to bring the volume back.
        </div>
      </div>
      {onClearFilters && (
        <button onClick={onClearFilters} style={{
          all: "unset", cursor: "pointer",
          marginTop: 4,
          padding: "10px 18px", borderRadius: 999,
          background: "var(--signal)", color: "var(--fg-on-accent)",
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13.5,
          letterSpacing: "-0.005em",
        }}>Clear all filters</button>
      )}
    </div>
  );
}

// ── Exports ─────────────────────────────────────────────────────
window.FILTER_DEFS = FILTER_DEFS_FS;
window.applyFilters = applyFiltersFS;
window.filterActiveLabel = activeLabelFS;
window.filterCountActive = countActiveFS;
window.FilterSheet = FilterSheet;
window.FilterPopover = FilterPopover;
window.NoResultsState = NoResultsState;

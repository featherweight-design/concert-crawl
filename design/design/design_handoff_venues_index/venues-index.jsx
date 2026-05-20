// venues-index.jsx — Concert Crawl, Venues index (desktop)
//
// Pulls visual vocabulary from the Venue Detail page (`detail-desktop.jsx`,
// the Phase 7.5 identity art system, the venue stats row, type chip) and
// applies it to the index so rows carry the same "owned art + monogram +
// type chip + capacity / upcoming mono stats" signature as the detail page
// they link into.
//
// Two surfaces in here:
//   1.  <VenueFeatureCard/> — a wide horizontal hero card for the flagship
//       venue (Red Rocks). Same diagonal-stripes identity art + monogram
//       chip + Inter 800 title + Denver · Directions row + stats triad as
//       the detail page, just compressed into one row.
//   2.  <VenueRow/> — enriched list row: 72×72 identity art tile, name,
//       type pill + neighborhood, then mono stats (CAPACITY / UPCOMING)
//       on the right, then chevron.
//
// No new fonts, no new color tokens. Everything reads off `var(--*)` and
// the same Inter / JetBrains Mono pairing the rest of the app uses.

const VI_IdentityArt = window.IdentityArt;
const VI_identityFor = window.identityFor;
const VI_getInitials = window.ia_getInitials;
const VI_isDark      = window.ia_isDark;

// ── Data ───────────────────────────────────────────────────────
// Matches the 13 venues in the bare-bones index. Capacities + neighborhoods
// + upcoming counts wired up from the venue admin + crawl data we already
// have on file.
// `distance` is miles from downtown Denver (LoDo centroid). Will read off
// the user's geolocation in production; mocked here for design.
const VI_VENUES = [
  { name: "Bluebird Theater",           type: "Theater",      neighborhood: "Colfax",            capacity: 550,   upcoming: 12, distance: 2.5,  city: "Denver" },
  { name: "Cervantes' Masterpiece Ballroom", type: "Ballroom", neighborhood: "Five Points",     capacity: 900,   upcoming: 8,  distance: 1.2,  city: "Denver" },
  { name: "Fiddler's Green Amphitheatre", type: "Amphitheater", neighborhood: "Greenwood Village", capacity: 17000, upcoming: 16, distance: 13.4, city: "Denver" },
  { name: "Gothic Theatre",             type: "Theater",      neighborhood: "Englewood",         capacity: 1000,  upcoming: 11, distance: 8.1,  city: "Denver" },
  { name: "Hi-Dive",                    type: "Club",         neighborhood: "South Broadway",    capacity: 250,   upcoming: 6,  distance: 3.2,  city: "Denver" },
  { name: "Larimer Lounge",             type: "Club",         neighborhood: "RiNo",              capacity: 280,   upcoming: 7,  distance: 0.8,  city: "Denver" },
  { name: "Levitt Pavilion",            type: "Pavilion",     neighborhood: "Ruby Hill",         capacity: 7500,  upcoming: 4,  distance: 4.7,  city: "Denver" },
  { name: "Marquis Theater",            type: "Theater",      neighborhood: "LoDo",              capacity: 500,   upcoming: 5,  distance: 0.3,  city: "Denver" },
  { name: "Mission Ballroom",           type: "Ballroom",     neighborhood: "RiNo",              capacity: 3950,  upcoming: 22, distance: 1.6,  city: "Denver" },
  { name: "Ogden Theatre",              type: "Theater",      neighborhood: "Capitol Hill",      capacity: 1600,  upcoming: 14, distance: 2.1,  city: "Denver" },
  { name: "Red Rocks Amphitheatre",     type: "Amphitheater", neighborhood: "Morrison",          capacity: 9525,  upcoming: 50, distance: 17.8, city: "Denver", featured: true },
  { name: "Summit Music Hall",          type: "Hall",         neighborhood: "Ballpark",          capacity: 1800,  upcoming: 9,  distance: 0.6,  city: "Denver" },
  { name: "The Fillmore Auditorium",    type: "Auditorium",   neighborhood: "Capitol Hill",      capacity: 3700,  upcoming: 18, distance: 1.9,  city: "Denver" },
];

function fmtDistance(mi) {
  return mi < 10 ? `${mi.toFixed(1)} mi` : `${Math.round(mi)} mi`;
}

function fmtNum(n) {
  return n.toLocaleString("en-US");
}

// ── Filter / sort definitions ─────────────────────────────────
// Mirrors the Browse FilterBar shape so the chips read identically.
const VI_FILTER_DEFS = {
  sort: {
    label: "Sort",
    placeholder: "Most upcoming",
    // Sort is always-on (not clearable) — has a default value rather than null.
    alwaysOn: true,
    options: [
      { value: "upcoming", label: "Most upcoming shows", sort: (a, b) => b.upcoming - a.upcoming },
      { value: "distance", label: "Nearest first",       sort: (a, b) => a.distance - b.distance },
      { value: "cap-desc", label: "Largest capacity",    sort: (a, b) => b.capacity - a.capacity },
      { value: "cap-asc",  label: "Smallest capacity",   sort: (a, b) => a.capacity - b.capacity },
      { value: "alpha",    label: "Alphabetical",        sort: (a, b) => a.name.localeCompare(b.name) },
    ],
  },
  capacity: {
    label: "Capacity",
    placeholder: "Any capacity",
    options: [
      { value: "intimate",   label: "Intimate (< 500)",        match: v => v.capacity < 500 },
      { value: "club",       label: "Club (500 – 1,500)",      match: v => v.capacity >= 500 && v.capacity < 1500 },
      { value: "mid",        label: "Mid-size (1,500 – 4,000)", match: v => v.capacity >= 1500 && v.capacity < 4000 },
      { value: "large",      label: "Large (4,000 – 10,000)",   match: v => v.capacity >= 4000 && v.capacity < 10000 },
      { value: "arena",      label: "Arena (10,000+)",          match: v => v.capacity >= 10000 },
    ],
  },
  distance: {
    label: "Distance",
    placeholder: "Any distance",
    options: [
      { value: "walking",  label: "Walking (< 1 mi)",  match: v => v.distance < 1 },
      { value: "near",     label: "Nearby (< 5 mi)",   match: v => v.distance < 5 },
      { value: "metro",    label: "Metro (< 15 mi)",   match: v => v.distance < 15 },
      { value: "far",      label: "Day trip (15+ mi)", match: v => v.distance >= 15 },
    ],
  },
};

const VI_FILTER_KEYS = ["sort", "capacity", "distance"];

// Apply current filter state to the venue list, then sort.
function vi_applyFilters(venues, state) {
  let out = venues;
  for (const key of ["capacity", "distance"]) {
    const v = state[key];
    if (!v) continue;
    const opt = VI_FILTER_DEFS[key].options.find(o => o.value === v);
    if (opt) out = out.filter(opt.match);
  }
  const sortOpt = VI_FILTER_DEFS.sort.options.find(o => o.value === state.sort)
    || VI_FILTER_DEFS.sort.options[0];
  return [...out].sort(sortOpt.sort);
}

// Active label for a chip: the chosen option's label, or placeholder.
function vi_chipLabel(key, value) {
  const def = VI_FILTER_DEFS[key];
  if (!value) return def.placeholder;
  const opt = def.options.find(o => o.value === value);
  return opt ? opt.label : def.placeholder;
}

// ── Filter popover ─────────────────────────────────────────────
// Anchored under the chip that opened it. Single-select; tapping the
// active option clears (except for sort, which always has a value).
function VI_Popover({ open, anchorRef, filterKey, value, onApply, onClose }) {
  const ref = React.useRef(null);
  const [pos, setPos] = React.useState(null);

  React.useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + window.scrollY + 6, left: r.left + window.scrollX });
  }, [open, anchorRef]);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target) &&
          anchorRef.current && !anchorRef.current.contains(e.target)) onClose();
    };
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, anchorRef, onClose]);

  if (!open || !filterKey || !pos) return null;
  const def = VI_FILTER_DEFS[filterKey];

  return (
    <div ref={ref} style={{
      position: "absolute", top: pos.top, left: pos.left, zIndex: 30,
      minWidth: 240,
      background: "var(--bg-elevated)",
      border: "1px solid var(--border-strong)",
      borderRadius: 10, padding: 6,
      boxShadow: "0 12px 36px rgba(0,0,0,0.4)",
      fontFamily: "Inter, system-ui",
    }}>
      {!def.alwaysOn && (
        <button
          onClick={() => { onApply(null); onClose(); }}
          style={{
            all: "unset", cursor: "pointer", display: "flex", width: "100%",
            padding: "8px 10px", borderRadius: 6, boxSizing: "border-box",
            fontSize: 13, fontWeight: !value ? 700 : 500,
            color: !value ? "var(--fg)" : "var(--fg-muted)",
            background: !value ? "var(--surface-2)" : "transparent",
          }}
          onMouseEnter={(e) => { if (value) e.currentTarget.style.background = "var(--overlay-hover)"; }}
          onMouseLeave={(e) => { if (value) e.currentTarget.style.background = "transparent"; }}
        >{def.placeholder}</button>
      )}
      {def.options.map(o => {
        const active = o.value === value;
        return (
          <button key={o.value}
            onClick={() => { onApply(active && !def.alwaysOn ? null : o.value); onClose(); }}
            style={{
              all: "unset", cursor: "pointer", display: "flex", width: "100%",
              padding: "8px 10px", borderRadius: 6, boxSizing: "border-box",
              fontSize: 13, fontWeight: active ? 700 : 500,
              color: active ? "var(--fg)" : "var(--fg-muted)",
              background: active ? "var(--surface-2)" : "transparent",
              justifyContent: "space-between", alignItems: "center",
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--overlay-hover)"; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
          >
            <span>{o.label}</span>
            {active && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6.5l2.5 2.5L10 3.5" stroke="var(--signal)" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Filter pills row (mirrors browse-desktop's FilterPillsBD) ───
function VI_FilterPills({ state, setState }) {
  const [openKey, setOpenKey] = React.useState(null);
  const refs = {
    sort:     React.useRef(null),
    capacity: React.useRef(null),
    distance: React.useRef(null),
  };

  const clearable = VI_FILTER_KEYS.filter(k => !VI_FILTER_DEFS[k].alwaysOn);
  const anyActive = clearable.some(k => state[k]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      {VI_FILTER_KEYS.map(key => {
        const def = VI_FILTER_DEFS[key];
        const value = state[key];
        // Sort is "active" looking only when it's not the default first option.
        const active = def.alwaysOn
          ? (value && value !== def.options[0].value)
          : !!value;
        const label = vi_chipLabel(key, value);
        // Render the "Sort:" prefix only on the sort chip, in mono.
        const showPrefix = def.alwaysOn;
        return (
          <button
            key={key}
            ref={refs[key]}
            onClick={() => setOpenKey(openKey === key ? null : key)}
            style={{
              all: "unset", cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 12px", borderRadius: 999,
              background: active ? "var(--signal)" : "var(--surface-1)",
              color: active ? "var(--fg-on-accent)" : "var(--fg)",
              border: active ? "1px solid var(--signal)" : "1px solid var(--border)",
              fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12.5,
              letterSpacing: "-0.005em",
            }}
          >
            {showPrefix && (
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase",
                color: active ? "var(--fg-on-accent)" : "var(--fg-subtle)",
                opacity: active ? 0.7 : 1,
              }}>Sort</span>
            )}
            <span style={{ whiteSpace: "nowrap" }}>{label}</span>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        );
      })}
      {anyActive && (
        <button
          onClick={() => setState(s => ({ ...s, capacity: null, distance: null }))}
          style={{
            all: "unset", cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
            padding: "7px 12px", borderRadius: 999,
            border: "1px dashed var(--border-strong)",
            fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12.5,
            color: "var(--fg-muted)",
          }}
        >× Clear filters</button>
      )}
      <VI_Popover
        open={!!openKey}
        anchorRef={openKey ? refs[openKey] : { current: null }}
        filterKey={openKey}
        value={openKey ? state[openKey] : null}
        onApply={(v) => setState(s => ({ ...s, [openKey]: v }))}
        onClose={() => setOpenKey(null)}
      />
    </div>
  );
}

// ── Cluster Path mark ──────────────────────────────────────────
// Lifted from browse-home.jsx — same source-of-truth as the rest of the app.
function VI_CCMark({ size = 32 }) {
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

// ── Top nav (matches production: Browse · Venues · Watching) ───
function VI_TopNav({ active = "venues" }) {
  const tabs = [
    { key: "browse",   label: "Browse" },
    { key: "venues",   label: "Venues" },
    { key: "watching", label: "Watching" },
  ];
  return (
    <header style={{
      height: 64, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 32px",
      borderBottom: "1px solid var(--border)",
      background: "var(--bg-elevated)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 7, overflow: "hidden", flexShrink: 0 }}>
            <VI_CCMark size={32} />
          </div>
          <span style={{
            fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 17,
            letterSpacing: "-0.02em", color: "var(--fg)",
          }}>
            concert<span style={{ color: "var(--accent)" }}>crawl.</span>
          </span>
        </div>
        <nav style={{ display: "flex", gap: 4 }}>
          {tabs.map(t => (
            <button key={t.key} style={{
              all: "unset", cursor: "pointer",
              padding: "8px 14px", borderRadius: 8,
              fontFamily: "Inter, system-ui",
              fontWeight: t.key === active ? 700 : 500, fontSize: 13,
              color: t.key === active ? "var(--fg)" : "var(--fg-muted)",
              background: t.key === active ? "var(--surface-2)" : "transparent",
              letterSpacing: "-0.01em",
            }}>{t.label}</button>
          ))}
        </nav>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          height: 36, padding: "0 12px",
          borderRadius: 8, background: "var(--surface-1)",
          border: "1px solid var(--border)", width: 320, boxSizing: "border-box",
          color: "var(--fg-subtle)",
        }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span style={{ fontFamily: "Inter, system-ui", fontSize: 13 }}>Search artists or venues…</span>
          <span style={{
            marginLeft: "auto",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: "var(--fg-subtle)",
            padding: "2px 5px", borderRadius: 3,
            border: "1px solid var(--border-strong)",
          }}>⌘K</span>
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: 18,
          background: "var(--signal)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13,
          color: "var(--fg-on-accent)",
        }}>H</div>
      </div>
    </header>
  );
}

// ── Type chip (flagship card eyebrow only) ─────────────────────
// Same mono / surface-2 backplate the detail page uses for the chip
// above the H1. Kept on the flagship card for character; dropped from
// list rows where "Theater"/"Ballroom" mostly restated the name.
function VI_TypeChip({ type }) {
  return (
    <span style={{
      display: "inline-block", padding: "4px 10px", borderRadius: 6,
      background: "var(--surface-2)",
      border: "1px solid var(--border-strong)",
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 11, fontWeight: 500, letterSpacing: "0.04em",
      color: "var(--fg-muted)",
    }}>{type}</span>
  );
}

// ── Stat (matches the venue detail page CAPACITY / UPCOMING / TYPE row) ──
function VI_Stat({ label, value, signal = false, align = "right" }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 6,
      alignItems: align === "right" ? "flex-end" : "flex-start",
      minWidth: 0,
    }}>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, fontWeight: 500, letterSpacing: "0.12em",
        textTransform: "uppercase", color: "var(--fg-subtle)",
        whiteSpace: "nowrap",
      }}>{label}</span>
      <span style={{
        fontFamily: "Inter, system-ui",
        fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em",
        color: signal ? "var(--signal)" : "var(--fg)",
        lineHeight: 1, whiteSpace: "nowrap",
      }}>{value}</span>
    </div>
  );
}

// ── Identity tile (small; for list rows) ───────────────────────
// Pulls IdentityArt at tile scale + adds the monogram chip in the
// bottom-left corner — same convention the detail-page hero uses.
function VI_IdentityTile({ name, size = 72 }) {
  const id = VI_identityFor(name, "venue");
  const palette = id.palette;
  const dark = VI_isDark(palette.bg);
  const initials = VI_getInitials(name, 2);
  return (
    <div style={{
      position: "relative", width: size, height: size, flexShrink: 0,
      borderRadius: 10, overflow: "hidden",
      border: "1px solid var(--border)",
    }}>
      <VI_IdentityArt
        name={name} kind="venue" scale="tile" showInitials={false}
        grain={0.08} width={size} height={size}
      />
      {/* Monogram chip — bottom-left, exactly as on the detail page hero */}
      <div style={{
        position: "absolute", left: 6, bottom: 6,
        padding: "2px 6px", borderRadius: 5,
        background: dark ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.78)",
        backdropFilter: "blur(4px)",
        fontFamily: "Inter, system-ui", fontWeight: 900,
        fontSize: 10, letterSpacing: "0.04em",
        color: dark ? "#F1E6D5" : "#191418",
        lineHeight: 1,
      }}>{initials}</div>
    </div>
  );
}

// ── Featured (flagship) venue card ─────────────────────────────
// One wide horizontal card at the top, modeled on the venue detail page hero.
// Same diagonal-stripes identity art + monogram chip + Inter 800 title +
// Denver · Directions + capacity/upcoming/type stats — just laid out
// horizontally so it doesn't dominate the index.
function VI_FeatureCard({ venue }) {
  const id = VI_identityFor(venue.name, "venue");
  const palette = id.palette;
  const dark = VI_isDark(palette.bg);
  const initials = VI_getInitials(venue.name, 2);
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        all: "unset", cursor: "pointer", display: "block", width: "100%",
        boxSizing: "border-box",
      }}>
      <div style={{
        display: "grid", gridTemplateColumns: "360px 1fr",
        borderRadius: 14, overflow: "hidden",
        background: hover ? "var(--surface-2)" : "var(--surface-1)",
        border: `1px solid ${hover ? "var(--border-strong)" : "var(--border)"}`,
        transition: "background .14s, border-color .14s",
      }}>
      {/* Identity art panel — full bleed on left */}
      <div style={{ position: "relative", height: 240, background: palette.bg }}>
        <VI_IdentityArt
          name={venue.name} kind="venue" scale="hero" showInitials={false}
          grain={0.10} width="100%" height="100%"
          templateOverride="stripes"
        />
        {/* Monogram chip */}
        <div style={{
          position: "absolute", left: 14, bottom: 14,
          padding: "8px 12px", borderRadius: 8,
          background: dark ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.78)",
          backdropFilter: "blur(6px)",
          fontFamily: "Inter, system-ui", fontWeight: 900,
          fontSize: 24, letterSpacing: "0.02em",
          color: dark ? "#F1E6D5" : "#191418",
          lineHeight: 1,
        }}>{initials}</div>
        {/* "Flagship" eyebrow */}
        <div style={{
          position: "absolute", left: 14, top: 14,
          padding: "4px 10px", borderRadius: 999,
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, fontWeight: 600, letterSpacing: "0.16em",
          textTransform: "uppercase", color: "#F1E6D5",
        }}>★ Flagship</div>
      </div>
      {/* Meta — right column */}
      <div style={{
        padding: "24px 28px",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        position: "relative",
      }}>
        {/* Chevron affordance — top-right of meta column */}
        <div style={{
          position: "absolute", top: 20, right: 20,
          width: 36, height: 36, borderRadius: 18,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: hover ? "var(--signal)" : "var(--surface-2)",
          color: hover ? "var(--fg-on-accent)" : "var(--fg-muted)",
          border: `1px solid ${hover ? "var(--signal)" : "var(--border-strong)"}`,
          transition: "background .14s, color .14s, border-color .14s",
        }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M5 3l5 5-5 5" stroke="currentColor" strokeWidth="1.75"
                  strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ paddingRight: 52 }}>
          <VI_TypeChip type={venue.type} />
          <div style={{
            marginTop: 10,
            fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 34,
            letterSpacing: "-0.03em", color: "var(--fg)", lineHeight: 1.05,
          }}>{venue.name}</div>
          <div style={{
            marginTop: 8,
            display: "flex", alignItems: "center", gap: 10,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12, color: "var(--fg-muted)", letterSpacing: "0.04em",
          }}>
            <span>{venue.neighborhood} · {venue.city}</span>
            <span style={{ color: "var(--fg-subtle)" }}>·</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--signal)" }}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M2 6h7M6 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Directions
            </span>
          </div>
        </div>
        <div style={{
          marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--border)",
          display: "flex", gap: 40, alignItems: "flex-end",
        }}>
          <VI_Stat label="Capacity" value={fmtNum(venue.capacity)} align="left" />
          <VI_Stat label="Upcoming" value={venue.upcoming} signal align="left" />
          <VI_Stat label="Distance" value={fmtDistance(venue.distance)} align="left" />
        </div>
      </div>
    </div>
    </button>
  );
}

// ── Enriched list row ──────────────────────────────────────────
function VI_VenueRow({ venue, last = false }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        all: "unset", cursor: "pointer", display: "block", width: "100%",
        boxSizing: "border-box",
      }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "88px 1fr 120px 120px 24px",
        gap: 20, alignItems: "center",
        padding: "16px 8px",
        borderBottom: last ? "none" : "1px solid var(--border)",
        background: hover ? "var(--overlay-hover)" : "transparent",
        transition: "background .12s",
      }}>
        {/* Tile */}
        <VI_IdentityTile name={venue.name} size={72} />

        {/* Name + meta */}
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 22,
            letterSpacing: "-0.02em", color: "var(--fg)",
            lineHeight: 1.15,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{venue.name}</div>
          <div style={{
            marginTop: 8,
            display: "flex", alignItems: "center", gap: 10,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, color: "var(--fg-muted)", letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              color: "var(--fg)", fontWeight: 600,
            }}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M6 1.5c2 0 3.5 1.5 3.5 3.5 0 2.6-3.5 6-3.5 6S2.5 7.6 2.5 5c0-2 1.5-3.5 3.5-3.5z"
                      stroke="currentColor" strokeWidth="1.2" fill="none"/>
                <circle cx="6" cy="5" r="1.2" fill="currentColor"/>
              </svg>
              {fmtDistance(venue.distance)}
            </span>
            <span style={{ color: "var(--fg-subtle)" }}>·</span>
            <span>{venue.neighborhood}, {venue.city}</span>
          </div>
        </div>

        {/* Capacity */}
        <VI_Stat label="Capacity" value={fmtNum(venue.capacity)} />

        {/* Upcoming */}
        <VI_Stat label="Upcoming" value={venue.upcoming} signal />

        {/* Chevron */}
        <div style={{ display: "flex", justifyContent: "flex-end",
                      color: hover ? "var(--fg)" : "var(--fg-subtle)",
                      transition: "color .12s, transform .12s",
                      transform: hover ? "translateX(2px)" : "translateX(0)" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M5 3l5 5-5 5" stroke="currentColor" strokeWidth="1.75"
                  strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </button>
  );
}

// ── Page ───────────────────────────────────────────────────────
function VenuesIndexPage() {
  const [filterState, setFilterState] = React.useState({
    sort: "upcoming", capacity: null, distance: null,
  });

  const filtered = vi_applyFilters(VI_VENUES, filterState);

  // Only show the flagship card when no filters are active — when the user
  // is narrowing the list (e.g. "Walking distance"), they want the full list
  // visible, not a hero stealing 240px of vertical space.
  const filtersActive = !!filterState.capacity || !!filterState.distance;
  const featured = filtersActive ? null : filtered.find(v => v.featured);
  const visible = featured ? filtered.filter(v => v !== featured) : filtered;

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)",
      color: "var(--fg)",
      fontFamily: "Inter, system-ui",
    }}>
      <VI_TopNav active="venues" />

      <main style={{
        maxWidth: 1120, margin: "0 auto", padding: "48px 32px 96px",
      }}>
        {/* Section header */}
        <div style={{
          display: "flex", alignItems: "baseline", justifyContent: "space-between",
          marginBottom: 18, gap: 24, flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <h1 style={{
              margin: 0,
              fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 40,
              letterSpacing: "-0.035em", color: "var(--fg)",
            }}>Venues</h1>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12, color: "var(--fg-muted)", letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}>{filtered.length} in Denver</span>
          </div>
        </div>

        {/* Filter pills — same shape as the Browse FilterBar */}
        <div style={{ marginBottom: 28 }}>
          <VI_FilterPills state={filterState} setState={setFilterState} />
        </div>

        {/* Featured card */}
        {featured && (
          <div style={{ marginBottom: 32 }}>
            <VI_FeatureCard venue={featured} />
          </div>
        )}

        {/* Column headers (mono eyebrow) */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "88px 1fr 120px 120px 24px",
          gap: 20, padding: "20px 8px 10px",
          borderBottom: "1px solid var(--border)",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, fontWeight: 500, letterSpacing: "0.12em",
          textTransform: "uppercase", color: "var(--fg-subtle)",
        }}>
          <div></div>
          <div>Venue</div>
          <div style={{ textAlign: "right" }}>Capacity</div>
          <div style={{ textAlign: "right" }}>Upcoming</div>
          <div></div>
        </div>

        {/* Rows */}
        <div>
          {visible.map((v, i) => (
            <VI_VenueRow key={v.name} venue={v} last={i === visible.length - 1} />
          ))}
        </div>

        {/* Empty state — when filters knock everything out */}
        {visible.length === 0 && !featured && (
          <div style={{
            padding: "80px 0", textAlign: "center",
          }}>
            <div style={{
              fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 18,
              color: "var(--fg)", letterSpacing: "-0.01em",
            }}>No venues match.</div>
            <div style={{
              marginTop: 6,
              fontFamily: "Inter, system-ui", fontSize: 14,
              color: "var(--fg-muted)",
            }}>Loosen a filter or two and they'll come back.</div>
            <button
              onClick={() => setFilterState(s => ({ ...s, capacity: null, distance: null }))}
              style={{
                all: "unset", cursor: "pointer", marginTop: 16,
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 999,
                border: "1px solid var(--border-strong)",
                fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12.5,
                color: "var(--fg-muted)",
              }}
            >× Clear filters</button>
          </div>
        )}
      </main>
    </div>
  );
}

window.VenuesIndexPage = VenuesIndexPage;

// Shared globals for the mobile file (venues-index-mobile.jsx).
Object.assign(window, {
  VI_VENUES, VI_FILTER_DEFS, VI_FILTER_KEYS,
  vi_applyFilters, vi_chipLabel,
  fmtNum, fmtDistance,
});

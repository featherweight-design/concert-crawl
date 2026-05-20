// Browse Home — hi-fi mobile mock (375pt iPhone in IOSDevice frame)
// Electric theme, fully tokenized. Lightly interactive: filter chips toggle, list/cal toggle.

// ── Token application ──────────────────────────────────────────
// We apply tokens as inline CSS vars on a wrapper div, same pattern as theming-workshop.
const ELECTRIC = {
  "bg":            "#070A1A",
  "bg-elevated":   "#0E1226",
  "surface-1":     "#11162E",
  "surface-2":     "#171D3A",
  "surface-3":     "#1F2748",
  "fg":            "#E8F3FF",
  "fg-muted":      "#9AA8C7",
  "fg-subtle":     "#5A6788",
  "fg-on-accent":  "#070A1A",
  "border":        "#1F2748",
  "border-strong": "#2C3661",
  "border-focus":  "#7AE6FF",
  "signal":        "#7AE6FF",
  "signal-muted":  "#3FA3C2",
  "accent":        "#FF7BD4",
  "accent-muted":  "#B8559A",
  "success":       "#7BFFB0",
  "warning":       "#FFD27A",
  "danger":        "#FF7A8A",
  "focus":         "#7AE6FF",
  "overlay-hover": "rgba(122,230,255,0.08)",
  "overlay-press": "rgba(122,230,255,0.16)",
  "scrim":         "rgba(7,10,26,0.72)",
  "image-tint":    "rgba(7,10,26,0.20)",
};

function tokenVars(tokens) {
  const v = {};
  for (const [k, val] of Object.entries(tokens)) v[`--${k}`] = val;
  return v;
}

// ── Sample data ────────────────────────────────────────────────
const EVENTS = [
  { artist: "Lewis Capaldi", title: "Lewis Capaldi", venue: "Red Rocks Amphitheatre", date: "2026-04-28", time: "7:30 PM", price: "$55–$95", genre: [], hero: true },
  { artist: "Amyl and The Sniffers", title: "Amyl and The Sniffers", venue: "Gothic Theatre", date: "2026-04-28", time: "9:00 PM", price: "$28", genre: ["punk","garage rock"] },
  { artist: "Electric Callboy", title: "Tanzneid World Tour", venue: "Red Rocks Amphitheatre", date: "2026-04-30", time: "7:00 PM", price: null, genre: ["metalcore"] },
  { artist: "Two Friends", title: "Two Friends", venue: "Red Rocks Amphitheatre", date: "2026-05-01", time: "7:00 PM", price: "$45–$85", genre: ["electronic"] },
  { artist: "Jason Isbell and the 400 Unit", title: "Jason Isbell and the 400 Unit", venue: "Red Rocks Amphitheatre", date: "2026-05-02", time: "7:00 PM", price: "$55–$95", genre: ["americana"] },
  { artist: "Puscifer", title: "Puscifer", venue: "Red Rocks Amphitheatre", date: "2026-05-03", time: "7:30 PM", price: null, genre: [] },
  { artist: "Wisp", title: "Wisp live", venue: "Gothic Theatre", date: "2026-05-03", time: "8:00 PM", price: "$22", genre: ["hyperpop"] },
  { artist: "David Guetta", title: "David Guetta", venue: "Red Rocks Amphitheatre", date: "2026-05-05", time: "8:00 PM", price: "$65–$120", genre: ["electronic","house"] },
  { artist: "Bright Eyes", title: "21 Years of Wide Awake & Digital Ash", venue: "Red Rocks Amphitheatre", date: "2026-05-06", time: "7:00 PM", price: "$40–$75", genre: ["indie rock"] },
  { artist: "Alejandro Fernández", title: "de Rey a Rey", venue: "Red Rocks Amphitheatre", date: "2026-05-07", time: "8:00 PM", price: null, genre: ["regional mexican"] },
  { artist: "Mannequin Pussy", title: "Mannequin Pussy", venue: "Bluebird Theater", date: "2026-05-07", time: "8:30 PM", price: "$28", genre: ["punk"] },
  { artist: "Cloonee", title: "Cloonee", venue: "Red Rocks Amphitheatre", date: "2026-05-09", time: "6:30 PM", price: "$50–$80", genre: ["house"] },
  { artist: "Geese", title: "Geese", venue: "Ogden Theatre", date: "2026-05-09", time: "9:00 PM", price: "$25", genre: [] },
  { artist: "Hippie Sabotage", title: "Hippie Sabotage", venue: "Red Rocks Amphitheatre", date: "2026-05-10", time: "7:00 PM", price: "$35–$60", genre: ["electronic"] },
  { artist: "YUNGBLUD", title: "IDOLS – THE WORLD TOUR", venue: "Red Rocks Amphitheatre", date: "2026-05-11", time: "8:00 PM", price: null, genre: ["alt rock"] },
  { artist: "Wednesday", title: "Wednesday", venue: "Mission Ballroom", date: "2026-05-12", time: "8:00 PM", price: "$30", genre: ["noise rock","shoegaze"] },
];

// ── Helpers ─────────────────────────────────────────────────────
function formatDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}

function groupByDate(events) {
  const groups = {};
  for (const e of events) {
    if (!groups[e.date]) groups[e.date] = [];
    groups[e.date].push(e);
  }
  return Object.entries(groups).sort(([a],[b]) => a.localeCompare(b));
}

function dayLabel(dateStr) {
  const today = "2026-04-28";
  const tomorrow = "2026-04-29";
  if (dateStr === today) return "Tonight";
  if (dateStr === tomorrow) return "Tomorrow";
  return formatDate(dateStr);
}

function venueShort(v) {
  const map = {
    "Red Rocks Amphitheatre": "Red Rocks",
    "Mission Ballroom": "Mission",
    "Fillmore Auditorium": "Fillmore",
    "Ogden Theatre": "Ogden",
    "Gothic Theatre": "Gothic",
    "Bluebird Theater": "Bluebird",
  };
  return map[v] || v;
}

// ── Cluster Path mark (tokenized) ──────────────────────────────
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

// ── Image placeholder ──────────────────────────────────────────
function ArtistImage({ artist, size = 48, rounded = false, large = false, fullBleed = false }) {
  // Deterministic color from artist name
  const hash = artist.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const hues = [280, 200, 340, 160, 30, 220, 310, 180, 50, 260];
  const hue = hues[hash % hues.length];
  const initial = artist.charAt(0).toUpperCase();

  return (
    <div style={{
      width: fullBleed ? "100%" : size, height: fullBleed ? 180 : size, flexShrink: 0,
      borderRadius: rounded ? size : fullBleed ? 0 : large ? 8 : 6,
      background: `linear-gradient(135deg, oklch(0.35 0.08 ${hue}), oklch(0.22 0.06 ${hue + 40}))`,
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
    }}>
      <span style={{
        fontFamily: "Inter, system-ui", fontWeight: 800,
        fontSize: fullBleed ? 64 : large ? size * 0.35 : size * 0.4,
        color: `oklch(0.75 0.12 ${hue})`, opacity: 0.7,
        letterSpacing: "-0.02em",
      }}>{initial}</span>
      {/* image-tint overlay */}
      <div style={{ position: "absolute", inset: 0, background: "var(--image-tint)" }} />
    </div>
  );
}

// ── Components ─────────────────────────────────────────────────

function AppBar() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "62px 16px 10px",
      background: "var(--bg)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <CCMark size={28} />
        <span style={{
          fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 17,
          color: "var(--fg)", letterSpacing: "-0.02em",
        }}>
          concert<span style={{ color: "var(--accent)" }}>crawl.</span>
        </span>
      </div>
      <div style={{
        width: 36, height: 36, borderRadius: 18,
        border: "1.5px solid var(--border-strong)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5.5" stroke="var(--fg-muted)" strokeWidth="1.5" />
          <path d="M11 11L14.5 14.5" stroke="var(--fg-muted)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

function FilterBar({ filters, setFilters, view, setView, onChipClick }) {
  // Functional chip configuration — labels reflect active filter state.
  const chips = ["date", "venue", "price", "genre"].map(key => {
    const def = window.FILTER_DEFS[key];
    const value = filters[key];
    const active = !!value;
    const label = active
      ? window.filterActiveLabel(key, value)
      : def.placeholder;
    return { key, label, active };
  });
  return (
    <div style={{ padding: "0 16px 12px", position: "relative" }}>
      {/* View toggle + location */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <span style={{
            fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 24,
            color: "var(--fg)", letterSpacing: "-0.03em",
          }}>What's on?</span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: "var(--fg-muted)", letterSpacing: "0.06em", textTransform: "uppercase",
          }}>Denver, CO</span>
        </div>
        {/* List / Calendar toggle */}
        <div style={{
          display: "flex", height: 32, borderRadius: 8, overflow: "hidden",
          border: "1px solid var(--border-strong)",
        }}>
          {["list", "cal"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              all: "unset", cursor: "pointer",
              padding: "0 12px", fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, fontWeight: 600, letterSpacing: "0.04em",
              textTransform: "uppercase",
              background: view === v ? "var(--signal)" : "transparent",
              color: view === v ? "var(--fg-on-accent)" : "var(--fg-muted)",
              transition: "background 0.15s, color 0.15s",
            }}>{v}</button>
          ))}
        </div>
      </div>
      {/* Filter chips — tap to open sheet for that dimension */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {chips.map(c => (
          <button
            key={c.key}
            onClick={() => onChipClick(c.key)}
            style={{
              all: "unset", cursor: "pointer",
              padding: "5px 10px 5px 10px", borderRadius: 999,
              fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 11,
              background: c.active ? "var(--signal)" : "transparent",
              color: c.active ? "var(--fg-on-accent)" : "var(--fg-muted)",
              border: `1px solid ${c.active ? "var(--signal)" : "var(--border-strong)"}`,
              letterSpacing: "-0.005em",
              display: "inline-flex", alignItems: "center", gap: 4,
              boxSizing: "border-box",
            }}
          >
            <span>{c.label}</span>
            <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M2 4l3 3 3-3" stroke="currentColor"
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </button>
        ))}
        {window.filterCountActive(filters) > 0 && (
          <button
            onClick={() => setFilters({})}
            style={{
              all: "unset", cursor: "pointer",
              padding: "5px 10px", borderRadius: 999,
              fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 11,
              color: "var(--fg-subtle)",
              border: "1px dashed var(--border-strong)",
              letterSpacing: "-0.005em",
            }}
          >× Clear</button>
        )}
      </div>
    </div>
  );
}

function HeroCard({ event }) {
  return (
    <div style={{
      margin: "0 16px 14px", borderRadius: 12, overflow: "hidden",
      background: "var(--surface-1)", border: "1px solid var(--border-strong)",
      position: "relative",
    }}>
      {/* Hero image area */}
      <div style={{ position: "relative" }}>
        <ArtistImage artist={event.artist} size="100%" large fullBleed />
        <div style={{
          position: "absolute", inset: 0, borderRadius: 0,
          background: "linear-gradient(180deg, transparent 30%, var(--bg) 100%)",
        }} />
        {/* Badge */}
        <div style={{
          position: "absolute", top: 10, left: 10,
          padding: "3px 8px", borderRadius: 4,
          background: "var(--accent)", color: "var(--fg-on-accent)",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
        }}>★ tonight's pick</div>
      </div>
      {/* Info */}
      <div style={{ padding: "12px 14px 14px", marginTop: -40, position: "relative" }}>
        <div style={{
          fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 20,
          color: "var(--fg)", letterSpacing: "-0.02em", lineHeight: 1.15,
        }}>{event.artist}</div>
        {event.title !== event.artist && (
          <div style={{
            fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 12,
            color: "var(--fg-muted)", marginTop: 2, lineHeight: 1.3,
          }}>{event.title}</div>
        )}
        <div style={{
          display: "flex", alignItems: "center", gap: 6, marginTop: 8,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: "var(--fg-muted)", letterSpacing: "0.02em",
        }}>
          <span style={{ color: "var(--signal)" }}>{venueShort(event.venue)}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{event.time}</span>
          {event.price && <>
            <span style={{ opacity: 0.4 }}>·</span>
            <span style={{ color: "var(--signal)" }}>{event.price}</span>
          </>}
        </div>
        {event.genre.length > 0 && (
          <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
            {event.genre.map(g => (
              <span key={g} style={{
                padding: "2px 7px", borderRadius: 4,
                background: "var(--surface-3)", color: "var(--fg-muted)",
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                letterSpacing: "0.03em",
              }}>{g}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EventRow({ event }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
    }}>
      <ArtistImage artist={event.artist} size={48} rounded={false} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 14,
          color: "var(--fg)", letterSpacing: "-0.01em",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{event.artist}</div>
        <div style={{
          display: "flex", gap: 5, marginTop: 2, alignItems: "center",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
          color: "var(--fg-muted)", letterSpacing: "0.02em",
        }}>
          <span>{venueShort(event.venue)}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{event.time}</span>
        </div>
      </div>
      {event.price ? (
        <span style={{
          fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 13,
          color: "var(--signal)", letterSpacing: "-0.01em", flexShrink: 0,
        }}>{event.price.split("–")[0]}</span>
      ) : (
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: "var(--fg-subtle)", letterSpacing: "0.03em", flexShrink: 0,
        }}>tba</span>
      )}
    </div>
  );
}

function DayGroup({ date, events, isFirst }) {
  const label = dayLabel(date);
  const isTonight = label === "Tonight";
  return (
    <div style={{ padding: "0 16px", marginTop: isFirst ? 0 : 6 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "10px 0 4px",
      }}>
        <span style={{
          fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 12,
          color: isTonight ? "var(--accent)" : "var(--fg)",
          letterSpacing: "0.05em", textTransform: "uppercase",
        }}>{label}</span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: "var(--fg-subtle)",
        }}>{events.length} show{events.length !== 1 ? "s" : ""}</span>
      </div>
      {isTonight && events[0] && <HeroCard event={events[0]} />}
      {(isTonight ? events.slice(1) : events).map((e, i) => (
        <React.Fragment key={i}>
          {i > 0 && <div style={{ height: 1, background: "var(--border)", marginLeft: 58 }} />}
          <EventRow event={e} />
        </React.Fragment>
      ))}
    </div>
  );
}

function TabBarCC({ active = 0 }) {
  const tabs = [
    { label: "browse", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="1" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="10" y="1" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="1" y="10" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="10" y="10" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/></svg> },
    { label: "search", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5"/><path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
    { label: "saved", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 15l-6.5-6A3.5 3.5 0 019 4.5 3.5 3.5 0 0115.5 9L9 15z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg> },
    { label: "me", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5"/><path d="M2.5 16.5c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  ];
  return (
    <div style={{
      height: 52, borderTop: "1px solid var(--border)",
      display: "flex", alignItems: "center", justifyContent: "space-around",
      background: "var(--bg-elevated)", flexShrink: 0,
      paddingBottom: 2,
    }}>
      {tabs.map((t, i) => (
        <div key={i} style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          color: i === active ? "var(--signal)" : "var(--fg-subtle)",
          cursor: "pointer",
        }}>
          {t.icon}
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            fontWeight: i === active ? 700 : 500, letterSpacing: "0.04em",
          }}>{t.label}</span>
        </div>
      ))}
    </div>
  );
}

function LoadMoreButton() {
  return (
    <div style={{ padding: "16px 16px 20px", display: "flex", justifyContent: "center" }}>
      <button style={{
        all: "unset", cursor: "pointer",
        padding: "10px 24px", borderRadius: 8,
        background: "var(--surface-2)", border: "1px solid var(--border-strong)",
        fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13,
        color: "var(--signal)", letterSpacing: "-0.01em",
        textAlign: "center", width: "100%",
      }}>Load more shows</button>
    </div>
  );
}

// ── Calendar View ──────────────────────────────────────────────
function CalendarView({ events, onClearFilters }) {
  const [selectedDate, setSelectedDate] = React.useState("2026-04-30");
  // Default to the master list if not passed (back-compat).
  const sourceEvents = events || EVENTS;

  // Week of Apr 27 – May 3
  const weekDays = [
    { d: "2026-04-27", label: "Sun", num: "27" },
    { d: "2026-04-28", label: "Mon", num: "28" },
    { d: "2026-04-29", label: "Tue", num: "29" },
    { d: "2026-04-30", label: "Wed", num: "30" },
    { d: "2026-05-01", label: "Thu", num: "1" },
    { d: "2026-05-02", label: "Fri", num: "2" },
    { d: "2026-05-03", label: "Sat", num: "3" },
  ];

  const eventsForDate = sourceEvents.filter(e => e.date === selectedDate);
  const today = "2026-04-28";

  return (
    <div>
      {/* Week strip */}
      <div style={{
        display: "flex", padding: "4px 12px 12px", gap: 2,
      }}>
        {weekDays.map(wd => {
          const isSelected = wd.d === selectedDate;
          const isToday = wd.d === today;
          const hasEvents = sourceEvents.some(e => e.date === wd.d);
          return (
            <div key={wd.d} onClick={() => setSelectedDate(wd.d)} style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", gap: 3, padding: "8px 0 6px",
              borderRadius: 10, cursor: "pointer",
              background: isSelected ? "var(--signal)" : "transparent",
              transition: "background 0.15s",
            }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                color: isSelected ? "var(--fg-on-accent)" : "var(--fg-subtle)",
                fontWeight: 500, letterSpacing: "0.04em",
              }}>{wd.label}</span>
              <span style={{
                fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 16,
                color: isSelected ? "var(--fg-on-accent)" : isToday ? "var(--accent)" : "var(--fg)",
              }}>{wd.num}</span>
              <div style={{
                width: 4, height: 4, borderRadius: 4,
                background: hasEvents
                  ? (isSelected ? "var(--fg-on-accent)" : "var(--accent)")
                  : "transparent",
              }} />
            </div>
          );
        })}
      </div>

      {/* Events for selected day */}
      {eventsForDate.length > 0 ? (
        <div style={{ padding: "0 16px" }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: "var(--fg-muted)", letterSpacing: "0.06em", textTransform: "uppercase",
            padding: "4px 0 8px",
          }}>{formatDate(selectedDate)} · {eventsForDate.length} show{eventsForDate.length !== 1 ? "s" : ""}</div>
          {eventsForDate.map((e, i) => (
            <React.Fragment key={i}>
              {i > 0 && <div style={{ height: 1, background: "var(--border)", marginLeft: 58 }} />}
              <EventRow event={e} />
            </React.Fragment>
          ))}
        </div>
      ) : (
        onClearFilters ? (
          // Filters are active — friendly empty state with reset CTA.
          window.NoResultsState
            ? <window.NoResultsState dense onClearFilters={onClearFilters} />
            : null
        ) : (
          // No filters — playful "grandpa" copy ("no shows tonight, grandpa.")
          <div style={{
            padding: "40px 24px", textAlign: "center",
          }}>
            <div style={{
              fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 16,
              color: "var(--fg)", letterSpacing: "-0.02em",
            }}>No shows {selectedDate === today ? "tonight" : "this " + formatDate(selectedDate).split(",")[0]}, grandpa.</div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              color: "var(--fg-subtle)", marginTop: 6,
            }}>try another day ↑</div>
          </div>
        )
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────
function BrowseHome({ theme = "electric" }) {
  const [view, setView] = React.useState("list");
  const [filters, setFilters] = React.useState({});
  const [showAll, setShowAll] = React.useState(false);
  const [sheetKey, setSheetKey] = React.useState(null);   // which filter dim is open
  const themeTokens = (window.CC_THEMES && window.CC_THEMES[theme]) ? window.CC_THEMES[theme].tokens : ELECTRIC;
  const isDarkFrame = (window.CC_THEMES && window.CC_THEMES[theme]) ? window.CC_THEMES[theme].mode === "dark" : true;

  // Apply filters to the master event list.
  const filteredEvents = window.applyFilters
    ? window.applyFilters(EVENTS, filters)
    : EVENTS;
  const dateGroups = groupByDate(filteredEvents);
  const visibleGroups = showAll ? dateGroups : dateGroups.slice(0, 5);
  const hasResults = filteredEvents.length > 0;
  const anyFiltersActive = window.filterCountActive
    ? window.filterCountActive(filters) > 0
    : false;

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "100vh", background: "#111", padding: "24px 0",
    }}>
      <IOSDevice dark={isDarkFrame} width={393} height={852}>
        <div style={{
          ...tokenVars(themeTokens),
          height: "100%", display: "flex", flexDirection: "column",
          background: "var(--bg)", color: "var(--fg)",
          fontFamily: "Inter, system-ui",
          position: "relative",     // anchor for absolute filter sheet
          overflow: "hidden",
        }}>
          <AppBar />
          <FilterBar
            filters={filters} setFilters={setFilters}
            view={view} setView={setView}
            onChipClick={(k) => setSheetKey(k)}
          />
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
            {view === "list" ? (
              hasResults ? (
                <>
                  {visibleGroups.map(([date, events], i) => (
                    <DayGroup key={date} date={date} events={events} isFirst={i === 0} />
                  ))}
                  {!showAll && dateGroups.length > 5 && (
                    <div style={{ padding: "16px 16px 20px", display: "flex", justifyContent: "center" }}>
                      <button onClick={() => setShowAll(true)} style={{
                        all: "unset", cursor: "pointer",
                        padding: "10px 24px", borderRadius: 8,
                        background: "var(--surface-2)", border: "1px solid var(--border-strong)",
                        fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13,
                        color: "var(--signal)", letterSpacing: "-0.01em",
                        textAlign: "center", width: "100%",
                      }}>Load more shows</button>
                    </div>
                  )}
                  <div style={{ height: 16 }} />
                </>
              ) : (
                window.NoResultsState
                  ? <window.NoResultsState
                      dense
                      onClearFilters={anyFiltersActive ? () => setFilters({}) : null}
                    />
                  : null
              )
            ) : (
              <CalendarView events={filteredEvents}
                onClearFilters={anyFiltersActive ? () => setFilters({}) : null} />
            )}
          </div>
          <TabBarCC active={0} />

          {/* Filter bottom sheet */}
          {window.FilterSheet && (
            <window.FilterSheet
              open={!!sheetKey}
              filterKey={sheetKey}
              currentValue={sheetKey ? filters[sheetKey] : null}
              onApply={(v) => setFilters(prev => {
                const next = { ...prev };
                if (v) next[sheetKey] = v;
                else delete next[sheetKey];
                return next;
              })}
              onClose={() => setSheetKey(null)}
            />
          )}
        </div>
      </IOSDevice>
    </div>
  );
}

function BrowseHomeApp() {
  const [theme, setTheme] = (window.useThemeState ? window.useThemeState("electric") : React.useState("electric"));
  return (
    <>
      <BrowseHome theme={theme} />
      {window.ThemeSwitcher && <window.ThemeSwitcher value={theme} onChange={setTheme} />}
    </>
  );
}

window.BrowseHome = BrowseHome;
window.BrowseHomeApp = BrowseHomeApp;
window.CC_EVENTS = EVENTS;
window.ccFormatDate = formatDate;
window.ccGroupByDate = groupByDate;
window.ccDayLabel = dayLabel;
window.ccVenueShort = venueShort;
window.CCArtistImage = ArtistImage;
window.CCMark = CCMark;

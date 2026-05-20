// search-desktop.jsx — Concert Crawl Search (desktop)
// Command palette overlay, single column. Tap-to-navigate (no preview pane).

const EVENTS_SD = window.CC_EVENTS;
const ArtistImageSD = window.CCArtistImage;
const ccTokenVarsSD = window.ccTokenVars;
const dayLabelSD = window.ccDayLabel;
const venueShortSD = window.ccVenueShort;

// ── Data ─────────────────────────────────────────────────────────
function buildVenueIndexSD() {
  const counts = {};
  for (const e of EVENTS_SD) counts[e.venue] = (counts[e.venue] || 0) + 1;
  return Object.entries(counts).map(([name, count]) => ({ name, count }));
}
function buildArtistIndexSD() {
  const map = {};
  for (const e of EVENTS_SD) {
    if (!map[e.artist]) map[e.artist] = { name: e.artist, next: e, all: [e] };
    else {
      map[e.artist].all.push(e);
      if (e.date < map[e.artist].next.date) map[e.artist].next = e;
    }
  }
  return Object.values(map);
}

const RECENT_SD = ["Bowery Ballroom", "godspeed you", "ambient"];

function popularThisWeekSD() {
  return EVENTS_SD.slice(0, 5);
}

// ── Icons ────────────────────────────────────────────────────────
function IconSD({ name, size = 16 }) {
  const inner = {
    search: <><circle cx="6.75" cy="6.75" r="4.75" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M10.25 10.25L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
    close: <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>,
    pin: <><path d="M8 2C5.79 2 4 3.79 4 6C4 9 8 13.5 8 13.5S12 9 12 6C12 3.79 10.21 2 8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/><circle cx="8" cy="6" r="1.3" fill="currentColor"/></>,
    history: <><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M8 4.5V8L10 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
    fire: <path d="M8 1.5C8 4 5 4.5 5 7.5C5 9 6 10 7 10.5C7 9 7.5 8 8.5 7.5C8.5 9 9.5 10 10.5 10.5C11.5 11 12 12 12 13C12 14.5 10 16 7.5 16C4.5 16 2.5 13.5 2.5 11C2.5 9 3.5 7.5 4.5 6.5C5.5 5.5 6 4 6 3C7 3.5 8 2.5 8 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">{inner[name]}</svg>;
}

// ── Section header ───────────────────────────────────────────────
function SectionHeaderSD({ icon, label, accent }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "14px 18px 6px",
    }}>
      {icon && (
        <span style={{ color: accent ? "var(--accent)" : "var(--fg-muted)", display: "inline-flex" }}>
          <IconSD name={icon} size={12} />
        </span>
      )}
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
        color: "var(--fg-muted)", letterSpacing: "0.08em", textTransform: "uppercase",
        fontWeight: 600,
      }}>{label}</span>
    </div>
  );
}

// ── Result row (used for everything: recent, popular, results) ──
function RowSD({ kind, name, subtitle, right, active, onMouseEnter, onClick }) {
  return (
    <button
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      style={{
        all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
        padding: "10px 18px",
        background: active ? "var(--surface-2)" : "transparent",
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: kind === "artist" ? 18 : 6,
        background: "var(--surface-2)", border: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--fg-muted)", flexShrink: 0,
        overflow: "hidden",
      }}>
        {kind === "artist" || kind === "event"
          ? <ArtistImageSD artist={name} size={36} rounded />
          : kind === "venue"
            ? <IconSD name="pin" size={16} />
            : <IconSD name="history" size={14} />}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{
          fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 14,
          color: "var(--fg)", letterSpacing: "-0.01em",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{name}</span>
        {subtitle && (
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: "var(--fg-muted)", letterSpacing: "0.02em",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{subtitle}</span>
        )}
      </div>
      {right && <span style={{ flexShrink: 0 }}>{right}</span>}
    </button>
  );
}

// ── Default state ───────────────────────────────────────────────
function DefaultStackSD({ onPickQuery }) {
  const popular = popularThisWeekSD();
  return (
    <div style={{ display: "flex", flexDirection: "column", paddingBottom: 8 }}>
      <SectionHeaderSD icon="history" label="Recent" />
      {RECENT_SD.map((r, i) => (
        <RowSD
          key={i}
          kind="recent"
          name={r}
          onClick={() => onPickQuery(r)}
        />
      ))}
      <SectionHeaderSD icon="fire" label="Popular this week" accent />
      {popular.map((e, i) => (
        <RowSD
          key={i}
          kind="event"
          name={e.artist}
          subtitle={`${venueShortSD(e.venue)} · ${dayLabelSD(e.date)}`}
          right={
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600,
              color: e.price ? "var(--signal)" : "var(--fg-subtle)",
            }}>{e.price || "TBA"}</span>
          }
        />
      ))}
    </div>
  );
}

// ── Results ──────────────────────────────────────────────────────
function ResultsListSD({ query, selectedIdx, setSelectedIdx }) {
  const q = query.toLowerCase().trim();
  const artistIndex = React.useMemo(buildArtistIndexSD, []);
  const venueIndex = React.useMemo(buildVenueIndexSD, []);
  const matchedArtists = artistIndex.filter(a => a.name.toLowerCase().includes(q));
  const matchedVenues = venueIndex.filter(v => v.name.toLowerCase().includes(q));

  if (matchedArtists.length === 0 && matchedVenues.length === 0) {
    return <NoResultsSD query={query} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", paddingBottom: 8 }}>
      {matchedArtists.length > 0 && (
        <>
          <SectionHeaderSD label={`Artists · ${matchedArtists.length}`} />
          {matchedArtists.map((a, i) => {
            const idx = i;
            return (
              <RowSD
                key={a.name}
                kind="artist"
                name={a.name}
                subtitle={`${dayLabelSD(a.next.date)} · ${venueShortSD(a.next.venue)}`}
                active={selectedIdx === idx}
                onMouseEnter={() => setSelectedIdx(idx)}
                onClick={() => setSelectedIdx(idx)}
              />
            );
          })}
        </>
      )}
      {matchedVenues.length > 0 && (
        <>
          <SectionHeaderSD label={`Venues · ${matchedVenues.length}`} />
          {matchedVenues.map((v, i) => {
            const idx = matchedArtists.length + i;
            return (
              <RowSD
                key={v.name}
                kind="venue"
                name={v.name}
                subtitle={`${v.count} upcoming show${v.count !== 1 ? "s" : ""}`}
                active={selectedIdx === idx}
                onMouseEnter={() => setSelectedIdx(idx)}
                onClick={() => setSelectedIdx(idx)}
              />
            );
          })}
        </>
      )}
    </div>
  );
}

// ── No results ───────────────────────────────────────────────────
function NoResultsSD({ query }) {
  return (
    <div style={{
      padding: "60px 32px 40px", textAlign: "center",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 28,
        background: "var(--surface-2)", border: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--fg-muted)", marginBottom: 4,
      }}>
        <IconSD name="search" size={22} />
      </div>
      <div style={{
        fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 17,
        color: "var(--fg)", letterSpacing: "-0.02em",
      }}>Nothing for "{query}".</div>
      <div style={{
        fontFamily: "Inter, system-ui", fontSize: 13, fontWeight: 500,
        color: "var(--fg-muted)", lineHeight: 1.45, maxWidth: 300,
      }}>Try another spelling, or browse what's on tonight.</div>
      <button style={{
        all: "unset", cursor: "pointer", marginTop: 12,
        padding: "8px 16px", borderRadius: 999,
        background: "var(--signal)", color: "var(--fg-on-accent)",
        fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 12.5,
        letterSpacing: "-0.005em",
      }}>Browse all shows →</button>
    </div>
  );
}

// ── MAIN palette ─────────────────────────────────────────────────
function SearchPaletteSD({ theme = "electric", initialQuery = "", initialSelectedIndex }) {
  const [query, setQuery] = React.useState(initialQuery);
  const [selectedIdx, setSelectedIdx] = React.useState(initialSelectedIndex ?? -1);
  React.useEffect(() => { setSelectedIdx(initialSelectedIndex ?? -1); }, [query]);

  return (
    <div style={{
      ...ccTokenVarsSD(theme),
      width: 560, height: 540,
      borderRadius: 14, overflow: "hidden",
      background: "var(--bg-elevated)",
      border: "1px solid var(--border)",
      boxShadow: "0 24px 80px rgba(0,0,0,0.45), 0 8px 24px rgba(0,0,0,0.25)",
      display: "flex", flexDirection: "column",
      fontFamily: "Inter, system-ui",
      color: "var(--fg)",
    }}>
      {/* Search bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "0 18px",
        height: 56, flexShrink: 0,
        borderBottom: "1px solid var(--border)",
      }}>
        <span style={{ color: "var(--fg-muted)", display: "inline-flex" }}>
          <IconSD name="search" size={18} />
        </span>
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search artists or venues…"
          style={{
            flex: 1, minWidth: 0,
            border: "none", outline: "none", background: "transparent",
            fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 15,
            color: "var(--fg)", letterSpacing: "-0.01em",
          }}
        />
        {query && (
          <button onClick={() => setQuery("")} style={{
            all: "unset", cursor: "pointer",
            width: 22, height: 22, borderRadius: 11,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--surface-2)", color: "var(--fg-muted)",
          }}>
            <IconSD name="close" size={10} />
          </button>
        )}
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: "var(--fg-subtle)",
          padding: "3px 6px", borderRadius: 4,
          border: "1px solid var(--border-strong)",
        }}>esc</span>
      </div>

      {/* Body — single column */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {query.trim() === ""
          ? <DefaultStackSD onPickQuery={setQuery} />
          : <ResultsListSD query={query} selectedIdx={selectedIdx} setSelectedIdx={setSelectedIdx} />}
      </div>

      {/* Footer hints */}
      <div style={{
        flexShrink: 0,
        padding: "0 16px",
        height: 38,
        display: "flex", alignItems: "center", gap: 16,
        borderTop: "1px solid var(--border)",
        background: "var(--bg-elevated)",
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
        color: "var(--fg-subtle)", letterSpacing: "0.04em",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <kbd style={kbdStyleSD}>↑</kbd><kbd style={kbdStyleSD}>↓</kbd> navigate
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <kbd style={kbdStyleSD}>↵</kbd> open
        </span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "var(--accent)" }}>●</span> concert<span style={{ color: "var(--accent)" }}>crawl.</span>
        </span>
      </div>
    </div>
  );
}

const kbdStyleSD = {
  padding: "1px 5px", borderRadius: 3,
  border: "1px solid var(--border-strong)",
  background: "var(--surface-1)",
  color: "var(--fg-muted)",
  fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
};

window.SearchPaletteSD = SearchPaletteSD;

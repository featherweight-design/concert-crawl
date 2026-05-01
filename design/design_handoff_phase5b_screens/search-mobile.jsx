// search-mobile.jsx — Concert Crawl Search screen (mobile)
// Brand voice: sleek + cheeky. Empty states are opportunities.
// Search target: artists + venues. Genres/dates are filters, not search.

const EVENTS_S = window.CC_EVENTS;
const ArtistImageS = window.CCArtistImage;
const ccTokenVarsS = window.ccTokenVars;
const formatDateS = window.ccFormatDate;
const dayLabelS = window.ccDayLabel;
const venueShortS = window.ccVenueShort;

// Build venue index from events (names + show counts)
function buildVenueIndex() {
  const counts = {};
  for (const e of EVENTS_S) {
    counts[e.venue] = (counts[e.venue] || 0) + 1;
  }
  return Object.entries(counts).map(([name, count]) => ({ name, count }));
}

// Build artist index (one entry per artist, with their next show)
function buildArtistIndex() {
  const map = {};
  for (const e of EVENTS_S) {
    if (!map[e.artist]) {
      map[e.artist] = { name: e.artist, next: e };
    } else if (e.date < map[e.artist].next.date) {
      map[e.artist].next = e;
    }
  }
  return Object.values(map);
}

const RECENT_SM = ["Bowery Ballroom", "godspeed you", "ambient"];

function popularThisWeek() {
  return EVENTS_S.slice(0, 5);
}

// ── Icons ────────────────────────────────────────────────────────
function IconSM({ name, size = 18 }) {
  const inner = {
    search: <><circle cx="7.5" cy="7.5" r="5.25" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M11.5 11.5L15.5 15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
    close: <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>,
    arrowLeft: <path d="M11 4L5 9l6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>,
    trending: <path d="M2 12L6 8L9 11L14 6M14 6V9M14 6H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>,
    fire: <><path d="M9 1.5C9 4 6 4.5 6 7.5C6 9 7 10 8 10.5C8 9 8.5 8 9.5 7.5C9.5 9 10.5 10 11.5 10.5C12.5 11 13 12 13 13C13 14.5 11 16 8.5 16C5.5 16 3.5 13.5 3.5 11C3.5 9 4.5 7.5 5.5 6.5C6.5 5.5 7 4 7 3C8 3.5 9 2.5 9 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/></>,
    pin: <><path d="M9 2C6.79 2 5 3.79 5 6C5 9 9 14 9 14S13 9 13 6C13 3.79 11.21 2 9 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/><circle cx="9" cy="6" r="1.5" fill="currentColor"/></>,
    history: <><path d="M9 2C5.13 2 2 5.13 2 9C2 12.87 5.13 16 9 16C12.87 16 16 12.87 16 9C16 5.13 12.87 2 9 2Z" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M9 5V9L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
    artist: <><circle cx="9" cy="6.5" r="2.75" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M3.5 15C3.5 12.5 6 11 9 11C12 11 14.5 12.5 14.5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/></>,
    arrowRight: <path d="M5 9h8M9 5l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      {inner[name]}
    </svg>
  );
}

// ── Status bar (matches mobile screens) ─────────────────────────
function StatusBarSM({ dark = true }) {
  const fg = dark ? "#fff" : "#000";
  return (
    <div style={{
      height: 47, padding: "0 24px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexShrink: 0,
    }}>
      <span style={{
        fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 16,
        color: fg, letterSpacing: "-0.02em",
      }}>9:41</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {/* signal */}
        <svg width="18" height="11" viewBox="0 0 18 11" fill="none">
          {[2,5,8,11].map((h,i) => (
            <rect key={i} x={i*4} y={11-h} width="3" height={h} rx="0.5" fill={fg}/>
          ))}
        </svg>
        {/* battery */}
        <svg width="26" height="12" viewBox="0 0 26 12" fill="none">
          <rect x="0.5" y="0.5" width="22" height="11" rx="2.5" stroke={fg} strokeOpacity="0.4"/>
          <rect x="2" y="2" width="19" height="8" rx="1.5" fill={fg}/>
          <rect x="23" y="4" width="2" height="4" rx="0.5" fill={fg} fillOpacity="0.4"/>
        </svg>
      </div>
    </div>
  );
}

// ── Search bar (entry point) ─────────────────────────────────────
function SearchBarSM({ value, onChange, onClear, autoFocus, onBack }) {
  const inputRef = React.useRef(null);
  React.useEffect(() => {
    if (autoFocus && inputRef.current) inputRef.current.focus();
  }, [autoFocus]);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "0 16px 12px",
    }}>
      {onBack && (
        <button onClick={onBack} style={{
          all: "unset", cursor: "pointer",
          width: 36, height: 36, borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--fg)",
          flexShrink: 0,
        }}>
          <IconSM name="arrowLeft" size={18} />
        </button>
      )}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", gap: 10,
        height: 44, padding: "0 14px",
        borderRadius: 12,
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
      }}>
        <span style={{ color: "var(--fg-muted)", flexShrink: 0, display: "inline-flex" }}>
          <IconSM name="search" size={18} />
        </span>
        <input
          ref={inputRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Search artists, venues…"
          style={{
            flex: 1, minWidth: 0,
            border: "none", outline: "none", background: "transparent",
            fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 15,
            color: "var(--fg)", letterSpacing: "-0.01em",
          }}
        />
        {value && (
          <button onClick={onClear} style={{
            all: "unset", cursor: "pointer",
            width: 24, height: 24, borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--surface-3)", color: "var(--fg-muted)",
            flexShrink: 0,
          }}>
            <IconSM name="close" size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Section header (small caps mono) ────────────────────────────
function SectionHeaderSM({ icon, label, accentIcon }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "0 16px 8px",
    }}>
      {icon && (
        <span style={{ color: accentIcon ? "var(--accent)" : "var(--fg-muted)", display: "inline-flex" }}>
          <IconSM name={icon} size={13} />
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

// ── Recent row ──────────────────────────────────────────────────
function RecentRowSM({ query, onPick }) {
  return (
    <button onClick={() => onPick(query)} style={{
      all: "unset", cursor: "pointer",
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 16px",
      width: "100%", boxSizing: "border-box",
    }}>
      <span style={{ color: "var(--fg-subtle)", display: "inline-flex", flexShrink: 0 }}>
        <IconSM name="history" size={16} />
      </span>
      <span style={{
        flex: 1, minWidth: 0,
        fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 14,
        color: "var(--fg)", letterSpacing: "-0.005em",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>{query}</span>
    </button>
  );
}

// ── Popular event card (small) ──────────────────────────────────
function PopularRow({ event, onPick }) {
  return (
    <button onClick={() => onPick && onPick(event)} style={{
      all: "unset", cursor: "pointer",
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 16px",
      width: "100%", boxSizing: "border-box",
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
        <ArtistImageS artist={event.artist} size={44} rounded />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 14,
          color: "var(--fg)", letterSpacing: "-0.01em",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{event.artist}</span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: "var(--fg-muted)", letterSpacing: "0.02em",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{venueShortS(event.venue)} · {dayLabelS(event.date)}</span>
      </div>
      <span style={{
        flexShrink: 0,
        fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600,
        color: event.price ? "var(--signal)" : "var(--fg-subtle)",
      }}>{event.price || "TBA"}</span>
    </button>
  );
}

// ── Search result row (artist or venue) ─────────────────────────
function ResultRowSM({ kind, name, subtitle, onPick }) {
  return (
    <button onClick={onPick} style={{
      all: "unset", cursor: "pointer",
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 16px",
      width: "100%", boxSizing: "border-box",
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: kind === "artist" ? 20 : 8,
        background: "var(--surface-2)", border: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--fg-muted)", flexShrink: 0,
        overflow: "hidden",
      }}>
        {kind === "artist"
          ? <ArtistImageS artist={name} size={40} rounded />
          : <IconSM name="pin" size={18} />}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 14,
          color: "var(--fg)", letterSpacing: "-0.01em",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{name}</span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: "var(--fg-muted)", letterSpacing: "0.02em",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{subtitle}</span>
      </div>
    </button>
  );
}

function ResultDividerSM() {
  return <div style={{ height: 1, background: "var(--border)", marginLeft: 68 }} />;
}

// ── Empty: typed but no results ─────────────────────────────────
function NoResultsSM({ query }) {
  return (
    <div style={{
      padding: "60px 24px 40px", textAlign: "center",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 28,
        background: "var(--surface-2)", border: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--fg-muted)",
        marginBottom: 6,
      }}>
        <IconSM name="search" size={22} />
      </div>
      <div style={{
        fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 17,
        color: "var(--fg)", letterSpacing: "-0.02em",
      }}>Nothing for "{query}".</div>
      <div style={{
        fontFamily: "Inter, system-ui", fontSize: 13.5, fontWeight: 500,
        color: "var(--fg-muted)", lineHeight: 1.45, maxWidth: 280,
      }}>Try another spelling, or browse what's on tonight.</div>
      <button style={{
        all: "unset", cursor: "pointer", marginTop: 14,
        padding: "10px 18px", borderRadius: 999,
        background: "var(--signal)", color: "var(--fg-on-accent)",
        fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13,
        letterSpacing: "-0.01em",
      }}>Browse all shows →</button>
    </div>
  );
}

// ── Default state (empty input) ─────────────────────────────────
function DefaultStateSM({ onPickQuery, onPickEvent }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", paddingBottom: 40 }}>
      <SectionHeaderSM icon="history" label="Recent" />
      <div style={{ display: "flex", flexDirection: "column" }}>
        {RECENT_SM.map((r, i) => (
          <RecentRowSM key={i} query={r} onPick={onPickQuery} />
        ))}
      </div>

      <div style={{ height: 8 }} />

      <SectionHeaderSM icon="fire" label="Popular this week" accentIcon />
      <div style={{ display: "flex", flexDirection: "column" }}>
        {popularThisWeek().map((e, i) => (
          <React.Fragment key={i}>
            {i > 0 && <ResultDividerSM />}
            <PopularRow event={e} onPick={onPickEvent} />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ── Results state (typing) ──────────────────────────────────────
function ResultsStateSM({ query, onPickArtist, onPickVenue }) {
  const q = query.toLowerCase().trim();
  const artistIndex = React.useMemo(buildArtistIndex, []);
  const venueIndex = React.useMemo(buildVenueIndex, []);

  const matchedArtists = artistIndex.filter(a => a.name.toLowerCase().includes(q));
  const matchedVenues = venueIndex.filter(v => v.name.toLowerCase().includes(q));

  if (matchedArtists.length === 0 && matchedVenues.length === 0) {
    return <NoResultsSM query={query} />;
  }

  // Combined list — venues first if exact, otherwise artists first
  const showVenues = matchedVenues.length > 0;
  const showArtists = matchedArtists.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", paddingBottom: 40 }}>
      {showArtists && (
        <>
          <SectionHeaderSM icon="artist" label={`Artists · ${matchedArtists.length}`} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            {matchedArtists.map((a, i) => (
              <React.Fragment key={a.name}>
                {i > 0 && <ResultDividerSM />}
                <ResultRowSM
                  kind="artist"
                  name={a.name}
                  subtitle={`${dayLabelS(a.next.date)} · ${venueShortS(a.next.venue)}`}
                  onPick={() => onPickArtist(a)}
                />
              </React.Fragment>
            ))}
          </div>
          {showVenues && <div style={{ height: 16 }} />}
        </>
      )}
      {showVenues && (
        <>
          <SectionHeaderSM icon="pin" label={`Venues · ${matchedVenues.length}`} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            {matchedVenues.map((v, i) => (
              <React.Fragment key={v.name}>
                {i > 0 && <ResultDividerSM />}
                <ResultRowSM
                  kind="venue"
                  name={v.name}
                  subtitle={`${v.count} upcoming show${v.count !== 1 ? "s" : ""}`}
                  onPick={() => onPickVenue(v)}
                />
              </React.Fragment>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── MAIN ────────────────────────────────────────────────────────
function SearchScreenSM({ theme = "electric", initialQuery = "" }) {
  const [query, setQuery] = React.useState(initialQuery);
  const isDarkFrame = (window.CC_THEMES && window.CC_THEMES[theme])
    ? window.CC_THEMES[theme].mode === "dark" : true;

  return (
    <div style={{
      ...ccTokenVarsS(theme),
      height: "100%", display: "flex", flexDirection: "column",
      background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui",
      paddingTop: 62,
    }}>
      <SearchBarSM
        value={query}
        onChange={setQuery}
        onClear={() => setQuery("")}
        autoFocus={initialQuery === ""}
      />
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {query.trim() === ""
          ? <DefaultStateSM onPickQuery={setQuery} onPickEvent={() => {}} />
          : <ResultsStateSM query={query} onPickArtist={() => {}} onPickVenue={() => {}} />}
      </div>
    </div>
  );
}

window.SearchScreenSM = SearchScreenSM;

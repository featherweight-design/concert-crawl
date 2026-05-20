// browse-desktop.jsx — Concert Crawl Browse on desktop (v2)
// Single column, mobile-consistent, modal-based detail.
// View tabs: List (default) and Cal (week strip + day list).
// Filter pills on top, not a left rail.

const EVENTS_BD = window.CC_EVENTS;
const formatDateBD = window.ccFormatDate;
const groupByDateBD = window.ccGroupByDate;
const dayLabelBD = window.ccDayLabel;
const ArtistImageBD = window.CCArtistImage;
const CCMarkBD = window.CCMark;
const ccTokenVarsBD = window.ccTokenVars;
const expandEventForDetailBD = window.expandEventForDetail;

// ── Light icons (16×16, 1.5 stroke) ──────────────────────────────
function IconBD({ name, size = 16 }) {
  const inner = {
    search: <><circle cx="6.75" cy="6.75" r="4.75" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M10.25 10.25L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
    list: <path d="M3 4h10M3 8h10M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>,
    cal: <><rect x="2" y="3.25" width="12" height="10.75" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M2 7h12" stroke="currentColor" strokeWidth="1.5"/><path d="M5.5 1.75v2.5M10.5 1.75v2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
    plus: <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>,
    close: <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>,
    chevDown: <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      {inner[name]}
    </svg>
  );
}

// ── Top nav (web app shell) ──────────────────────────────────────
function TopNavBD({ active = "browse" }) {
  const tabs = [
    { key: "browse", label: "Browse" },
    { key: "search", label: "Search" },
    { key: "saved", label: "Saved" },
  ];
  return (
    <header style={{
      height: 64, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 32px",
      borderBottom: "1px solid var(--border)",
      background: "var(--bg-elevated)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 7, overflow: "hidden", flexShrink: 0 }}>
            <CCMarkBD size={32} />
          </div>
          <span style={{
            fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 17,
            letterSpacing: "-0.02em",
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
        <button style={{
          all: "unset", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8,
          height: 36, padding: "0 12px",
          borderRadius: 8, background: "var(--surface-1)",
          border: "1px solid var(--border)", width: 280, boxSizing: "border-box",
          color: "var(--fg-subtle)",
        }}>
          <IconBD name="search" size={14} />
          <span style={{ fontFamily: "Inter, system-ui", fontSize: 13 }}>Search artists, venues, genres…</span>
          <span style={{
            marginLeft: "auto",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: "var(--fg-subtle)",
            padding: "2px 5px", borderRadius: 3,
            border: "1px solid var(--border-strong)",
          }}>⌘K</span>
        </button>
        <div style={{
          width: 36, height: 36, borderRadius: 18,
          background: "var(--surface-2)", border: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13,
          color: "var(--fg-muted)",
        }}>JR</div>
      </div>
    </header>
  );
}

// ── View toggle (List / Cal) ────────────────────────────────────
function ViewToggleBD({ value, onChange }) {
  const opts = [
    { key: "list", label: "List", icon: "list" },
    { key: "cal",  label: "Cal",  icon: "cal" },
  ];
  return (
    <div style={{
      display: "inline-flex", alignItems: "center",
      padding: 3, borderRadius: 8,
      background: "var(--surface-1)", border: "1px solid var(--border)",
    }}>
      {opts.map(o => {
        const active = o.key === value;
        return (
          <button key={o.key} onClick={() => onChange(o.key)} style={{
            all: "unset", cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 14px", borderRadius: 6,
            fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12,
            color: active ? "var(--fg-on-accent)" : "var(--fg-muted)",
            background: active ? "var(--signal)" : "transparent",
            letterSpacing: "-0.005em",
          }}>
            <IconBD name={o.icon} size={13} />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Filter pills (mirrors mobile filter bar) ─────────────────────
function FilterPillsBD({ filters, setFilters, onChipClick }) {
  // Same dimensions as mobile, labels reflect active filter state.
  const chips = ["date", "venue", "price", "genre"].map(key => {
    const def = window.FILTER_DEFS && window.FILTER_DEFS[key];
    if (!def) return null;
    const value = filters[key];
    const active = !!value;
    const label = active
      ? window.filterActiveLabel(key, value)
      : def.placeholder;
    return { key, label, active };
  }).filter(Boolean);

  const anyActive = window.filterCountActive
    ? window.filterCountActive(filters) > 0
    : false;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      {chips.map(c => (
        <button
          key={c.key}
          data-filter-chip={c.key}
          onClick={(e) => onChipClick(c.key, e.currentTarget)}
          style={{
            all: "unset", cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "7px 12px", borderRadius: 999,
            background: c.active ? "var(--signal)" : "var(--surface-1)",
            color: c.active ? "var(--fg-on-accent)" : "var(--fg)",
            border: c.active ? "1px solid var(--signal)" : "1px solid var(--border)",
            fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12.5,
            letterSpacing: "-0.005em",
          }}
        >
          <span style={{ whiteSpace: "nowrap" }}>{c.label}</span>
          <IconBD name="chevDown" size={11} />
        </button>
      ))}
      {anyActive && (
        <button
          onClick={() => setFilters({})}
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
    </div>
  );
}

// ── Desktop event row (single column, ~720 max width) ────────────
function EventRowBD({ event, onClick, hero = false }) {
  return (
    <button onClick={onClick} style={{
      all: "unset", cursor: "pointer",
      display: "flex", alignItems: "center", gap: 16,
      padding: "14px 16px", borderRadius: 10,
      width: "100%", boxSizing: "border-box",
      transition: "background 0.12s",
    }}
    onMouseEnter={e => e.currentTarget.style.background = "var(--surface-1)"}
    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <div style={{ width: 64, height: 64, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
        <ArtistImageBD artist={event.artist} size={64} rounded />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{
          display: "flex", alignItems: "baseline", gap: 8,
        }}>
          <span style={{
            fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 16,
            color: "var(--fg)", letterSpacing: "-0.015em",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{event.artist}</span>
          {hero && (
            <span style={{
              padding: "1px 6px", borderRadius: 3,
              background: "var(--accent)", color: "var(--fg-on-accent)",
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
              fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
              flexShrink: 0,
            }}>Tonight</span>
          )}
        </div>
        {event.title !== event.artist && (
          <span style={{
            fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 12.5,
            color: "var(--fg-muted)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{event.title}</span>
        )}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5,
          color: "var(--fg-muted)", letterSpacing: "0.02em",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          minWidth: 0,
        }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{event.venue}</span>
          <span style={{ color: "var(--fg-subtle)", flexShrink: 0 }}>·</span>
          <span style={{ flexShrink: 0 }}>{event.time}</span>
        </div>
      </div>
      <div style={{
        flexShrink: 0, textAlign: "right",
        fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, fontWeight: 600,
        color: event.price ? "var(--signal)" : "var(--fg-subtle)",
        letterSpacing: "0.01em",
        minWidth: 60, whiteSpace: "nowrap",
      }}>{event.price || "TBA"}</div>
    </button>
  );
}

// ── Day group (sticky-ish header + rows) ─────────────────────────
function DayGroupBD({ date, events, onPick }) {
  const label = dayLabelBD(date);
  const isTonight = label === "Tonight";
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 24 }}>
      <header style={{
        display: "flex", alignItems: "baseline", gap: 10,
        padding: "0 16px 8px",
        borderBottom: "1px solid var(--border)",
        marginBottom: 4,
      }}>
        <h2 style={{
          margin: 0,
          fontFamily: "Inter, system-ui", fontWeight: 900, fontSize: 18,
          color: isTonight ? "var(--accent)" : "var(--fg)",
          letterSpacing: "-0.02em",
          whiteSpace: "nowrap",
        }}>{label}</h2>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: "var(--fg-subtle)", letterSpacing: "0.06em", textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}>{events.length} show{events.length !== 1 ? "s" : ""}</span>
      </header>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {events.map((e, i) => (
          <EventRowBD key={i} event={e} hero={isTonight && e.hero} onClick={() => onPick(e)} />
        ))}
      </div>
    </section>
  );
}

// ── List view ────────────────────────────────────────────────────
function ListViewBD({ events, onPick, onClearFilters }) {
  const sourceEvents = events || EVENTS_BD;
  if (sourceEvents.length === 0 && window.NoResultsState) {
    return <window.NoResultsState onClearFilters={onClearFilters} />;
  }
  const groups = groupByDateBD(sourceEvents);
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {groups.map(([date, events]) => (
        <DayGroupBD key={date} date={date} events={events} onPick={onPick} />
      ))}
    </div>
  );
}

// ── Cal view (week strip + day list — same shape as mobile) ──────
function CalViewBD({ events, onPick, onClearFilters }) {
  const [selectedDate, setSelectedDate] = React.useState("2026-04-30");
  const sourceEvents = events || EVENTS_BD;

  // Two weeks of strips (Apr 26 → May 9), 14 days
  const days = [];
  const start = new Date("2026-04-26T12:00:00");
  for (let i = 0; i < 14; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push({
      iso: d.toISOString().slice(0, 10),
      label: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()],
      num: String(d.getDate()),
    });
  }
  const today = "2026-04-28";
  const eventsForDate = sourceEvents.filter(e => e.date === selectedDate);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Week strip (14 days, scrollable horizontally if needed) */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(14, 1fr)",
        gap: 4,
        padding: "12px",
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: 10,
      }}>
        {days.map(wd => {
          const isSelected = wd.iso === selectedDate;
          const isToday = wd.iso === today;
          const hasEvents = sourceEvents.some(e => e.date === wd.iso);
          return (
            <button key={wd.iso} onClick={() => setSelectedDate(wd.iso)} style={{
              all: "unset", cursor: "pointer",
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 4, padding: "10px 0 8px",
              borderRadius: 8,
              background: isSelected ? "var(--signal)" : "transparent",
              transition: "background 0.15s",
            }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                color: isSelected ? "var(--fg-on-accent)" : "var(--fg-subtle)",
                fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase",
              }}>{wd.label}</span>
              <span style={{
                fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 18,
                color: isSelected ? "var(--fg-on-accent)"
                  : isToday ? "var(--accent)" : "var(--fg)",
              }}>{wd.num}</span>
              <div style={{
                width: 4, height: 4, borderRadius: 4,
                background: hasEvents
                  ? (isSelected ? "var(--fg-on-accent)" : "var(--accent)")
                  : "transparent",
              }} />
            </button>
          );
        })}
      </div>

      {/* Selected day's events */}
      {eventsForDate.length > 0 ? (
        <div>
          <div style={{
            display: "flex", alignItems: "baseline", gap: 10,
            padding: "0 16px 8px",
            borderBottom: "1px solid var(--border)",
            marginBottom: 4,
          }}>
            <h2 style={{
              margin: 0,
              fontFamily: "Inter, system-ui", fontWeight: 900, fontSize: 18,
              color: "var(--fg)", letterSpacing: "-0.02em",
              whiteSpace: "nowrap",
            }}>{dayLabelBD(selectedDate)}</h2>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              color: "var(--fg-subtle)", letterSpacing: "0.06em", textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}>{eventsForDate.length} show{eventsForDate.length !== 1 ? "s" : ""}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {eventsForDate.map((e, i) => (
              <EventRowBD key={i} event={e} onClick={() => onPick(e)} />
            ))}
          </div>
        </div>
      ) : onClearFilters ? (
        // Filters active — clean no-results state with reset CTA
        window.NoResultsState
          ? <window.NoResultsState onClearFilters={onClearFilters} />
          : null
      ) : (
        <div style={{
          padding: "60px 24px", textAlign: "center",
          background: "var(--surface-1)", borderRadius: 10,
          border: "1px solid var(--border)",
        }}>
          <div style={{
            fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 18,
            color: "var(--fg)", letterSpacing: "-0.02em",
          }}>No shows {selectedDate === today ? "tonight" : "that day"}, grandpa.</div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            color: "var(--fg-subtle)", marginTop: 6,
          }}>try another day above</div>
        </div>
      )}
    </div>
  );
}

// ── Modal (centered detail dialog) ───────────────────────────────
function EventDetailModalBD({ event, themeTokens, onClose }) {
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!event) return null;
  const expanded = expandEventForDetailBD(event);

  return (
    <div onClick={onClose} style={{
      position: "absolute", inset: 0, zIndex: 100,
      background: "var(--scrim)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 32,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        position: "relative",
        width: 560, maxHeight: "min(820px, 90%)",
        background: "var(--bg)",
        borderRadius: 14,
        border: "1px solid var(--border)",
        overflow: "hidden",
        display: "flex", flexDirection: "column",
        boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
      }}>
        {/* Close button (sits over the hero) */}
        <button onClick={onClose} style={{
          all: "unset", cursor: "pointer",
          position: "absolute", top: 12, right: 12, zIndex: 2,
          width: 36, height: 36, borderRadius: 18,
          background: "var(--scrim)", color: "var(--fg)",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}>
          <IconBD name="close" size={14} />
        </button>
        {/* Embed mobile EventDetail content, but with `chrome="modal"` */}
        <window.EventDetail event={expanded} themeTokens={themeTokens} chrome="modal" />
      </div>
    </div>
  );
}

// ── Main desktop browse ─────────────────────────────────────────
function BrowseDesktop({ theme = "electric", onPick }) {
  const [view, setView] = React.useState("list");
  const [filters, setFilters] = React.useState({});
  const [popover, setPopover] = React.useState({ key: null, anchor: null });

  // Apply filters to the master event list.
  const filteredEvents = window.applyFilters
    ? window.applyFilters(EVENTS_BD, filters)
    : EVENTS_BD;
  const anyFiltersActive = window.filterCountActive
    ? window.filterCountActive(filters) > 0
    : false;
  const onClearFilters = anyFiltersActive ? () => setFilters({}) : null;

  return (
    <div style={{
      ...ccTokenVarsBD(theme),
      background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui",
      minHeight: "100vh",
      display: "flex", flexDirection: "column",
      position: "relative",
    }}>
      <TopNavBD active="browse" />

      {/* Single centered column */}
      <main style={{
        flex: 1,
        width: "100%", maxWidth: 820, margin: "0 auto",
        padding: "32px 24px 80px",
        display: "flex", flexDirection: "column", gap: 18,
        boxSizing: "border-box",
      }}>
        {/* Page header */}
        <div style={{
          display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16,
          flexWrap: "wrap",
        }}>
          <div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              color: "var(--fg-muted)", letterSpacing: "0.08em", textTransform: "uppercase",
            }}>Denver · this week</div>
            <h1 style={{
              margin: "4px 0 0",
              fontFamily: "Inter, system-ui", fontWeight: 900, fontSize: 32,
              letterSpacing: "-0.025em",
            }}>What's on?</h1>
          </div>
          <ViewToggleBD value={view} onChange={setView} />
        </div>

        {/* Filter pills */}
        <FilterPillsBD
          filters={filters}
          setFilters={setFilters}
          onChipClick={(key, anchor) => {
            // Toggle: clicking the open chip closes the popover.
            if (popover.key === key) setPopover({ key: null, anchor: null });
            else setPopover({ key, anchor });
          }}
        />

        {/* Content */}
        {view === "list"
          ? <ListViewBD events={filteredEvents} onPick={onPick} onClearFilters={onClearFilters} />
          : <CalViewBD  events={filteredEvents} onPick={onPick} onClearFilters={onClearFilters} />}

        {/* Load more — only on List, only if there's something to load */}
        {view === "list" && filteredEvents.length > 0 && (
          <div style={{ padding: "16px 16px 20px", display: "flex", justifyContent: "center" }}>
            <button style={{
              all: "unset", cursor: "pointer",
              padding: "10px 24px", borderRadius: 8,
              background: "var(--surface-2)", border: "1px solid var(--border-strong)",
              fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13,
              color: "var(--signal)", letterSpacing: "-0.01em",
              textAlign: "center", width: "100%", boxSizing: "border-box",
            }}>Load more shows</button>
          </div>
        )}
      </main>

      {/* Filter popover (anchored to chip) */}
      {window.FilterPopover && (
        <window.FilterPopover
          open={!!popover.key}
          anchorEl={popover.anchor}
          filterKey={popover.key}
          currentValue={popover.key ? filters[popover.key] : null}
          onApply={(v) => setFilters(prev => {
            const next = { ...prev };
            if (v) next[popover.key] = v;
            else delete next[popover.key];
            return next;
          })}
          onClose={() => setPopover({ key: null, anchor: null })}
        />
      )}

    </div>
  );
}

// ── App router: Browse ↔ Event Detail ↔ Venue Profile ───────────
function BrowseDesktopApp() {
  const [theme, setTheme] = (window.useThemeState
    ? window.useThemeState("electric") : React.useState("electric"));
  // route = { kind: 'browse' } | { kind: 'event', event } | { kind: 'venue' }
  const [route, setRoute] = React.useState({ kind: "browse" });

  const goEvent = React.useCallback((ev) => {
    setRoute({ kind: "event", event: expandEventForDetailBD(ev) });
    // Scroll to top on navigation
    requestAnimationFrame(() => window.scrollTo({ top: 0 }));
  }, []);

  // Bridge for VenueLink clicks inside EventDetail (mobile component)
  React.useEffect(() => {
    const onVenueClick = () => setRoute({ kind: "venue" });
    window.addEventListener("cc:openVenue", onVenueClick);
    return () => window.removeEventListener("cc:openVenue", onVenueClick);
  }, []);

  let page;
  if (route.kind === "event") {
    page = <window.EventDetailPageDD theme={theme} event={route.event} />;
  } else if (route.kind === "venue") {
    page = <window.VenueProfilePageDD theme={theme} />;
  } else {
    page = <BrowseDesktop theme={theme} onPick={goEvent} />;
  }

  return (
    <>
      {page}
      {window.ThemeSwitcher && <window.ThemeSwitcher value={theme} onChange={setTheme} position="bottom-right" />}
    </>
  );
}

window.BrowseDesktop = BrowseDesktop;
window.BrowseDesktopApp = BrowseDesktopApp;

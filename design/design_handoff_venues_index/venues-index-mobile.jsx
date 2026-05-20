// venues-index-mobile.jsx — Concert Crawl, Venues index (mobile)
//
// Mobile counterpart to venues-index.jsx. Same visual vocabulary
// (identity art + monogram chip + capacity / upcoming mono stats),
// just composed for a 390px-wide column with a bottom tab bar
// instead of a top nav.
//
// Reuses everything declarative from the desktop file via window globals:
//   - VI_VENUES                 venue data
//   - VI_FILTER_DEFS            filter shape (sort + capacity + distance)
//   - vi_applyFilters           filter+sort fn
//   - vi_chipLabel              active chip label
//   - fmtNum / fmtDistance      number formatters
//   - identityFor / IdentityArt the art engine
//   - ia_getInitials, ia_isDark monogram helpers

const VIM_VENUES        = window.VI_VENUES;
const VIM_FILTER_DEFS   = window.VI_FILTER_DEFS;
const VIM_FILTER_KEYS   = window.VI_FILTER_KEYS;
const vim_applyFilters  = window.vi_applyFilters;
const vim_chipLabel     = window.vi_chipLabel;
const vim_fmtNum        = window.fmtNum;
const vim_fmtDistance   = window.fmtDistance;
const VIM_IdentityArt   = window.IdentityArt;
const vim_identityFor   = window.identityFor;
const vim_getInitials   = window.ia_getInitials;
const vim_isDark        = window.ia_isDark;

// ── Cluster Path mark (small) ──────────────────────────────────
function VIM_CCMark({ size = 28 }) {
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

// ── AppBar (mobile) ────────────────────────────────────────────
function VIM_AppBar() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "62px 16px 12px",
      background: "var(--bg)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <VIM_CCMark size={28} />
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

// ── Filter sheet (slides up from bottom on mobile) ──────────────
function VIM_FilterSheet({ open, filterKey, value, onApply, onClose }) {
  if (!open || !filterKey) return null;
  const def = VIM_FILTER_DEFS[filterKey];
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      display: "flex", flexDirection: "column",
      justifyContent: "flex-end", alignItems: "center",
      background: "var(--scrim)",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 402, boxSizing: "border-box",
        background: "var(--bg-elevated)",
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: "8px 0 28px",
        borderTop: "1px solid var(--border-strong)",
        boxShadow: "0 -20px 60px rgba(0,0,0,0.4)",
      }}>
        {/* Grabber */}
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 4px" }}>
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: "var(--border-strong)",
          }} />
        </div>
        <div style={{
          padding: "10px 20px 14px",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, fontWeight: 600, letterSpacing: "0.16em",
          textTransform: "uppercase", color: "var(--fg-subtle)",
        }}>{def.label}</div>
        {!def.alwaysOn && (
          <button onClick={() => { onApply(null); onClose(); }} style={{
            all: "unset", cursor: "pointer", display: "flex", width: "100%",
            boxSizing: "border-box", padding: "13px 20px",
            fontFamily: "Inter, system-ui", fontSize: 16,
            fontWeight: !value ? 700 : 500,
            color: !value ? "var(--fg)" : "var(--fg-muted)",
            background: !value ? "var(--surface-1)" : "transparent",
            justifyContent: "space-between", alignItems: "center",
          }}>
            <span>{def.placeholder}</span>
            {!value && (
              <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                <path d="M2 6.5l2.5 2.5L10 3.5" stroke="var(--signal)" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        )}
        {def.options.map(o => {
          const active = o.value === value;
          return (
            <button key={o.value}
              onClick={() => { onApply(active && !def.alwaysOn ? null : o.value); onClose(); }}
              style={{
                all: "unset", cursor: "pointer", display: "flex", width: "100%",
                boxSizing: "border-box", padding: "13px 20px",
                fontFamily: "Inter, system-ui", fontSize: 16,
                fontWeight: active ? 700 : 500,
                color: active ? "var(--fg)" : "var(--fg-muted)",
                background: active ? "var(--surface-1)" : "transparent",
                justifyContent: "space-between", alignItems: "center",
              }}>
              <span>{o.label}</span>
              {active && (
                <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6.5l2.5 2.5L10 3.5" stroke="var(--signal)" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Filter chip strip (horizontally scrollable) ────────────────
function VIM_FilterChips({ state, setState, onChipClick }) {
  const clearable = VIM_FILTER_KEYS.filter(k => !VIM_FILTER_DEFS[k].alwaysOn);
  const anyActive = clearable.some(k => state[k]);
  return (
    <div style={{
      display: "flex", gap: 6, overflowX: "auto",
      padding: "8px 16px 14px",
      scrollbarWidth: "none",
    }}>
      {VIM_FILTER_KEYS.map(key => {
        const def = VIM_FILTER_DEFS[key];
        const value = state[key];
        const active = def.alwaysOn
          ? (value && value !== def.options[0].value)
          : !!value;
        const label = vim_chipLabel(key, value);
        return (
          <button
            key={key}
            onClick={() => onChipClick(key)}
            style={{
              all: "unset", cursor: "pointer", flexShrink: 0,
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 999,
              background: active ? "var(--signal)" : "transparent",
              color: active ? "var(--fg-on-accent)" : "var(--fg-muted)",
              border: `1px solid ${active ? "var(--signal)" : "var(--border-strong)"}`,
              fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12,
              letterSpacing: "-0.005em",
            }}
          >
            {def.alwaysOn && (
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase",
                color: active ? "var(--fg-on-accent)" : "var(--fg-subtle)",
                opacity: active ? 0.7 : 1,
              }}>Sort</span>
            )}
            <span style={{ whiteSpace: "nowrap" }}>{label}</span>
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
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
            all: "unset", cursor: "pointer", flexShrink: 0,
            display: "inline-flex", alignItems: "center",
            padding: "6px 12px", borderRadius: 999,
            border: "1px dashed var(--border-strong)",
            fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12,
            color: "var(--fg-subtle)", whiteSpace: "nowrap",
          }}
        >× Clear</button>
      )}
    </div>
  );
}

// ── Identity tile (small, for mobile rows) ─────────────────────
function VIM_IdentityTile({ name, size = 56 }) {
  const id = vim_identityFor(name, "venue");
  const palette = id.palette;
  const dark = vim_isDark(palette.bg);
  const initials = vim_getInitials(name, 2);
  return (
    <div style={{
      position: "relative", width: size, height: size, flexShrink: 0,
      borderRadius: 9, overflow: "hidden",
      border: "1px solid var(--border)",
    }}>
      <VIM_IdentityArt name={name} kind="venue" scale="tile" showInitials={false}
        grain={0.08} width={size} height={size} />
      <div style={{
        position: "absolute", left: 4, bottom: 4,
        padding: "2px 5px", borderRadius: 4,
        background: dark ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.78)",
        backdropFilter: "blur(4px)",
        fontFamily: "Inter, system-ui", fontWeight: 900,
        fontSize: 9, letterSpacing: "0.04em",
        color: dark ? "#F1E6D5" : "#191418",
        lineHeight: 1,
      }}>{initials}</div>
    </div>
  );
}

// ── Featured (vertical) card ───────────────────────────────────
function VIM_FeatureCard({ venue }) {
  const id = vim_identityFor(venue.name, "venue");
  const palette = id.palette;
  const dark = vim_isDark(palette.bg);
  const initials = vim_getInitials(venue.name, 2);
  return (
    <button style={{
      all: "unset", cursor: "pointer", display: "block",
      width: "100%", boxSizing: "border-box",
    }}>
      <div style={{
        margin: "0 16px", borderRadius: 14, overflow: "hidden",
        background: "var(--surface-1)", border: "1px solid var(--border)",
      }}>
        {/* Art panel — full width on top */}
        <div style={{ position: "relative", height: 180, background: palette.bg }}>
          <VIM_IdentityArt
            name={venue.name} kind="venue" scale="hero" showInitials={false}
            grain={0.10} width="100%" height="100%"
            templateOverride="stripes"
          />
          {/* Monogram chip */}
          <div style={{
            position: "absolute", left: 12, bottom: 12,
            padding: "6px 10px", borderRadius: 7,
            background: dark ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.78)",
            backdropFilter: "blur(6px)",
            fontFamily: "Inter, system-ui", fontWeight: 900,
            fontSize: 18, letterSpacing: "0.02em",
            color: dark ? "#F1E6D5" : "#191418",
            lineHeight: 1,
          }}>{initials}</div>
          {/* Flagship eyebrow */}
          <div style={{
            position: "absolute", left: 12, top: 12,
            padding: "3px 9px", borderRadius: 999,
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, fontWeight: 600, letterSpacing: "0.16em",
            textTransform: "uppercase", color: "#F1E6D5",
          }}>★ Flagship</div>
        </div>
        {/* Meta */}
        <div style={{ padding: "16px 16px 18px" }}>
          <span style={{
            display: "inline-block", padding: "3px 9px", borderRadius: 5,
            background: "var(--surface-2)",
            border: "1px solid var(--border-strong)",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, fontWeight: 500, letterSpacing: "0.04em",
            color: "var(--fg-muted)",
          }}>{venue.type}</span>
          <div style={{
            marginTop: 8,
            fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 24,
            letterSpacing: "-0.03em", color: "var(--fg)", lineHeight: 1.1,
          }}>{venue.name}</div>
          <div style={{
            marginTop: 6,
            display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, color: "var(--fg-muted)", letterSpacing: "0.04em",
          }}>
            <span>{venue.neighborhood} · {venue.city}</span>
            <span style={{ color: "var(--fg-subtle)" }}>·</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--signal)" }}>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path d="M2 6h7M6 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Directions
            </span>
          </div>
          {/* Stats row */}
          <div style={{
            marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)",
            display: "flex", gap: 24,
          }}>
            <VIM_Stat label="Capacity" value={vim_fmtNum(venue.capacity)} />
            <VIM_Stat label="Upcoming" value={venue.upcoming} signal />
            <VIM_Stat label="Distance" value={vim_fmtDistance(venue.distance)} />
          </div>
        </div>
      </div>
    </button>
  );
}

function VIM_Stat({ label, value, signal = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9, fontWeight: 500, letterSpacing: "0.12em",
        textTransform: "uppercase", color: "var(--fg-subtle)",
        whiteSpace: "nowrap",
      }}>{label}</span>
      <span style={{
        fontFamily: "Inter, system-ui",
        fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em",
        color: signal ? "var(--signal)" : "var(--fg)",
        lineHeight: 1, whiteSpace: "nowrap",
      }}>{value}</span>
    </div>
  );
}

// ── Mobile list row ────────────────────────────────────────────
function VIM_VenueRow({ venue, last }) {
  return (
    <button style={{
      all: "unset", cursor: "pointer", display: "block", width: "100%",
      boxSizing: "border-box",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "12px 16px",
        borderBottom: last ? "none" : "1px solid var(--border)",
      }}>
        <VIM_IdentityTile name={venue.name} size={56} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 16,
            letterSpacing: "-0.015em", color: "var(--fg)",
            lineHeight: 1.2,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{venue.name}</div>
          <div style={{
            marginTop: 5,
            display: "flex", alignItems: "center", gap: 7,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, letterSpacing: "0.04em",
            color: "var(--fg-muted)",
          }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 3,
              color: "var(--fg)", fontWeight: 600,
            }}>
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M6 1.5c2 0 3.5 1.5 3.5 3.5 0 2.6-3.5 6-3.5 6S2.5 7.6 2.5 5c0-2 1.5-3.5 3.5-3.5z"
                      stroke="currentColor" strokeWidth="1.2" fill="none"/>
                <circle cx="6" cy="5" r="1.1" fill="currentColor"/>
              </svg>
              {vim_fmtDistance(venue.distance)}
            </span>
            <span style={{ color: "var(--fg-subtle)" }}>·</span>
            <span style={{
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              minWidth: 0,
            }}>{vim_fmtNum(venue.capacity)} cap</span>
          </div>
        </div>
        {/* Right: upcoming + chevron */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
            <span style={{
              fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 16,
              color: "var(--signal)", letterSpacing: "-0.02em", lineHeight: 1,
            }}>{venue.upcoming}</span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase",
              color: "var(--fg-subtle)",
            }}>shows</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: "var(--fg-subtle)" }}>
            <path d="M5 3l5 5-5 5" stroke="currentColor" strokeWidth="1.75"
                  strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </button>
  );
}

// ── Bottom tab bar ─────────────────────────────────────────────
function VIM_TabBar({ active = "venues" }) {
  const tabs = [
    { key: "browse",   label: "Browse",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg> },
    { key: "venues",   label: "Venues",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"/>
            </svg> },
    { key: "watching", label: "Watching",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 5c-5 0-9 7-9 7s4 7 9 7 9-7 9-7-4-7-9-7z" stroke="currentColor" strokeWidth="2"
                    strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="2"/>
            </svg> },
    { key: "me", label: "Me",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="2"/>
              <path d="M4 21c0-4 4-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round"/>
            </svg> },
  ];
  return (
    <div style={{
      position: "sticky", left: 0, right: 0, bottom: 0,
      marginTop: -92, // overlap into the content padding-bottom
      paddingBottom: 22, paddingTop: 8,
      background: "var(--bg-elevated)",
      borderTop: "1px solid var(--border)",
      display: "flex", justifyContent: "space-around",
      zIndex: 50,
    }}>
      {tabs.map(t => {
        const isActive = t.key === active;
        return (
          <button key={t.key} style={{
            all: "unset", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            padding: "6px 14px", borderRadius: 10,
            color: isActive ? "var(--signal)" : "var(--fg-subtle)",
          }}>
            {t.icon}
            <span style={{
              fontFamily: "Inter, system-ui",
              fontWeight: isActive ? 700 : 500, fontSize: 10,
              letterSpacing: "-0.005em",
            }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────
function VenuesIndexMobilePage() {
  const [filterState, setFilterState] = React.useState({
    sort: "upcoming", capacity: null, distance: null,
  });
  const [openSheet, setOpenSheet] = React.useState(null);

  const filtered = vim_applyFilters(VIM_VENUES, filterState);
  const filtersActive = !!filterState.capacity || !!filterState.distance;
  const featured = filtersActive ? null : filtered.find(v => v.featured);
  const visible = featured ? filtered.filter(v => v !== featured) : filtered;

  return (
    <div style={{
      width: "100%", minHeight: "100%",
      background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui",
      paddingBottom: 92, // room for tab bar
      position: "relative",
    }}>
      <VIM_AppBar />

      {/* Section title */}
      <div style={{
        padding: "4px 16px 14px",
        display: "flex", alignItems: "baseline", gap: 10,
      }}>
        <h1 style={{
          margin: 0,
          fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 28,
          letterSpacing: "-0.03em", color: "var(--fg)",
        }}>Venues</h1>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, color: "var(--fg-muted)", letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}>{filtered.length} in Denver</span>
      </div>

      {/* Filter chips */}
      <VIM_FilterChips
        state={filterState}
        setState={setFilterState}
        onChipClick={(k) => setOpenSheet(k)}
      />

      {/* Featured */}
      {featured && (
        <div style={{ marginBottom: 18 }}>
          <VIM_FeatureCard venue={featured} />
        </div>
      )}

      {/* Rows */}
      <div>
        {visible.map((v, i) => (
          <VIM_VenueRow key={v.name} venue={v} last={i === visible.length - 1} />
        ))}
      </div>

      {/* Empty state */}
      {visible.length === 0 && !featured && (
        <div style={{
          padding: "60px 24px", textAlign: "center",
        }}>
          <div style={{
            fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 16,
            color: "var(--fg)",
          }}>No venues match.</div>
          <div style={{
            marginTop: 5,
            fontFamily: "Inter, system-ui", fontSize: 13,
            color: "var(--fg-muted)",
          }}>Loosen a filter or two and they'll come back.</div>
          <button
            onClick={() => setFilterState(s => ({ ...s, capacity: null, distance: null }))}
            style={{
              all: "unset", cursor: "pointer", marginTop: 14,
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 13px", borderRadius: 999,
              border: "1px solid var(--border-strong)",
              fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12,
              color: "var(--fg-muted)",
            }}
          >× Clear filters</button>
        </div>
      )}

      {/* Bottom sheet */}
      <VIM_FilterSheet
        open={!!openSheet}
        filterKey={openSheet}
        value={openSheet ? filterState[openSheet] : null}
        onApply={(v) => setFilterState(s => ({ ...s, [openSheet]: v }))}
        onClose={() => setOpenSheet(null)}
      />

      {/* Tab bar */}
      <VIM_TabBar active="venues" />
    </div>
  );
}

window.VenuesIndexMobilePage = VenuesIndexMobilePage;

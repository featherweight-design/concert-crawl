// share-trigger.jsx — UX entry points for sharing.
//
// Two surfaces:
//   1. ShareTriggerEventDetail — Event Detail v2 hero with a Share affordance
//      added next to the existing Save heart, and a bottom-sheet that previews
//      the three card directions and lets the user pick one + a destination.
//   2. ShareTriggerWatching    — Watching list card with "Share my watchlist"
//      as a quieter secondary entry — one composite card that summarises the
//      list, e.g. "5 shows on my radar."
//
// Both surfaces are mocked — they're for placement + interaction reference.

// ─────────────────────────────────────────────────────────────────
// Atoms
// ─────────────────────────────────────────────────────────────────

function IconBtn({ children, label, onClick, active }) {
  return (
    <button onClick={onClick} aria-label={label} style={{
      all: "unset", cursor: "pointer",
      width: 36, height: 36, borderRadius: 999,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      background: active ? "color-mix(in oklab, var(--accent) 18%, transparent)" : "rgba(0,0,0,0.32)",
      backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
      border: "1px solid rgba(255,255,255,0.15)",
      color: active ? "var(--accent)" : "#fff",
      transition: "background .12s, color .12s",
    }}>{children}</button>
  );
}

function HeartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 13.5s-5-3.2-5-7a3 3 0 0 1 5-2.2A3 3 0 0 1 13 6.5c0 3.8-5 7-5 7Z"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2v8M8 2 5 5M8 2l3 3" stroke="currentColor" strokeWidth="1.4"
        strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 8v4a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V8" stroke="currentColor"
        strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.4"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// Mocked Event Detail (just enough to show where the trigger lives)
// ─────────────────────────────────────────────────────────────────

// Mirrors the Event Detail v2 surface: chip row → title → watch CTA → info
// rows → price card → setlist preview → primary CTA. Share lands as a 3rd
// icon button in the hero (Back · Share · Save), in the same scrim-pill
// vocabulary that Event Detail v2 already uses for Back and Save.
// Faithful recreation of Event Detail v2's mobile hero + body. The Share
// affordance is added as a third scrim-pill in the top-right (next to Save),
// matching EV2's BackButton/SaveButton vocabulary exactly.
function MockEventDetailHero({ event, onShare, sheetOpen }) {
  // EV2's exact scrim-pill atom — top:56 to clear the iOS status bar
  const ScrimPill = ({ side, offset = 14, onClick, active, label, children }) => (
    <button onClick={onClick} aria-label={label} style={{
      all: "unset", cursor: "pointer",
      position: "absolute", top: 56, [side]: offset, zIndex: 20,
      width: 36, height: 36, borderRadius: 18,
      background: active ? "color-mix(in oklab, var(--accent) 26%, var(--scrim))" : "var(--scrim)",
      backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: active ? "var(--accent)" : "var(--fg)",
    }}>{children}</button>
  );

  return (
    <div style={{
      width: 390, height: 844, background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui", position: "relative", overflow: "hidden",
      borderRadius: 36, border: "1px solid var(--border)",
    }}>
      {/* Status bar */}
      <div style={{
        height: 44, padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontWeight: 600, fontSize: 14, color: "var(--fg)",
      }}>
        <span>9:41</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, opacity: 0.5 }}>•••</span>
      </div>

      {/* Hero — identity art (Phase 7.5 wired everywhere) */}
      <div style={{ position: "relative", height: 300 }}>
        <IdentityArt name={event.artist} kind="artist" scale="hero"
          width="100%" height="100%" showInitials={false}/>
        {/* EV2 scrim-pills: Back (left), Share + Save (right) */}
        <ScrimPill side="left" label="Back">
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
            <path d="M8 2L2 8l6 6" stroke="var(--fg)" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </ScrimPill>
        <ScrimPill side="right" offset={14 + 36 + 8} label="Share"
          onClick={onShare} active={sheetOpen}>
          <svg width="14" height="16" viewBox="0 0 16 18" fill="none">
            <path d="M8 1.5v9M8 1.5L4.5 5M8 1.5L11.5 5"
              stroke="currentColor" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2.5 9.5v5a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5v-5"
              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </ScrimPill>
        <ScrimPill side="right" label="Save">
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
            <path d="M9 15l-6.5-6A3.5 3.5 0 019 4.5 3.5 3.5 0 0115.5 9L9 15z"
              stroke="var(--fg)" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
        </ScrimPill>
        {/* Hero fade into bg */}
        <div style={{
          position: "absolute", left: 0, right: 0, bottom: 0, height: 80,
          background: "linear-gradient(transparent, var(--bg))",
        }}/>
      </div>

      {/* Body — picks up at -20 to overlap the hero fade (EV2 pattern) */}
      <div style={{ padding: "0 18px", marginTop: -20, position: "relative" }}>
        {/* Genre chip — EV2 ChipRow */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          {(event.genres || []).slice(0, 2).map(g => (
            <span key={g} style={{
              padding: "3px 8px", borderRadius: 4,
              background: "var(--surface-3)", color: "var(--fg-muted)",
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600,
              letterSpacing: "0.04em", textTransform: "uppercase",
            }}>{g}</span>
          ))}
        </div>
        <h1 style={{
          margin: 0, fontWeight: 900, fontSize: 26, letterSpacing: "-0.03em", lineHeight: 1.1,
        }}>{event.artist}</h1>

        {/* Watch CTA — EV2 WatchShowButton vocabulary (active state shown) */}
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button style={{
            all: "unset", cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 8,
            height: 30, padding: "0 12px", borderRadius: 8,
            background: "color-mix(in oklab, var(--accent) 14%, transparent)",
            color: "var(--accent)",
            border: "1px solid color-mix(in oklab, var(--accent) 35%, transparent)",
            fontWeight: 700, fontSize: 12, letterSpacing: "-0.005em",
          }}>
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6.5l2.5 2.5L9.5 4" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Watching
          </button>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600,
            color: "var(--fg-subtle)", letterSpacing: "0.04em",
          }}>
            <span style={{ width: 4, height: 4, borderRadius: 2, background: "var(--accent)" }}/>
            14 watching
          </span>
        </div>

        {/* Info rows (Venue / Date / Doors / Ages) — EV2 InfoRow */}
        <div style={{
          marginTop: 14, padding: "4px 0",
          borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
        }}>
          {[
            ["Venue", event.venue],
            ["Date",  event.date],
            ["Doors / Show", `${event.doors} / ${event.showTime}`],
          ].map(([k, v]) => (
            <div key={k} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                background: "var(--surface-2)",
              }}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                  color: "var(--fg-subtle)", letterSpacing: "0.08em", textTransform: "uppercase",
                  fontWeight: 600,
                }}>{k}</div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--fg)", marginTop: 1 }}>{v}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Price card — matches EV2 PriceBlockB hierarchy */}
        <div style={{
          marginTop: 14, padding: 14, borderRadius: 12,
          background: "var(--surface-1)", border: "1px solid var(--border)",
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
            color: "var(--fg-subtle)", letterSpacing: "0.1em", textTransform: "uppercase",
          }}>Going rate</div>
          <div style={{
            display: "flex", alignItems: "baseline", gap: 10, marginTop: 6,
          }}>
            <span style={{ fontWeight: 800, fontSize: 30, color: "var(--fg)", letterSpacing: "-0.02em" }}>
              {event.pricePill || "$22"}
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--fg-subtle)", letterSpacing: "0.04em" }}>
              ↓ $4 since Tue · 12 reports
            </span>
          </div>
        </div>

        {/* Primary CTA — EV2 PrimaryCTA */}
        <button style={{
          all: "unset", cursor: "pointer", marginTop: 14, width: "100%", boxSizing: "border-box",
          height: 44, borderRadius: 10, background: "var(--accent)", color: "var(--fg-on-accent)",
          fontWeight: 700, fontSize: 14, letterSpacing: "-0.005em",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>Get Tickets ↗</button>
      </div>

      {/* Sheet scrim */}
      {sheetOpen && (
        <div style={{
          position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(2px)",
        }} onClick={onShare}/>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Share sheet — bottom-sheet preview / picker
// ─────────────────────────────────────────────────────────────────

function ShareSheet({ event, mint, direction, setDirection }) {
  // Stub + Receipt directions dropped — Riso Poster is the only direction now.
  const directions = [
    { id: "poster",  label: "Riso Poster" },
  ];
  const destinations = [
    { id: "ig-story", label: "Story" },
    { id: "ig-feed",  label: "Feed" },
    { id: "x",        label: "X" },
    { id: "imsg",     label: "Messages" },
    { id: "save",     label: "Save image" },
    { id: "copy",     label: "Copy link" },
  ];

  return (
    <div style={{
      position: "absolute", left: 0, right: 0, bottom: 0,
      background: "var(--bg-elevated, var(--bg))",
      borderTop: "1px solid var(--border-strong)",
      borderTopLeftRadius: 22, borderTopRightRadius: 22,
      padding: "14px 18px 22px",
      maxHeight: "85%", overflow: "hidden",
      boxShadow: "0 -8px 24px rgba(0,0,0,0.25)",
    }}>
      {/* Grabber */}
      <div style={{
        width: 44, height: 5, borderRadius: 4, background: "var(--border-strong)",
        margin: "0 auto 14px",
      }}/>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
            letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-subtle)",
          }}>Share</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: "var(--fg)", marginTop: 2 }}>
            I'm going to {event.artist}
          </div>
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, fontWeight: 600,
          color: "var(--fg-subtle)", letterSpacing: "0.04em",
        }}>#{mint.serial}</div>
      </div>

      {/* Direction switcher */}
      <div style={{
        marginTop: 14,
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
        padding: 4, borderRadius: 10, background: "var(--surface-1)",
      }}>
        {directions.map(d => {
          const active = d.id === direction;
          return (
            <button key={d.id} onClick={() => setDirection(d.id)} style={{
              all: "unset", cursor: "pointer",
              padding: "8px 0", textAlign: "center",
              fontWeight: 600, fontSize: 12, letterSpacing: "-0.005em",
              color: active ? "var(--bg)" : "var(--fg-muted)",
              background: active ? "var(--fg)" : "transparent",
              borderRadius: 6,
            }}>{d.label}</button>
          );
        })}
      </div>

      {/* Live preview — square ratio for the sheet */}
      <div style={{
        marginTop: 14, borderRadius: 14, overflow: "hidden",
        border: "1px solid var(--border)",
        aspectRatio: "1 / 1", position: "relative",
      }}>
        <div style={{
          width: 1080, height: 1080, position: "absolute", left: 0, top: 0,
          transform: "scale(0.314)", transformOrigin: "top left",
        }}>
          <ShareCard direction={direction} event={event} ratio="square" mint={mint}/>
        </div>
      </div>

      {/* Destination row */}
      <div style={{
        marginTop: 14, display: "flex", gap: 10, overflowX: "auto",
        paddingBottom: 4, marginInline: -18, paddingInline: 18,
      }}>
        {destinations.map((d, i) => (
          <button key={d.id} style={{
            all: "unset", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            minWidth: 60,
          }}>
            <div style={{
              width: 50, height: 50, borderRadius: 14, flexShrink: 0,
              background: i === 0 ? "linear-gradient(135deg, #FCB045, #FD1D1D 50%, #833AB4)"
                       : i === 1 ? "linear-gradient(135deg, #405DE6, #C13584)"
                       : i === 2 ? "#000"
                       : i === 3 ? "linear-gradient(180deg, #34C759, #1FA34A)"
                       : "var(--surface-2)",
              border: "1px solid var(--border)",
              color: i < 4 ? "#fff" : "var(--fg)",
              fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 18,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{d.label[0]}</div>
            <span style={{
              fontWeight: 500, fontSize: 11, color: "var(--fg-muted)",
              whiteSpace: "nowrap",
            }}>{d.label}</span>
          </button>
        ))}
      </div>

      {/* Mint signature toggle */}
      <div style={{
        marginTop: 14, padding: "10px 12px",
        background: "var(--surface-1)", borderRadius: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 12, color: "var(--fg)" }}>
            Sign as {window.SHARE_USER.handle}
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
            color: "var(--fg-subtle)", marginTop: 2, letterSpacing: "0.04em",
          }}>#{mint.serial} · {mint.mintedAtShort}</div>
        </div>
        <div style={{
          width: 36, height: 22, borderRadius: 999, background: "var(--accent)",
          position: "relative", flexShrink: 0,
        }}>
          <div style={{
            position: "absolute", right: 2, top: 2, width: 18, height: 18,
            borderRadius: 999, background: "var(--fg-on-accent)",
          }}/>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Composed — Event Detail mock + share sheet open
// ─────────────────────────────────────────────────────────────────

function ShareTriggerEventDetail({ event, mint, sheetDirection = "poster", sheetOpen = true }) {
  const [direction, setDirection] = React.useState(sheetDirection);
  const [open, setOpen] = React.useState(sheetOpen);
  return (
    <div style={{ position: "relative", width: 390, height: 844 }}>
      <MockEventDetailHero event={event} onShare={() => setOpen(o => !o)} sheetOpen={open}/>
      {open && (
        <div style={{
          position: "absolute", left: 0, right: 0, bottom: 0,
          borderRadius: 36, overflow: "hidden",
        }}>
          <ShareSheet event={event} mint={mint}
            direction={direction} setDirection={setDirection}/>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Watching list — quieter share entry
// ─────────────────────────────────────────────────────────────────

// Faithful Saved & Watching screen with a "Share my list" affordance added
// next to the title. Reuses WatchingRoute verbatim — single source of truth.
function ShareTriggerWatching({ shareOpen = false }) {
  const WatchingRoute = window.WatchingRoute;
  const shows = window.W_SHOWS || [];
  return (
    <div style={{
      width: 390, height: 844, background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui", position: "relative", overflow: "hidden",
      borderRadius: 36, border: "1px solid var(--border)",
    }}>
      {/* Status bar */}
      <div style={{
        height: 44, padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontWeight: 600, fontSize: 14, color: "var(--fg)",
      }}>
        <span>9:41</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, opacity: 0.5 }}>•••</span>
      </div>

      {/* Real Watching surface */}
      <div style={{ height: "calc(100% - 44px)", overflow: "hidden", position: "relative" }}>
        {WatchingRoute && <WatchingRoute shows={shows} density="cozy"/>}

        {/* Share affordance — small pill in the header right edge,
            matches the "X shows" header rhythm without disrupting the route. */}
        <button aria-label="Share my watchlist" style={{
          all: "unset", cursor: "pointer",
          position: "absolute", top: 18, right: 16,
          height: 30, padding: "0 12px", borderRadius: 999,
          background: "color-mix(in oklab, var(--accent) 16%, var(--surface-1))",
          color: "var(--accent)",
          border: "1px solid color-mix(in oklab, var(--accent) 32%, transparent)",
          fontWeight: 700, fontSize: 12, letterSpacing: "-0.005em",
          display: "inline-flex", alignItems: "center", gap: 6, zIndex: 5,
        }}><ShareIcon/> Share list</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// "Watching" composite share card — variant that summarises a list
// (one-off, beyond the per-event cards)
// ─────────────────────────────────────────────────────────────────

// Reads W_SHOWS-shaped objects (artist, venue, dateLabel, currentPrice,
// savedPrice, status). Mirrors the Saved & Watching row vocabulary: current
// price + signed delta tag, sold-out pill, presale em-dash. Sized to be
// legible at sharing scale — story fits ~7 rows, square ~5, link ~3.
function WatchingComposite({ events, ratio = "square", mint }) {
  const { w, h } = SC_RATIOS[ratio];
  const isStory = ratio === "story";
  const isLink = ratio === "link";
  const maxRows = isStory ? 7 : isLink ? 3 : 5;
  const shown = events.slice(0, maxRows);
  const fmt = window.w_formatUSD;
  const cls = window.w_classifyDelta;
  const fmtDelta = window.w_formatDelta;
  return (
    <div style={{
      width: w, height: h, background: "var(--bg)", color: "var(--fg)",
      position: "relative", overflow: "hidden",
      padding: isLink ? "44px 56px" : isStory ? "60px 56px" : "52px 52px",
      display: "flex", flexDirection: "column",
      fontFamily: "Inter, system-ui",
    }}>
      <div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
          fontSize: isStory ? 18 : 15, letterSpacing: "0.14em", textTransform: "uppercase",
          color: "var(--accent)",
        }}>Watching · {events.length} shows</div>
        <h1 style={{
          margin: "16px 0 0", fontWeight: 900,
          fontSize: isStory ? 108 : isLink ? 64 : 88,
          lineHeight: 0.92, letterSpacing: "-0.05em",
          color: "var(--fg)", textWrap: "balance",
        }}>On my radar this spring.</h1>
      </div>

      {/* List sits directly under the title — small breathing gap. */}
      <div style={{
        marginTop: isStory ? 36 : 24,
        display: "grid", gap: isStory ? 14 : 10,
        gridTemplateColumns: "1fr", flex: "0 0 auto",
      }}>
        {shown.map((e, i) => {
          const isSoldOut = e.status === "soldout";
          const isPresale = e.status === "presale";
          const k = cls ? cls(e.savedPrice, e.currentPrice) : "fresh";
          const delta = fmtDelta ? fmtDelta(e.savedPrice, e.currentPrice) : "";
          return (
          <div key={e.id} style={{
            display: "flex", alignItems: "center",
            gap: isStory ? 22 : 18,
            paddingBottom: isStory ? 16 : 12,
            borderBottom: i === shown.length - 1 ? "none" : "1px solid var(--border)",
            width: "100%", minWidth: 0,
          }}>
            <div style={{
              width: isStory ? 80 : 64, height: isStory ? 80 : 64, overflow: "hidden",
              borderRadius: 8, border: "1px solid var(--border)", flex: "0 0 auto",
            }}>
              <IdentityArt name={e.artist} kind="artist" scale="micro"
                width="100%" height="100%" showInitials={false}/>
            </div>
            <div style={{ minWidth: 0, flex: "1 1 auto", overflow: "hidden" }}>
              <div style={{
                fontWeight: 800, fontSize: isStory ? 38 : 28,
                letterSpacing: "-0.025em", color: "var(--fg)",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                lineHeight: 1.05,
              }}>{e.artist}</div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600, fontSize: isStory ? 18 : 14,
                color: "var(--fg-muted)", marginTop: 4, letterSpacing: "0.02em",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{e.venue} · {e.dateLabel}</div>
            </div>
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "flex-end",
              gap: 2, flex: "0 0 auto",
              minWidth: isStory ? 140 : isLink ? 110 : 120,
              textAlign: "right",
            }}>
              {isSoldOut ? (
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: isStory ? 13 : 10, fontWeight: 700,
                  color: "var(--warning)",
                  background: "color-mix(in oklch, var(--warning) 14%, transparent)",
                  border: "1px solid color-mix(in oklch, var(--warning) 40%, transparent)",
                  padding: "4px 9px", borderRadius: 4,
                  letterSpacing: "0.14em", textTransform: "uppercase",
                }}>Sold out</span>
              ) : isPresale ? (
                <>
                  <span style={{
                    fontSize: isStory ? 26 : 22, fontWeight: 800,
                    color: "var(--fg-subtle)", fontVariantNumeric: "tabular-nums",
                  }}>—</span>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: isStory ? 12 : 10, fontWeight: 700,
                    color: "var(--fg-subtle)", letterSpacing: "0.10em",
                    textTransform: "uppercase",
                  }}>presale</span>
                </>
              ) : e.currentPrice == null ? (
                <span style={{
                  fontSize: isStory ? 26 : 22, fontWeight: 800,
                  color: "var(--fg-subtle)",
                }}>—</span>
              ) : (
                <>
                  <span style={{
                    fontSize: isStory ? 30 : 24, fontWeight: 800,
                    letterSpacing: "-0.01em",
                    color: k === "drop" ? "var(--success)" : "var(--fg)",
                    fontVariantNumeric: "tabular-nums",
                  }}>{fmt ? fmt(e.currentPrice) : `$${Math.round(e.currentPrice)}`}</span>
                  {delta && delta !== "flat" && (
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: isStory ? 12 : 10, fontWeight: 700,
                      letterSpacing: "0.04em",
                      color: k === "drop" ? "var(--success)"
                          : k === "spike" ? "var(--warning)"
                          : "var(--fg-subtle)",
                    }}>{delta}</span>
                  )}
                </>
              )}
            </div>
          </div>
          );
        })}
      </div>

      <div style={{
        marginTop: "auto",
        paddingTop: isStory ? 20 : 14,
        borderTop: "1px solid var(--border)",
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
      }}>
        <div style={{
          fontFamily: "Inter, system-ui", fontWeight: 900,
          fontSize: isStory ? 42 : isLink ? 24 : 32,
          letterSpacing: "-0.035em", color: "var(--fg)", lineHeight: 1,
        }}>ConcertCrawl</div>
        {mint && mint.by && (
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
            fontSize: isStory ? 17 : isLink ? 12 : 14, color: "var(--fg-muted)",
            letterSpacing: "0.04em",
          }}>{mint.by}</div>
        )}
      </div>
    </div>
  );
}

window.ShareTriggerEventDetail = ShareTriggerEventDetail;
window.ShareTriggerWatching = ShareTriggerWatching;
window.WatchingComposite = WatchingComposite;

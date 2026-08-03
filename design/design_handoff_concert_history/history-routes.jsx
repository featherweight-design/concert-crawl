// history-routes.jsx — mobile + desktop shells, locked & empty states,
// and the PassportCard share/keepsake view. Loaded after history-screens.jsx.
//
// Routes:
//   <HistoryRoute>          — mobile hub (tabs above content)
//   <HistoryRouteDesktop>   — desktop topnav + main shell, max-width 880
//
// States:
//   <HistoryEmpty>          — Supporter, no past shows yet
//   <HistoryLocked>         — Free user; upsell card over silhouetted stubs
//
// Passport (stretch):
//   <PassportCard>          — shareable summary view (1080×1080 share, or
//                              ~360×460 in-app preview).

const { useState: rState, useMemo: rMemo, useEffect: rEffect } = React;

// ── CCMark (canonical, lifted verbatim per CLAUDE.md) ─────────
function CCMark({ size = 28 }) {
  const trail = [
    { x: 14, y: 76, r: 1.5 }, { x: 24, y: 70, r: 2 },
    { x: 34, y: 64, r: 2.5 }, { x: 42, y: 58, r: 3 },
    { x: 50, y: 50, r: 4 },   { x: 58, y: 42, r: 5 },
    { x: 66, y: 32, r: 6 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true">
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

// ── Bucket list body ─────────────────────────────────────────
function HistoryBuckets({ shows, density }) {
  const buckets = h_groupBuckets(shows);
  return (
    <>
      {buckets.map(b => (
        <HistorySection key={b.key} title={b.label} subtitle={`${b.shows.length}`}>
          {b.shows.map(s => <HistoryItem key={s.id} show={s} density={density}/>)}
        </HistorySection>
      ))}
    </>
  );
}

// ── Empty state ──────────────────────────────────────────────
// Supporter who hasn't had any past shows yet. Same restraint as Watching's
// "Crickets." — playful + clear, not preachy.
function HistoryEmpty() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 18, padding: "72px 32px 60px", textAlign: "center",
      fontFamily: "Inter, system-ui", color: "var(--fg)",
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 14,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--surface-1)",
        border: "1.5px dashed var(--border-strong)",
      }}>
        <StubStamp artist="placeholder-empty" size={32}/>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.025em", color: "var(--fg)" }}>
          Nothing's behind you yet.
        </div>
        <div style={{ fontSize: 13.5, color: "var(--fg-muted)", lineHeight: 1.55, letterSpacing: "-0.005em", maxWidth: 320 }}>
          Tap <strong style={{ color: "var(--fg)", fontWeight: 700 }}>I'm going!</strong> on a show you've got tickets for. After the date, it lands here as a keepsake.
        </div>
      </div>
      <button style={{
        marginTop: 6,
        background: "var(--signal)", color: "var(--fg-on-accent)",
        border: "none", borderRadius: 8, padding: "11px 20px",
        fontFamily: "Inter, system-ui", fontSize: 13.5, fontWeight: 700,
        letterSpacing: "-0.005em", cursor: "pointer",
      }}>Browse tonight's shows</button>
    </div>
  );
}

// ── Silhouette stubs (decorative background for the locked state) ──
// Five faint stub silhouettes fanned behind the upsell card. Pulled from
// the marketing Showtime stub vocabulary but stripped of all glyph + copy
// so they read as quiet wallpaper, not bait.
function SilhouetteStubs() {
  const stubs = [
    { tx: -110, rot: -16, opacity: 0.06 },
    { tx:  -60, rot:  -8, opacity: 0.09 },
    { tx:    0, rot:  -2, opacity: 0.12 },
    { tx:   60, rot:   8, opacity: 0.09 },
    { tx:  110, rot:  16, opacity: 0.06 },
  ];
  return (
    <div aria-hidden="true" style={{
      position: "absolute", inset: 0, overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center",
      pointerEvents: "none",
    }}>
      <div style={{ position: "relative", width: 320, height: 180 }}>
        {stubs.map((s, i) => (
          <div key={i} style={{
            position: "absolute", left: "50%", top: "50%",
            width: 180, height: 110,
            transform: `translate(-50%, -50%) translate(${s.tx}px, 0) rotate(${s.rot}deg)`,
            opacity: s.opacity,
          }}>
            <svg width="180" height="110" viewBox="0 0 180 110">
              <path d="M0 12 Q0 0 12 0 L132 0 L132 110 L12 110 Q0 110 0 98 Z"
                fill="var(--fg)"/>
              <path d="M140 0 L168 0 Q180 0 180 12 L180 98 Q180 110 168 110 L140 110 Z"
                fill="var(--fg)"/>
              <line x1="136" y1="6" x2="136" y2="104"
                stroke="var(--bg)" strokeWidth="1" strokeDasharray="3 4" opacity="0.8"/>
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Locked state (Free user) ─────────────────────────────────
// Centered Supporter card over silhouetted stubs. Voice = Sour Patch:
// honest about what you get, light on the pressure.
function HistoryLocked({ onUpgrade }) {
  return (
    <div style={{
      position: "relative", width: "100%", height: "100%",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "40px 24px", boxSizing: "border-box",
      background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui", overflow: "hidden",
    }}>
      <SilhouetteStubs/>

      <div style={{
        position: "relative", zIndex: 1,
        maxWidth: 340, width: "100%",
        background: "var(--surface-1)",
        border: "1px solid var(--border-strong)",
        borderRadius: 16,
        padding: "26px 22px 22px",
        display: "flex", flexDirection: "column", gap: 18,
        boxShadow: "0 24px 48px -16px rgba(0,0,0,0.5), 0 0 0 1px color-mix(in oklch, var(--accent) 18%, transparent)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: "color-mix(in oklch, var(--accent) 16%, transparent)",
            border: "1px solid color-mix(in oklch, var(--accent) 50%, transparent)",
            color: "var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <HIconLock size={15}/>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
              letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--accent)",
            }}>Supporter · $2/mo</span>
            <span style={{ fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 18, letterSpacing: "-0.015em" }}>
              Keep the nights.
            </span>
          </div>
        </div>

        <p style={{
          margin: 0, fontSize: 13, lineHeight: 1.5,
          color: "var(--fg-muted)", letterSpacing: "-0.005em",
        }}>
          Every show you tap <strong style={{ color: "var(--fg)", fontWeight: 700 }}>I'm going!</strong> lands here after the date: same artist art, same dates, no work on your end. Supporters also get a calendar feed they can subscribe to.
        </p>

        <div style={{
          display: "flex", flexDirection: "column", gap: 10,
          padding: "12px 14px",
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: 10,
        }}>
          <PerkRow label="Concert history" detail="Every show you mark Going, kept forever."/>
          <PerkRow label="Calendar export" detail="iCal feed · Google · Apple."/>
          <PerkRow label="Passport card" detail="Year-end share. Spotify-Wrapped energy."/>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onUpgrade} style={{
            flex: 1,
            background: "var(--signal)", color: "var(--fg-on-accent)",
            border: "none", borderRadius: 8, padding: "12px 14px",
            fontFamily: "Inter, system-ui", fontSize: 13.5, fontWeight: 700,
            letterSpacing: "-0.005em", cursor: "pointer",
          }}>Become a Supporter</button>
          <button style={{
            background: "transparent", color: "var(--fg-muted)",
            border: "1px solid var(--border-strong)", borderRadius: 8, padding: "12px 14px",
            fontFamily: "Inter, system-ui", fontSize: 13, fontWeight: 600,
            letterSpacing: "-0.005em", cursor: "pointer",
          }}>What's in it</button>
        </div>

        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 500,
          letterSpacing: "0.04em", color: "var(--fg-subtle)", textAlign: "center",
        }}>
          Free tier keeps everything else. No paywalls in the way of seeing shows.
        </span>
      </div>
    </div>
  );
}

function PerkRow({ label, detail }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
      <span style={{
        width: 5, height: 5, borderRadius: 5, background: "var(--accent)",
        flexShrink: 0, transform: "translateY(-2px)",
      }}/>
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.005em" }}>{label}</span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5,
          color: "var(--fg-subtle)", letterSpacing: "0.02em",
        }}>{detail}</span>
      </div>
    </div>
  );
}

// ── Mobile route ─────────────────────────────────────────────
function HistoryRoute({
  shows = H_SHOWS,
  density = "cozy",
  locked = false,
  themeKey = "electric",
}) {
  const [tab, setTab] = rState("history");
  const stats = rMemo(() => h_stats(shows), [shows]);

  if (locked) {
    return (
      <div style={{
        width: "100%", height: "100%",
        background: "var(--bg)", color: "var(--fg)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <WatchingHistoryTabs active="history" onChange={setTab}/>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <HistoryLocked/>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "var(--bg)", color: "var(--fg)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <WatchingHistoryTabs active="history" onChange={setTab}/>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {shows.length === 0 ? (
          <HistoryEmpty/>
        ) : (
          <>
            <HistoryHeader stats={stats} range="all time"/>
            <div style={{ padding: "12px 16px 32px", display: "flex", flexDirection: "column", gap: 10 }}>
              <HistoryBuckets shows={shows} density={density}/>
              <div style={{ marginTop: 12 }}>
                <SaveCalendarRow count={shows.length}/>
              </div>
              <div style={{ marginTop: 8 }}>
                <PassportTeaser stats={stats} shows={shows}/>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Passport teaser (inline) ─────────────────────────────────
// A compact card inside the history list that opens the full PassportCard
// on tap. Keeps the keepsake-share affordance one tap away without
// hijacking the page. Decorative strip of 3 recent stamps on the right
// (clean alignment, no clipping).
function PassportTeaser({ stats, shows }) {
  const sampleArtists = (shows || [])
    .slice(0, 3)
    .map(s => s.artist);
  while (sampleArtists.length < 3) sampleArtists.push(`pp-${sampleArtists.length}`);
  return (
    <div style={{
      position: "relative", overflow: "hidden",
      border: "1px solid color-mix(in oklch, var(--accent) 35%, var(--border))",
      borderRadius: 14,
      background: "linear-gradient(135deg, color-mix(in oklch, var(--accent) 14%, var(--surface-1)) 0%, var(--surface-1) 70%)",
      padding: "16px 18px",
      display: "flex", alignItems: "center", gap: 14,
      cursor: "pointer",
    }}>
      <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, fontWeight: 700,
          letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--accent)",
        }}>Passport · 2026</span>
        <span style={{ fontFamily: "Inter, system-ui", fontSize: 15.5, fontWeight: 800, letterSpacing: "-0.015em", color: "var(--fg)" }}>
          Your stamp book.
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, fontWeight: 500,
          color: "var(--fg-muted)", letterSpacing: "0.02em",
        }}>
          {stats.nights} nights · {stats.venues} venues · {(stats.topGenre && stats.topGenre.name) || "—"}
        </span>
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }} aria-hidden="true">
        {sampleArtists.map((a, i) => (
          <StubStamp key={i} artist={a} size={32}/>
        ))}
      </div>
      <button style={{
        background: "var(--accent)", color: "var(--fg-on-accent)",
        border: "none", borderRadius: 8, padding: "10px 12px",
        fontFamily: "Inter, system-ui", fontSize: 12, fontWeight: 700,
        letterSpacing: "-0.005em", cursor: "pointer", flexShrink: 0,
        display: "inline-flex", alignItems: "center", gap: 6,
      }}>
        <HIconShare size={12}/>Share
      </button>
    </div>
  );
}

// ── Desktop TopNav (same as Watching's) ──────────────────────
// Top-level destination is **"My shows"** — the container for both the
// Watching list (price tracking) and History (Supporter keepsake). Renamed
// from the original "Watching" tab so the sub-tabs (Watching · History)
// don't repeat the parent label.
function HistoryTopNav({ active = "my-shows" }) {
  const tabs = [
    { key: "browse",   label: "Browse" },
    { key: "search",   label: "Search" },
    { key: "my-shows", label: "My shows" },
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
          <CCMark size={28}/>
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

// Desktop sub-tabs — tab bar lives under the page title rather than in the
// TopNav, so the global nav stays a single source of truth.
function DesktopSubTabs({ active = "history", onChange }) {
  const tabs = [
    { key: "watching", label: "Watching" },
    { key: "history",  label: "History", supporter: true },
  ];
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
      {tabs.map(t => {
        const a = t.key === active;
        return (
          <button key={t.key}
            onClick={() => onChange && onChange(t.key)}
            style={{
              all: "unset", cursor: "pointer",
              padding: "10px 16px", borderRadius: 9,
              fontFamily: "Inter, system-ui",
              fontWeight: a ? 700 : 500, fontSize: 13.5,
              letterSpacing: "-0.005em",
              color: a ? "var(--fg)" : "var(--fg-muted)",
              background: a ? "var(--surface-2)" : "transparent",
              border: `1px solid ${a ? "var(--border-strong)" : "transparent"}`,
              display: "inline-flex", alignItems: "center", gap: 8,
            }}>
            {t.label}
            {t.supporter && (
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, fontWeight: 700,
                letterSpacing: "0.16em", textTransform: "uppercase",
                color: "var(--accent)",
                border: "1px solid color-mix(in oklch, var(--accent) 45%, transparent)",
                padding: "1.5px 5px", borderRadius: 2,
              }}>+ Supporter</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Desktop route ────────────────────────────────────────────
function HistoryRouteDesktop({
  shows = H_SHOWS,
  density = "cozy",
  locked = false,
}) {
  const [tab, setTab] = rState("history");
  const stats = rMemo(() => h_stats(shows), [shows]);

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "var(--bg)", color: "var(--fg)",
      display: "flex", flexDirection: "column", overflow: "hidden",
      fontFamily: "Inter, system-ui",
    }}>
      <HistoryTopNav active="my-shows"/>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 32px 80px" }}>
          <DesktopSubTabs active="history" onChange={setTab}/>

          {locked ? (
            <div style={{
              position: "relative", borderRadius: 16, overflow: "hidden",
              border: "1px solid var(--border)",
              height: 560,
            }}>
              <HistoryLocked/>
            </div>
          ) : shows.length === 0 ? (
            <HistoryEmpty/>
          ) : (
            <>
              <DesktopHero stats={stats}/>
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 320px", gap: 32,
                alignItems: "start",
              }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <HistoryBuckets shows={shows} density={density}/>
                </div>
                <aside style={{
                  position: "sticky", top: 24,
                  display: "flex", flexDirection: "column", gap: 14,
                }}>
                  <SaveCalendarRow count={shows.length}/>
                  <PassportCard stats={stats} shows={shows} compact/>
                </aside>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Desktop hero (big numbers + small "since" line) ──────────
function DesktopHero({ stats }) {
  const since = stats.first
    ? new Date(stats.first.dateISO).toLocaleString("en-US", { month: "long", year: "numeric" })
    : null;
  return (
    <div style={{
      marginBottom: 28, paddingBottom: 24,
      borderBottom: "1px solid var(--border)",
      display: "flex", flexDirection: "column", gap: 18,
    }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
            letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fg-subtle)",
          }}>Your history</span>
          <h1 style={{
            margin: 0, fontFamily: "Inter, system-ui",
            fontSize: 36, fontWeight: 900, letterSpacing: "-0.025em", color: "var(--fg)",
          }}>Concert history</h1>
        </div>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
          letterSpacing: "0.16em", textTransform: "uppercase",
          color: "var(--accent)",
          border: "1px solid color-mix(in oklch, var(--accent) 45%, transparent)",
          padding: "4px 8px", borderRadius: 3,
        }}>+ Supporter</span>
      </div>
      <div style={{
        display: "grid", gridTemplateColumns: "auto 1px auto 1px auto 1fr",
        alignItems: "center", gap: 28,
      }}>
        <BigStat value={stats.nights} label={stats.nights === 1 ? "night" : "nights"}/>
        <div style={{ width: 1, height: 44, background: "var(--border)" }}/>
        <BigStat value={stats.venues} label={stats.venues === 1 ? "venue" : "venues"}/>
        <div style={{ width: 1, height: 44, background: "var(--border)" }}/>
        <BigStat
          value={stats.topGenre ? stats.topGenre.name : "—"}
          label={stats.topGenre ? `top genre · ${stats.topGenre.count}` : "top genre"}
        />
        <div style={{ justifySelf: "end" }}>
          {since && (
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600,
              letterSpacing: "0.04em", color: "var(--fg-muted)",
            }}>since {since}</span>
          )}
        </div>
      </div>
    </div>
  );
}
function BigStat({ value, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{
        fontFamily: "Inter, system-ui", fontSize: 38, fontWeight: 900,
        letterSpacing: "-0.025em", color: "var(--fg)",
        fontVariantNumeric: "tabular-nums", lineHeight: 1,
      }}>{value}</span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
        letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fg-subtle)",
      }}>{label}</span>
    </div>
  );
}

// ── PassportCard ─────────────────────────────────────────────
// The shareable summary card. Designed as a **stamp book**: a stat band at
// the top + a wall of per-show passport stamps below, where every stamp
// represents a real night you went to (artist · venue · date). The user
// asked specifically for "actual passport with stamps" — relive every
// show, not abstract decoration.
//
// Two scales:
//   compact = true  → 320×460 (in-app aside + bottom-sheet preview).
//   compact = false → 1080×1080 (share-ready square). The grid grows to
//                     accommodate up to ~30 stamps before paginating.
//
// API:
//   shows  — full history list, latest first. The fan/grid uses these.
//            Defaults to a synthesised set if absent (locked-state preview).
//   stats  — h_stats(shows) result. Stat band consumes this.
//   handle — @handle to print in footer. Defaults to "hugh".
function PassportCard({ shows, stats, compact = false, handle = "hugh" }) {
  // Inner is rendered at compact size, then transform-scaled for full.
  const innerW = compact ? 320 : 320;
  const innerH = compact ? 500 : 460;
  const outerW = compact ? 320 : 1080;
  const outerH = compact ? 500 : 1080;
  // For the full size, scale uniformly to fit the square. The inner
  // layout is 320×460 (portrait); for the 1080² share we lock to width
  // (1080/320 = 3.375) and center vertically with a darker frame above
  // and below — feels like a passport page rather than a stretched card.
  const scaleFull = 1080 / 320;
  const fullInnerH = innerH * scaleFull; // 1552 — taller than 1080
  // …so the share card actually grows the inner grid to fit. For now,
  // when not compact we render at the larger intrinsic size with more
  // rows of stamps surfaced.
  return (
    <div style={{
      width: outerW, height: outerH, overflow: "hidden",
      borderRadius: compact ? 16 : 28,
      background: "radial-gradient(ellipse at 70% 30%, #1F1538 0%, #08050F 78%)",
      color: "rgba(255,255,255,0.96)",
      fontFamily: "Inter, system-ui",
      position: "relative",
      boxShadow: compact ? "0 14px 36px -10px rgba(0,0,0,0.55)" : "none",
    }}>
      <PassportInner shows={shows || []} stats={stats} handle={handle} compact={compact}/>
    </div>
  );
}

// PassportInner does the heavy lifting. Layout (top → bottom):
//   1. Eyebrow ("Passport · 2026") + handle line
//   2. Stat band — 3 tiles (nights / venues / top genre)
//   3. Stamp wall — per-show stamps in a CSS grid, slight per-stamp
//      rotation + shadow so the page reads like a stamped passport, not
//      a tidy table. Stamps are clipped by the card edge — no overflow.
//   4. Footer — wordmark + small "+N more" tag if the wall overflows.
function PassportInner({ shows, stats, handle, compact }) {
  // Decide grid columns + max stamps based on card size.
  const cols = compact ? 3 : 4;
  const maxStamps = compact ? 9 : 16;
  const surfaced = shows.slice(0, maxStamps);
  const overflow = Math.max(0, shows.length - surfaced.length);

  return (
    <div style={{
      position: "absolute", inset: 0,
      padding: compact ? "20px 20px 18px" : "56px 56px 44px",
      display: "flex", flexDirection: "column", gap: compact ? 14 : 36,
      overflow: "hidden",
    }}>
      {/* paper washes — warm upper-right + cool lower-left, no animation
          here (this is a static keepsake, not a marketing hero) */}
      <div aria-hidden="true" style={{
        position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none",
      }}>
        <div style={{
          position: "absolute", right: -60, top: -80,
          width: compact ? 240 : 600, height: compact ? 240 : 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,184,56,0.22) 0%, transparent 65%)",
          mixBlendMode: "screen",
        }}/>
        <div style={{
          position: "absolute", left: -80, bottom: -100,
          width: compact ? 260 : 640, height: compact ? 260 : 640,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(122,230,255,0.20) 0%, transparent 65%)",
          mixBlendMode: "screen",
        }}/>
      </div>

      {/* eyebrow + handle */}
      <div style={{
        position: "relative",
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        gap: 12,
      }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: compact ? 10 : 22,
          fontWeight: 800,
          letterSpacing: "0.24em", textTransform: "uppercase",
          color: "rgba(255,255,255,0.92)",
          display: "inline-flex", alignItems: "center", gap: compact ? 6 : 14,
          whiteSpace: "nowrap",
        }}>
          <span style={{
            width: compact ? 6 : 14, height: compact ? 6 : 14, borderRadius: "50%",
            background: "#7AE6FF",
            boxShadow: "0 0 10px #7AE6FF",
          }}/>
          Passport · 2026
        </div>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: compact ? 9 : 18,
          fontWeight: 700,
          letterSpacing: "0.16em", textTransform: "uppercase",
          color: "rgba(255,255,255,0.55)",
        }}>@{handle}</span>
      </div>

      {/* stat band */}
      <div style={{
        position: "relative",
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        gap: compact ? 8 : 22,
      }}>
        <PassportStat value={stats ? stats.nights : 0} label="nights" accent="#7AE6FF" compact={compact}/>
        <PassportStat value={stats ? stats.venues : 0} label="venues" accent="#FFE36B" compact={compact}/>
        <PassportStat
          value={stats && stats.topGenre ? stats.topGenre.name : "—"}
          label="top genre" accent="#FF7BD4" small compact={compact}
        />
      </div>

      {/* stamp wall */}
      <div style={{
        position: "relative", flex: 1, minHeight: 0,
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridAutoRows: "1fr",
        gap: compact ? 6 : 22,
        alignContent: "start",
      }}>
        {surfaced.map((s, i) => (
          <PassportStamp key={s.id} show={s} idx={i} compact={compact}/>
        ))}
        {/* If we surfaced fewer stamps than the grid expects, fill remaining
            slots with quiet placeholders so the wall doesn't lopside. */}
        {Array.from({ length: Math.max(0, cols * (compact ? 3 : 4) - surfaced.length) }).map((_, i) => (
          <div key={`ph-${i}`} aria-hidden="true" style={{
            border: "1px dashed rgba(255,255,255,0.06)",
            borderRadius: 6,
          }}/>
        ))}
      </div>

      {/* footer — wordmark + overflow tag */}
      <div style={{
        position: "relative",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        paddingTop: compact ? 10 : 24,
        borderTop: "1px dashed rgba(255,255,255,0.18)",
      }}>
        {overflow > 0 ? (
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: compact ? 9.5 : 20,
            fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase",
            color: "rgba(255,255,255,0.55)",
            whiteSpace: "nowrap",
          }}>+ {overflow} more</span>
        ) : <span/>}
        <span style={{
          display: "inline-flex", alignItems: "center", gap: compact ? 6 : 14,
          fontFamily: "Inter, system-ui", fontWeight: 800,
          fontSize: compact ? 12 : 26,
          letterSpacing: "-0.02em", color: "rgba(255,255,255,0.95)",
        }}>
          <span style={{
            width: compact ? 14 : 30, height: compact ? 14 : 30, borderRadius: compact ? 3 : 7,
            background: "#7AE6FF", display: "inline-block",
          }}/>
          concert<span style={{ color: "#FF7BD4" }}>crawl.</span>
        </span>
      </div>
    </div>
  );
}

function PassportStat({ value, label, accent, small, compact }) {
  return (
    <div style={{
      padding: compact ? "10px 10px 8px" : "22px 22px 18px",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: compact ? 8 : 16,
      background: "rgba(255,255,255,0.04)",
      display: "flex", flexDirection: "column", gap: compact ? 4 : 8,
      minWidth: 0,
    }}>
      <span style={{
        fontFamily: "Inter, system-ui",
        fontSize: small ? (compact ? 14 : 30) : (compact ? 26 : 56),
        fontWeight: 900,
        letterSpacing: "-0.025em",
        color: accent || "rgba(255,255,255,0.95)",
        fontVariantNumeric: "tabular-nums",
        lineHeight: 1.05,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>{value}</span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: compact ? 8.5 : 16,
        fontWeight: 700, letterSpacing: "0.16em",
        textTransform: "uppercase", color: "rgba(255,255,255,0.55)",
      }}>{label}</span>
    </div>
  );
}

// ── PassportStamp ────────────────────────────────────────────
// A single passport stamp for one show. Looks like a circle/oval ink
// stamp, slightly off-square, with artist name + date + venue printed
// in. Slight per-stamp rotation so the page reads stamped, not aligned.
// Glyph is derived from the artist hash (same as row stub stamps), accent
// likewise. The stamp is *real* — every detail comes from the show, not
// from filler.
function PassportStamp({ show, idx = 0, compact = false }) {
  const accent = h_accentFor(show.artist);
  const glyph  = h_glyphFor(show.artist);
  // Deterministic small rotation per show id, so re-renders are stable.
  let h = 0;
  for (let i = 0; i < show.id.length; i++) h = ((h << 5) - h) + show.id.charCodeAt(i);
  const rot = ((h % 11) - 5) * 0.85; // ±~4°

  // Date label compressed to month + day, two lines on the stamp
  const d = new Date(show.dateISO);
  const month = d.toLocaleString("en-US", { month: "short", timeZone: "America/Denver" }).toUpperCase();
  const day   = d.getUTCDate();
  const year  = d.getUTCFullYear();

  // Stamp clipPath id MUST be unique per stamp instance — the same show
  // can be rendered in multiple cards on a page (compact teaser + full share),
  // so we scope by compact flag. Without this, the compact card's small
  // clip rect overrides the full card's, cropping out half of every stamp
  // that shares a show id.
  const clipId = `stamp-clip-${show.id}-${idx}-${compact ? "c" : "f"}`;
  const W = compact ? 100 : 280;
  const H = compact ? 92 : 170;
  const padOuter = compact ? 4 : 10;

  return (
    <div style={{
      transform: `rotate(${rot}deg)`,
      transformOrigin: "center center",
      filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.45))",
      width: "100%", height: "100%",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block" }}>
        <defs>
          <clipPath id={clipId}>
            <rect x={padOuter} y={padOuter} width={W - padOuter * 2} height={H - padOuter * 2} rx={compact ? 6 : 14}/>
          </clipPath>
        </defs>

        {/* Outer dashed border — like a postage rectangle */}
        <rect x={padOuter} y={padOuter} width={W - padOuter * 2} height={H - padOuter * 2}
          rx={compact ? 6 : 14}
          fill={`color-mix(in oklch, ${accent} 14%, #1A1228)`}
          stroke={accent} strokeOpacity="0.7"
          strokeWidth={compact ? 1 : 2.4}
          strokeDasharray={compact ? "2 2" : "5 5"}/>

        {/* Inner content area (clipped) */}
        <g clipPath={`url(#${clipId})`}>
          {/* Halftone-ish dot field, very subtle */}
          {!compact && [...Array(28)].map((_, i) => {
            const x = (i * 37) % (W - 20) + 12;
            const y = ((i * 73) % (H - 20)) + 12;
            return (
              <circle key={i} cx={x} cy={y} r="1.6"
                fill={accent} opacity={0.10}/>
            );
          })}

          {/* MONTH · DAY block (top-left, like a date stamp) */}
          <g transform={`translate(${compact ? 10 : 22}, ${compact ? 14 : 30})`}>
            <text x="0" y="0"
              fontFamily="'JetBrains Mono', monospace"
              fontWeight="800"
              fontSize={compact ? 9 : 16}
              letterSpacing={compact ? "1.6" : "3"}
              fill={accent}>{month}</text>
            <text x="0" y={compact ? 20 : 50}
              fontFamily="Inter, system-ui"
              fontWeight="900"
              fontSize={compact ? 22 : 52}
              letterSpacing="-0.04em"
              fill="rgba(255,255,255,0.95)">{day}</text>
            <text x="0" y={compact ? 32 : 72}
              fontFamily="'JetBrains Mono', monospace"
              fontWeight="700"
              fontSize={compact ? 7 : 12}
              letterSpacing={compact ? "1.2" : "2.2"}
              fill="rgba(255,255,255,0.55)">{year}</text>
          </g>

          {/* Artist + venue — right column (full mode) or lower-left (compact). */}
          <g transform={compact
              ? `translate(10, 64)`
              : `translate(110, 56)`}>
            <text x="0" y="0"
              fontFamily="Inter, system-ui"
              fontWeight="900"
              fontSize={compact ? 9.5 : 22}
              letterSpacing="-0.015em"
              fill="rgba(255,255,255,0.96)">
              {truncatedText(show.artist, compact ? 15 : 22)}
            </text>
            <text x="0" y={compact ? 14 : 28}
              fontFamily="'JetBrains Mono', monospace"
              fontWeight="600"
              fontSize={compact ? 7.5 : 13}
              letterSpacing={compact ? "0.04em" : "0.06em"}
              fill="rgba(255,255,255,0.55)">
              {truncatedText(show.venue, compact ? 17 : 22)}
            </text>
            {!compact && (
              <text x="0" y={56}
                fontFamily="'JetBrains Mono', monospace"
                fontWeight="700"
                fontSize={11}
                letterSpacing="0.18em"
                fill={accent} opacity="0.7">{(show.genre || "").toUpperCase()}</text>
            )}
          </g>

          {/* Glyph — compact: top-right corner; full: bottom-right large */}
          <g transform={compact
              ? `translate(${W - 20}, 14)`
              : `translate(${W - 60}, ${H - 50})`}>
            {glyph === "star" && (
              <polygon
                transform={`scale(${compact ? 0.42 : 1.6})`}
                points="12,2 14.35,8.76 21.51,8.91 15.8,13.24 17.88,20.09 12,16 6.12,20.09 8.2,13.24 2.49,8.91 9.65,8.76"
                fill={accent} opacity="0.95"/>
            )}
            {glyph === "diamond" && (
              <polygon transform={`scale(${compact ? 0.45 : 1.7})`}
                points="12,2 22,12 12,22 2,12" fill={accent} opacity="0.95"/>
            )}
            {glyph === "ring" && (
              <circle cx={compact ? 5 : 19} cy={compact ? 5 : 19}
                r={compact ? 4.4 : 17} fill="none" stroke={accent} strokeWidth={compact ? 1.6 : 4.5} opacity="0.95"/>
            )}
            {glyph === "triangle" && (
              <polygon transform={`scale(${compact ? 0.42 : 1.6})`}
                points="12,3 21,19 3,19" fill={accent} opacity="0.95"/>
            )}
          </g>
        </g>
      </svg>
    </div>
  );
}

function truncatedText(s, maxChars) {
  if (!s) return "";
  if (s.length <= maxChars) return s;
  return s.slice(0, maxChars - 1) + "…";
}

Object.assign(window, {
  HistoryRoute, HistoryRouteDesktop, HistoryLocked, HistoryEmpty,
  HistoryBuckets, HistoryTopNav, DesktopSubTabs, DesktopHero, BigStat,
  PassportCard, PassportTeaser, PassportInner, PassportStat, PassportStamp,
  SilhouetteStubs, PerkRow, CCMark,
});

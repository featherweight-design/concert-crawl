// rn-shells.jsx — host shells for the Release Notes canvas
//
//   <DesktopBrowseShell/>             desktop Browse with drop pill (bottom-right) + feedback edge tab (right edge)
//   <DesktopSpotlightShell/>          desktop Browse w/ Spotlight takeover modal open
//   <DesktopChangelogShell/>          desktop /changelog page in app shell
//   <MobileBrowseShell/>              phone w/ drop pill above tab bar + feedback edge tab on the right edge
//   <MobileSpotlightShell/>           phone w/ takeover modal full-screen
//   <MobileChangelogShell/>           phone /changelog route
//
// Browse mocks deliberately mirror browse-home.jsx visual shape (AppBar with
// CCMark + wordmark + search circle, "What's on?" + Denver eyebrow, list +
// cal toggle, filter chips, HeroCard + show rows) — they're host context for
// the new pills, not new design.

const { ThemeProvider: RN_TP } = window;
const { IOSDevice: RN_IOS } = window;
const { UMMark: RN_Mark, UMBody } = window;
const {
  RN_RELEASES,
  ReleasePage, UMStatusFooterRN,
  FeatureDropPill, SpotlightModal, RNEyebrow,
} = window;

const SPOTLIT = RN_RELEASES[0];

// ── Beta Feedback edge tab (mock) ─────────────────────────────
// The chosen entry point for the in-app feedback modal — vertical
// monospace tab pinned to the right edge. Modeled here so we can show
// the new drop pill alongside it in context. Earlier mock was a
// floating pill at bottom-right; that was rejected as too intrusive
// (see design_handoff_feedback_modal/README.md).
function BetaFeedbackEdgeTab({ variant = "desktop" }) {
  const isMobile = variant === "mobile";
  return (
    <button type="button" style={{
      all: "unset", cursor: "pointer",
      position: "absolute", right: 0, top: "44%",
      padding: isMobile ? "12px 6px" : "14px 7px",
      background: "var(--surface-1)",
      border: "1px solid var(--border-strong)",
      borderRight: "none",
      borderTopLeftRadius: 10, borderBottomLeftRadius: 10,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      color: "var(--fg)",
      zIndex: 4,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: 6,
        background: "var(--accent)",
        boxShadow: "0 0 6px var(--accent)",
      }}/>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: isMobile ? 10 : 11,
        fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase",
        color: "var(--fg)",
        writingMode: "vertical-rl",
        transform: "rotate(180deg)",
      }}>Tell us · beta</div>
    </button>
  );
}

// ── Desktop topbar — visually echoes browse-home AppBar ──────
function RNTopbar() {
  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, height: 60,
      background: "var(--bg-elevated)",
      borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center", padding: "0 22px", gap: 16,
      zIndex: 5,
    }}>
      <RN_Mark size={28}/>
      <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" }}>
        concert<span style={{ color: "var(--accent)" }}>crawl.</span>
      </span>
      <div style={{ flex: 1 }}/>
      <div style={{
        width: 280, height: 36, borderRadius: 999,
        border: "1px solid var(--border-strong)",
        background: "var(--surface-1)",
        display: "flex", alignItems: "center", padding: "0 14px", gap: 10,
        color: "var(--fg-subtle)",
        fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
        letterSpacing: "0.04em",
      }}>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="m11 11 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        SEARCH SHOWS, VENUES…
      </div>
      <button type="button" style={{
        all: "unset", cursor: "pointer",
        width: 38, height: 38, borderRadius: 19,
        border: "1.5px solid var(--border-strong)",
        background: "var(--surface-2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--fg)",
        fontWeight: 800, fontSize: 13,
      }}>H</button>
    </div>
  );
}

// ── Desktop browse page — matches browse-home list shape ─────
// "What's on?" + Denver eyebrow + list/cal toggle + filter chips + HeroCard
// + section heading + 3 show rows. Two columns on desktop so the page reads
// like the actual desktop browse layout (browse-desktop.jsx pattern).
function DesktopBrowseList() {
  return (
    <div style={{
      position: "absolute", inset: "60px 0 0 0",
      padding: "28px 36px 32px",
      overflow: "hidden",
    }}>
      {/* Title row */}
      <div style={{
        display: "flex", alignItems: "flex-end", justifyContent: "space-between",
        marginBottom: 14,
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{
            fontWeight: 900, fontSize: 36, letterSpacing: "-0.03em",
            color: "var(--fg)",
          }}>What's on?</span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
            color: "var(--fg-muted)", textTransform: "uppercase",
          }}>Denver, CO · Tonight</span>
        </div>
        <div style={{
          display: "flex", height: 34, borderRadius: 8, overflow: "hidden",
          border: "1px solid var(--border-strong)",
        }}>
          {["list", "cal"].map((v, i) => (
            <span key={v} style={{
              padding: "0 14px", display: "flex", alignItems: "center",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
              textTransform: "uppercase",
              background: i === 0 ? "var(--signal)" : "transparent",
              color: i === 0 ? "var(--fg-on-accent)" : "var(--fg-muted)",
            }}>{v}</span>
          ))}
        </div>
      </div>
      {/* Filter chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {["Tonight", "Any venue", "Any price", "Any genre"].map((c, i) => (
          <span key={c} style={{
            padding: "6px 11px", borderRadius: 999,
            border: `1px solid ${i === 0 ? "var(--signal)" : "var(--border-strong)"}`,
            background: i === 0 ? "var(--signal)" : "transparent",
            color: i === 0 ? "var(--fg-on-accent)" : "var(--fg-muted)",
            fontFamily: "Inter, system-ui",
            fontWeight: 600, fontSize: 11,
            display: "inline-flex", alignItems: "center", gap: 4,
          }}>{c}
            <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M2 4l3 3 3-3" stroke="currentColor"
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </span>
        ))}
      </div>
      {/* Two-col grid: hero + sidebar of show rows */}
      <div style={{
        display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 22,
      }}>
        <FakeHeroCard/>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <SectionHeading label="Later tonight" count="6 shows"/>
          <FakeShowRow artist="MITSKI" venue="OGDEN THEATRE" time="9:00" price="$45"/>
          <FakeShowRow artist="JUSTICE" venue="MISSION BALLROOM" time="10:00" price="$60"/>
          <FakeShowRow artist="BIG THIEF" venue="GOTHIC" time="8:30" price="$55"/>
          <FakeShowRow artist="CARIBOU" venue="BLUEBIRD" time="9:30" price="$38"/>
          <FakeShowRow artist="FOUR TET" venue="MEOW WOLF" time="11:00" price="$50"/>
        </div>
      </div>
    </div>
  );
}

function FakeHeroCard() {
  return (
    <div style={{
      borderRadius: 14, overflow: "hidden",
      background: "var(--surface-1)",
      border: "1px solid var(--border-strong)",
      position: "relative",
    }}>
      <div style={{
        height: 280,
        background: "linear-gradient(135deg, oklch(0.32 0.12 30), oklch(0.18 0.06 350))",
        position: "relative",
      }}>
        <div style={{
          position: "absolute", inset: 0, opacity: 0.18,
          backgroundImage: "repeating-linear-gradient(45deg, var(--accent) 0 2px, transparent 2px 12px)",
        }}/>
        <div style={{
          position: "absolute", top: 12, left: 12,
          padding: "3px 9px", borderRadius: 4,
          background: "var(--accent)", color: "var(--fg-on-accent)",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase",
        }}>★ Tonight's pick</div>
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.75) 100%)",
        }}/>
      </div>
      <div style={{ padding: "16px 18px 18px", marginTop: -56, position: "relative", color: "#fff" }}>
        <div style={{ fontWeight: 900, fontSize: 28, letterSpacing: "-0.02em" }}>GEESE</div>
        <div style={{ fontWeight: 500, fontSize: 13, opacity: 0.85, marginTop: 2 }}>
          3D Country tour
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, marginTop: 10,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          letterSpacing: "0.04em",
        }}>
          <span style={{ color: "var(--signal)" }}>HI-DIVE</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>8:00</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span style={{ color: "var(--signal)" }}>$30</span>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ label, count }) {
  return (
    <div style={{
      display: "flex", alignItems: "baseline", justifyContent: "space-between",
      padding: "0 0 10px",
      borderBottom: "1px solid var(--border)",
      marginBottom: 4,
    }}>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, fontWeight: 800, letterSpacing: "0.12em",
        color: "var(--fg-muted)", textTransform: "uppercase",
      }}>{label}</span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9, fontWeight: 700, letterSpacing: "0.10em",
        color: "var(--fg-subtle)", textTransform: "uppercase",
      }}>{count}</span>
    </div>
  );
}

function FakeShowRow({ artist, venue, time, price }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 0",
      borderBottom: "1px solid var(--border)",
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 8, flexShrink: 0,
        background: `linear-gradient(135deg, oklch(0.32 0.10 ${(artist.charCodeAt(0) * 13) % 360}), oklch(0.18 0.05 ${(artist.charCodeAt(0) * 13 + 60) % 360}))`,
        border: "1px solid var(--border-strong)",
      }}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.015em" }}>{artist}</div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: "var(--fg-muted)", marginTop: 3, letterSpacing: "0.06em",
        }}>
          <span style={{ color: "var(--signal)" }}>{venue}</span>
          <span style={{ opacity: 0.4 }}> · </span>
          <span>{time}</span>
        </div>
      </div>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
        color: "var(--signal)", fontWeight: 700, letterSpacing: "0.02em",
      }}>{price}</span>
    </div>
  );
}

// ── Desktop · drop pill (bottom-right) + feedback edge tab (right edge) ─────
function DesktopBrowseShell({ showFeedback = true, showDrop = true }) {
  return (
    <RN_TP theme="electric">
      <div style={{
        width: 1200, height: 740, position: "relative",
        background: "var(--bg)", color: "var(--fg)",
        fontFamily: "Inter, system-ui", overflow: "hidden",
      }}>
        <RNTopbar/>
        <DesktopBrowseList/>
        {showFeedback && <BetaFeedbackEdgeTab variant="desktop"/>}
        {showDrop && (
          <div style={{
            position: "absolute", right: 24, bottom: 24, zIndex: 10,
          }}>
            <FeatureDropPill release={SPOTLIT} onOpen={() => {}} onDismiss={() => {}}/>
          </div>
        )}
      </div>
    </RN_TP>
  );
}

// ── Desktop · takeover open ─────────────────────────────────
function DesktopSpotlightShell() {
  return (
    <RN_TP theme="electric">
      <div style={{
        width: 1200, height: 740, position: "relative",
        background: "var(--bg)", color: "var(--fg)",
        fontFamily: "Inter, system-ui", overflow: "hidden",
      }}>
        <RNTopbar/>
        <DesktopBrowseList/>
        <SpotlightModal release={SPOTLIT} onClose={() => {}} onCTA={() => {}}/>
      </div>
    </RN_TP>
  );
}

// ── Desktop · /changelog page ────────────────────────────────
function DesktopChangelogShell() {
  return (
    <RN_TP theme="electric">
      <div style={{
        width: 1200, height: 1420, position: "relative",
        background: "var(--bg)", color: "var(--fg)",
        fontFamily: "Inter, system-ui", overflow: "hidden",
      }}>
        <RNTopbar/>
        <div style={{ position: "absolute", inset: "60px 0 0 0", overflow: "hidden" }}>
          <ReleasePage releases={RN_RELEASES} onOpenSpotlight={() => {}}/>
        </div>
      </div>
    </RN_TP>
  );
}

// ── Mobile browse — matches browse-home AppBar + FilterBar + list ─
function MobileBrowse() {
  return (
    <div style={{
      width: "100%", height: "100%",
      background: "var(--bg)", color: "var(--fg)",
      position: "relative", overflow: "hidden",
      fontFamily: "Inter, system-ui",
    }}>
      {/* AppBar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "62px 16px 10px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <RN_Mark size={28}/>
          <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.02em" }}>
            concert<span style={{ color: "var(--accent)" }}>crawl.</span>
          </span>
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: 18,
          border: "1.5px solid var(--border-strong)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--fg-muted)",
        }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
      {/* FilterBar title + chips */}
      <div style={{ padding: "0 16px 12px" }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 10,
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontWeight: 800, fontSize: 24, letterSpacing: "-0.03em" }}>What's on?</span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
              color: "var(--fg-muted)", textTransform: "uppercase",
            }}>Denver, CO</span>
          </div>
          <div style={{
            display: "flex", height: 32, borderRadius: 8, overflow: "hidden",
            border: "1px solid var(--border-strong)",
          }}>
            {["list", "cal"].map((v, i) => (
              <span key={v} style={{
                padding: "0 12px", display: "flex", alignItems: "center",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                textTransform: "uppercase",
                background: i === 0 ? "var(--signal)" : "transparent",
                color: i === 0 ? "var(--fg-on-accent)" : "var(--fg-muted)",
              }}>{v}</span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["Tonight", "Any venue", "Any price", "Any genre"].map((c, i) => (
            <span key={c} style={{
              padding: "5px 10px", borderRadius: 999,
              border: `1px solid ${i === 0 ? "var(--signal)" : "var(--border-strong)"}`,
              background: i === 0 ? "var(--signal)" : "transparent",
              color: i === 0 ? "var(--fg-on-accent)" : "var(--fg-muted)",
              fontWeight: 600, fontSize: 11,
              display: "inline-flex", alignItems: "center", gap: 4,
            }}>{c}
              <svg width="9" height="9" viewBox="0 0 10 10">
                <path d="M2 4l3 3 3-3" stroke="currentColor"
                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </span>
          ))}
        </div>
      </div>
      {/* Hero card — full bleed within margins */}
      <div style={{ margin: "0 16px 14px", borderRadius: 12, overflow: "hidden",
        background: "var(--surface-1)", border: "1px solid var(--border-strong)" }}>
        <div style={{
          height: 200, position: "relative",
          background: "linear-gradient(135deg, oklch(0.32 0.12 30), oklch(0.18 0.06 350))",
        }}>
          <div style={{
            position: "absolute", inset: 0, opacity: 0.18,
            backgroundImage: "repeating-linear-gradient(45deg, var(--accent) 0 2px, transparent 2px 12px)",
          }}/>
          <div style={{
            position: "absolute", top: 10, left: 10,
            padding: "3px 8px", borderRadius: 4,
            background: "var(--accent)", color: "var(--fg-on-accent)",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
          }}>★ tonight's pick</div>
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.8) 100%)",
          }}/>
        </div>
        <div style={{ padding: "10px 14px 14px", marginTop: -52, position: "relative", color: "#fff" }}>
          <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-0.02em" }}>GEESE</div>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, marginTop: 8,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            letterSpacing: "0.04em",
          }}>
            <span style={{ color: "var(--signal)" }}>HI-DIVE</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>8:00</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span style={{ color: "var(--signal)" }}>$30</span>
          </div>
        </div>
      </div>
      {/* Section + a couple rows */}
      <div style={{ padding: "0 16px" }}>
        <SectionHeading label="Later tonight" count="6 shows"/>
        <FakeShowRow artist="MITSKI" venue="OGDEN THEATRE" time="9:00" price="$45"/>
        <FakeShowRow artist="JUSTICE" venue="MISSION BALLROOM" time="10:00" price="$60"/>
      </div>
    </div>
  );
}

function MobileBrowseShell({ showFeedback = true, showDrop = true }) {
  return (
    <RN_TP theme="electric">
      <RN_IOS width={402} height={874} dark={true}>
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
          <MobileBrowse/>
          <MobileTabBar/>
          {showFeedback && <BetaFeedbackEdgeTab variant="mobile"/>}
          {showDrop && (
            <div style={{
              position: "absolute", right: 14, bottom: 96,
              zIndex: 6,
            }}>
              <FeatureDropPill release={SPOTLIT} onOpen={() => {}} onDismiss={() => {}} variant="mobile"/>
            </div>
          )}
        </div>
      </RN_IOS>
    </RN_TP>
  );
}

function MobileSpotlightShell() {
  return (
    <RN_TP theme="electric">
      <RN_IOS width={402} height={874} dark={true}>
        <div style={{
          width: "100%", height: "100%",
          background: "var(--bg)", color: "var(--fg)",
          position: "relative", overflow: "hidden",
          fontFamily: "Inter, system-ui",
        }}>
          <SpotlightModal release={SPOTLIT} onClose={() => {}} onCTA={() => {}} variant="mobile"/>
        </div>
      </RN_IOS>
    </RN_TP>
  );
}

function MobileChangelogShell() {
  return (
    <RN_TP theme="electric">
      <RN_IOS width={402} height={874} dark={true}>
        <div style={{
          width: "100%", height: "100%",
          background: "var(--bg)", color: "var(--fg)",
          fontFamily: "Inter, system-ui",
          overflow: "hidden", position: "relative",
        }}>
          <div style={{
            position: "absolute", top: 50, left: 0, right: 0, height: 52,
            display: "flex", alignItems: "center", padding: "0 16px", gap: 10,
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-elevated)", zIndex: 4,
          }}>
            <button type="button" style={{
              all: "unset", cursor: "pointer",
              width: 32, height: 32, borderRadius: 8,
              border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--fg)",
            }}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M7.5 3l-3 3 3 3" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <RN_Mark size={22}/>
            <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: "-0.015em" }}>
              concert<span style={{ color: "var(--accent)" }}>crawl.</span>
            </span>
            <span style={{ flex: 1 }}/>
            <RNEyebrow color="var(--signal)">/changelog</RNEyebrow>
          </div>
          <div style={{
            position: "absolute", inset: "102px 0 0 0",
            overflowY: "auto",
          }}>
            <MobileChangelog/>
          </div>
        </div>
      </RN_IOS>
    </RN_TP>
  );
}

function MobileChangelog() {
  return (
    <div style={{ padding: "24px 24px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{
          width: 6, height: 6, borderRadius: 6,
          background: "var(--signal)",
          boxShadow: "0 0 6px var(--signal)",
          animation: "rnPulse 1.8s ease-in-out infinite",
        }}/>
        <RNEyebrow color="var(--signal)">Transmission log</RNEyebrow>
      </div>
      <h1 style={{
        fontSize: 32, fontWeight: 900,
        letterSpacing: "-0.03em",
        margin: "4px 0 8px",
        lineHeight: 1.05,
      }}>What we shipped.</h1>
      <p style={{
        fontSize: 13, color: "var(--fg-muted)",
        margin: "0 0 24px", lineHeight: 1.5,
      }}>Every push to beta lands here.</p>
      <div style={{ position: "relative" }}>
        <div style={{
          position: "absolute", left: 5, top: 8, bottom: 8, width: 1,
          background: "linear-gradient(to bottom, var(--border-strong), transparent 95%)",
        }}/>
        {RN_RELEASES.map((r, i) => (
          <window.ReleaseEntry key={r.version} release={r} isLatest={i === 0} onOpenSpotlight={() => {}}/>
        ))}
      </div>
    </div>
  );
}

function MobileTabBar() {
  return (
    <div style={{
      position: "absolute", left: 0, right: 0, bottom: 0,
      height: 82,
      background: "var(--bg-elevated)",
      borderTop: "1px solid var(--border)",
      display: "flex", alignItems: "flex-start", justifyContent: "space-around",
      padding: "10px 12px 0",
      zIndex: 5,
    }}>
      {["BROWSE","SEARCH","WATCHING","YOU"].map((t, i) => (
        <div key={t} style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6,
            background: i === 0 ? "var(--signal)" : "var(--surface-2)",
            opacity: i === 0 ? 1 : 0.6,
          }}/>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8, fontWeight: 800,
            letterSpacing: "0.10em",
            color: i === 0 ? "var(--signal)" : "var(--fg-subtle)",
          }}>{t}</span>
        </div>
      ))}
    </div>
  );
}

// ── User menu w/ updated footer (clicks → /changelog) ───────
function UserMenuWithFooterRN({ user, unread = true }) {
  return (
    <div style={{
      width: 300,
      background: "var(--bg-elevated)",
      border: "1px solid var(--border-strong)",
      borderRadius: 14,
      boxShadow: "0 24px 64px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.2)",
      overflow: "hidden",
      fontFamily: "Inter, system-ui",
      color: "var(--fg)",
      display: "flex", flexDirection: "column",
    }}>
      <UMBody user={user}/>
      <UMStatusFooterRN unread={unread} onClick={() => {}}/>
    </div>
  );
}

Object.assign(window, {
  DesktopBrowseShell, DesktopSpotlightShell, DesktopChangelogShell,
  MobileBrowseShell, MobileSpotlightShell, MobileChangelogShell,
  UserMenuWithFooterRN, BetaFeedbackEdgeTab,
});

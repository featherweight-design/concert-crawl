// feedback-entry-points.jsx — three explorations of how the feedback
// modal is reached. All three are omnipresent (the founder ask) — they
// differ in HOW visible they are and what extra signal they carry.
//
// Variant A — Floating accent pill (bottom-right)
//   The most-discoverable option. Always visible, hugs the bottom-right
//   above the home indicator. Doubles as a "BETA" status surface so it
//   doesn't feel like a marketing CTA.
//
// Variant B — Edge tab (right side rail)
//   Quietest option. A vertically-stacked monospace tab pinned to the
//   right edge — "BETA · TELL US." Reads as a typographic anchor, not
//   a button. Reaches every screen without competing with content.
//
// Variant C — Menu item + screenshot FAB combo
//   Closest to the onboarding promise: the Send Feedback row lives
//   inside the user menu (matches "the give feedback button stays in
//   the menu"). Adds a tiny shutter FAB that pre-attaches a screenshot
//   of THIS screen — fastest path for bug capture.
//
// Each variant renders a stripped-down browse-home scene as its host.

const EP_FBMark = window.FBMark;

// Local mini scene — same anatomy as PageBehindMock but full-fidelity.
function MiniBrowse({ variant = "A" }) {
  const showFAB     = variant === "A";
  const showEdge    = variant === "B";
  const showMenu    = variant === "C";
  const showShutter = variant === "C";

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui",
      display: "flex", flexDirection: "column",
      position: "relative", overflow: "hidden",
    }}>
      {/* top bar */}
      <div style={{
        flexShrink: 0,
        padding: "62px 16px 12px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <EP_FBMark size={26}/>
          <span style={{
            fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 17,
            color: "var(--fg)", letterSpacing: "-0.02em",
          }}>concert<span style={{ color: "var(--accent)" }}>crawl.</span></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 18,
            border: "1.5px solid var(--border-strong)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--fg-muted)",
          }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="m11 11 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <button type="button" style={{
            all: "unset",
            width: 36, height: 36, borderRadius: 18,
            border: "1.5px solid var(--border-strong)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--fg-muted)",
            cursor: "pointer",
            position: "relative",
          }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M2.5 14c.5-3 3-4.5 5.5-4.5s5 1.5 5.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {/* tiny dot to indicate menu has unread / feedback link */}
            {showMenu && (
              <span style={{
                position: "absolute", top: -2, right: -2,
                width: 9, height: 9, borderRadius: 5,
                background: "var(--accent)",
                border: "2px solid var(--bg)",
              }}/>
            )}
          </button>
        </div>
      </div>

      {/* What's on heading */}
      <div style={{ padding: "0 16px 10px" }}>
        <div style={{
          fontWeight: 800, fontSize: 24,
          color: "var(--fg)", letterSpacing: "-0.03em",
        }}>What's on?</div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: "var(--fg-muted)", letterSpacing: "0.06em",
          textTransform: "uppercase", marginTop: 2,
        }}>Denver, CO · Tonight</div>
      </div>

      {/* hero card */}
      <div style={{
        margin: "0 16px 12px",
        borderRadius: 12, overflow: "hidden",
        background: "var(--surface-1)",
        border: "1px solid var(--border-strong)",
        position: "relative",
      }}>
        <div style={{
          height: 150,
          background: `linear-gradient(135deg, oklch(0.30 0.10 280), oklch(0.18 0.05 320))`,
          position: "relative",
        }}>
          <div style={{
            position: "absolute", inset: 0, opacity: 0.16,
            backgroundImage: `repeating-linear-gradient(45deg, var(--accent) 0 2px, transparent 2px 10px)`,
          }}/>
          <div style={{
            position: "absolute", top: 10, left: 10,
            padding: "3px 8px", borderRadius: 4,
            background: "var(--accent)", color: "var(--fg-on-accent)",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
          }}>★ tonight's pick</div>
        </div>
        <div style={{ padding: "12px 14px 14px" }}>
          <div style={{
            fontWeight: 900, fontSize: 20, letterSpacing: "-0.02em",
            color: "var(--fg)", lineHeight: 1.1,
          }}>SLEEP TOKEN</div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: "var(--fg-muted)", marginTop: 6, letterSpacing: "0.04em",
          }}>
            <span style={{ color: "var(--signal)" }}>FILLMORE</span>
            <span style={{ opacity: 0.4 }}> · </span>
            <span>8:00 PM</span>
            <span style={{ opacity: 0.4 }}> · </span>
            <span style={{ color: "var(--signal)" }}>$58–$92</span>
          </div>
        </div>
      </div>

      {/* list rows */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        {[
          { name: "GEESE",          venue: "OGDEN",       time: "7:30",  price: "$32", hue: 80 },
          { name: "MITSKI",         venue: "MISSION",     time: "9:00",  price: "$74", hue: 320 },
          { name: "JUSTICE",        venue: "MEOW WOLF",   time: "10:30", price: "$45", hue: 180 },
          { name: "BIG THIEF",      venue: "GOTHIC",      time: "8:00",  price: "$28", hue: 220 },
        ].map((r, i) => (
          <div key={i} style={{
            margin: "0 16px 8px",
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 12px",
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: 10,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 8, flexShrink: 0,
              background: `linear-gradient(135deg, oklch(0.40 0.08 ${r.hue}), oklch(0.25 0.05 ${r.hue + 30}))`,
              border: "1px solid var(--border-strong)",
            }}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontWeight: 800, fontSize: 14, color: "var(--fg)",
                letterSpacing: "-0.01em",
              }}>{r.name}</div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                color: "var(--fg-muted)", letterSpacing: "0.04em",
                marginTop: 2,
              }}>
                <span style={{ color: "var(--signal)" }}>{r.venue}</span>
                <span style={{ opacity: 0.4 }}> · </span>
                <span>{r.time}</span>
              </div>
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              color: "var(--signal)", fontWeight: 700,
            }}>{r.price}</div>
          </div>
        ))}
      </div>

      {/* ─── A: Floating accent pill ──────────────────────────── */}
      {showFAB && (
        <button type="button" style={{
          all: "unset", cursor: "pointer",
          position: "absolute", right: 16, bottom: 28,
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "10px 14px",
          background: "var(--accent)",
          color: "var(--fg-on-accent)",
          borderRadius: 999,
          boxShadow: "0 16px 40px -10px var(--accent), 0 6px 12px rgba(0,0,0,0.3)",
          border: "1px solid rgba(255,255,255,0.12)",
          fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 13,
          letterSpacing: "-0.005em",
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: 6,
            background: "var(--fg-on-accent)",
            opacity: 0.85,
          }}/>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
            opacity: 0.78,
          }}>BETA</span>
          <span>Tell us</span>
        </button>
      )}

      {/* ─── B: Edge tab (right side rail) ───────────────────── */}
      {showEdge && (
        <button type="button" style={{
          all: "unset", cursor: "pointer",
          position: "absolute", right: 0, top: "44%",
          padding: "12px 6px",
          background: "var(--surface-1)",
          border: "1px solid var(--border-strong)",
          borderRight: "none",
          borderTopLeftRadius: 10, borderBottomLeftRadius: 10,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          color: "var(--fg)",
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: 6,
            background: "var(--accent)",
            boxShadow: "0 0 6px var(--accent)",
          }}/>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase",
            color: "var(--fg)",
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
          }}>Tell us · beta</div>
        </button>
      )}

      {/* ─── C: Menu (open) + screenshot FAB ─────────────────── */}
      {showMenu && (
        <>
          {/* Open user menu, anchored top-right */}
          <div style={{
            position: "absolute", top: 110, right: 12,
            width: 240,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-strong)",
            borderRadius: 12,
            boxShadow: "0 18px 48px rgba(0,0,0,0.4)",
            overflow: "hidden",
            zIndex: 20,
          }}>
            <div style={{
              padding: "12px 14px",
              borderBottom: "1px solid var(--border)",
            }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
                color: "var(--fg-subtle)",
              }}>Signed in</div>
              <div style={{
                fontFamily: "Inter, system-ui", fontSize: 13, fontWeight: 700,
                color: "var(--fg)", marginTop: 2, letterSpacing: "-0.005em",
              }}>you@example.com</div>
            </div>
            {[
              { label: "Watching",        meta: "3" },
              { label: "Submitted prices", meta: "2" },
              { label: "Settings",        meta: null },
            ].map((row, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center",
                padding: "11px 14px",
                borderBottom: "1px solid var(--border)",
                color: "var(--fg)",
              }}>
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.005em" }}>{row.label}</span>
                {row.meta && <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                  color: "var(--fg-subtle)", letterSpacing: "0.06em",
                }}>{row.meta}</span>}
              </div>
            ))}
            {/* The feedback row — highlighted with accent dot */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "13px 14px",
              background: "rgba(255,123,212,0.06)",
              borderBottom: "1px solid var(--border)",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: 6,
                background: "var(--accent)",
                boxShadow: "0 0 6px var(--accent)",
              }}/>
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.005em" }}>Send feedback</span>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
                color: "var(--accent)",
              }}>BETA</span>
            </div>
            <div style={{
              padding: "11px 14px",
              fontSize: 13, fontWeight: 600,
              color: "var(--fg-muted)", letterSpacing: "-0.005em",
            }}>Sign out</div>
          </div>

          {/* Quick-shutter FAB — pre-attaches screenshot */}
          {showShutter && (
            <button type="button" style={{
              all: "unset", cursor: "pointer",
              position: "absolute", right: 16, bottom: 28,
              width: 48, height: 48, borderRadius: 24,
              background: "var(--surface-2)",
              border: "1px solid var(--border-strong)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--signal)",
              boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
              position: "absolute",
            }}>
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="3.5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                <circle cx="8" cy="8" r="2.4" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M5.5 3.5l1-1.2h3l1 1.2" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                <circle cx="11.5" cy="5.5" r="0.7" fill="currentColor"/>
              </svg>
              <span style={{
                position: "absolute", top: -4, right: -4,
                padding: "1px 6px", borderRadius: 999,
                background: "var(--accent)",
                color: "var(--fg-on-accent)",
                fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
                fontWeight: 800, letterSpacing: "0.10em",
                border: "2px solid var(--bg)",
              }}>FB</span>
            </button>
          )}
        </>
      )}
    </div>
  );
}

window.MiniBrowse = MiniBrowse;

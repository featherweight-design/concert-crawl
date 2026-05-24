// landing-screens-v2.jsx — landing-page screens wired up with the new
// IdentityArt-backed LandingPoster + animation. Mobile + desktop.
//
// Intentionally trimmed compared to landing-screens.jsx: this handoff is
// scoped to the poster + animation redesign, so we drop the waitlist modal,
// vibes grid, and footer details — they aren't being redesigned here.  The
// final wire-in just swaps the poster component, then folds back in the
// pieces that already exist.

const ccTokenVarsLP = window.ccTokenVars;

function LPClusterMark({ size = 26, color = "currentColor" }) {
  const trail = [
    { x: 14, y: 76, r: 1.5 }, { x: 24, y: 70, r: 2 },
    { x: 34, y: 64, r: 2.5 }, { x: 42, y: 58, r: 3 },
    { x: 50, y: 50, r: 4 }, { x: 58, y: 42, r: 5 },
    { x: 66, y: 32, r: 6 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ display: "block" }}>
      <circle cx="72" cy="24" r="20" fill={color} opacity="0.18" />
      <circle cx="72" cy="24" r="12" fill={color} opacity="0.36" />
      <circle cx="72" cy="24" r="7"  fill={color} />
      {trail.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r}
          fill={color} opacity={0.35 + i * 0.09} />
      ))}
    </svg>
  );
}

function LPWordmark({ size = 22, color = "var(--fg)", accent = "var(--accent)" }) {
  return (
    <span style={{
      fontFamily: "Inter, system-ui",
      fontWeight: 900, fontSize: size, letterSpacing: "-0.025em",
      color, lineHeight: 1,
    }}>
      concert<span style={{ color: accent }}>crawl.</span>
    </span>
  );
}

function LPBetaPill() {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "5px 10px", borderRadius: 999,
      background: "var(--surface-2)",
      border: "1px solid var(--border-strong)",
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10, fontWeight: 700,
      color: "var(--fg-muted)", letterSpacing: "0.14em",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: 3,
        background: "var(--signal)",
        boxShadow: "0 0 8px var(--signal)",
      }} />
      Private Beta
    </span>
  );
}

function LPPrimaryCTA({ children, fullWidth = false }) {
  return (
    <button style={{
      all: "unset", cursor: "pointer", textAlign: "center",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      gap: 8, height: 52, padding: "0 22px",
      width: fullWidth ? "100%" : "auto",
      maxWidth: "100%", minWidth: 0, boxSizing: "border-box",
      background: "var(--signal)",
      color: "var(--fg-on-accent)",
      borderRadius: 10,
      fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 16,
      letterSpacing: "-0.01em",
      whiteSpace: "nowrap",
      boxShadow: "0 12px 32px -12px var(--signal)",
    }}>{children}</button>
  );
}

function LPSecondaryCTA({ children, fullWidth = false }) {
  return (
    <button style={{
      all: "unset", cursor: "pointer", textAlign: "center",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      gap: 8, height: 52, padding: "0 22px",
      width: fullWidth ? "100%" : "auto",
      maxWidth: "100%", minWidth: 0, boxSizing: "border-box",
      background: "transparent",
      color: "var(--fg)",
      border: "1px solid var(--border-strong)",
      borderRadius: 10,
      fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 15,
      letterSpacing: "-0.005em",
      whiteSpace: "nowrap",
    }}>{children}</button>
  );
}

// ──────────────────────────────────────────────────────────────────
// MOBILE  (393×852)
// ──────────────────────────────────────────────────────────────────
function LandingMobileV2({ theme = "electric", animationMode = "stack" }) {
  const shows = window.LP_EVENTS || [];
  return (
    <div style={{
      ...ccTokenVarsLP(theme),
      width: "100%", height: "100%",
      background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui",
      display: "flex", flexDirection: "column",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        flexShrink: 0,
        padding: "20px 22px 0",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 8, minWidth: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <LPClusterMark size={26} color="var(--signal)" />
          <LPWordmark size={20} />
        </div>
        <LPBetaPill />
      </div>

      <div style={{
        flex: 1, overflowY: "auto",
        padding: "20px 22px 28px",
        display: "flex", flexDirection: "column", gap: 22,
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h1 style={{
            margin: 0,
            fontFamily: "Inter, system-ui", fontWeight: 900, fontSize: 40,
            letterSpacing: "-0.035em", lineHeight: 0.95,
            textWrap: "balance",
          }}>
            See who's<br/>playing<br/>
            <span style={{ color: "var(--accent)" }}>tonight.</span>
          </h1>
          <p style={{
            margin: 0,
            fontFamily: "Inter, system-ui", fontSize: 15, fontWeight: 500,
            color: "var(--fg-muted)", lineHeight: 1.4,
            textWrap: "pretty",
          }}>
            Every show in Denver, in one place — sorted, savable, shareable.
            Built by fans, not algorithms.
          </p>
        </div>

        {/* Poster animation — flexShrink:0 so the body column scrolls past it
            instead of squashing the stage and pushing the cards into the CTAs. */}
        <div style={{
          flexShrink: 0,
          display: "flex", justifyContent: "center",
          padding: animationMode === "wall" ? "0" : "4px 0 4px",
          minHeight: 0,
        }}>
          {animationMode === "wall" ? (
            <window.LandingPosterAnimation
              mode="wall"
              shows={shows}
              width={210}
              height={Math.round(210 * 1.38)}
              intervalMs={6000}
            />
          ) : animationMode === "ticker" ? (
            <window.LandingPosterAnimation
              mode="ticker"
              shows={shows}
              width={210}
              height={Math.round(210 * 1.38)}
              intervalMs={5200}
            />
          ) : (
            <window.LandingPosterAnimation
              mode="stack"
              shows={shows}
              width={270}
              height={Math.round(270 * 1.38)}
              intervalMs={5200}
            />
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <LPPrimaryCTA fullWidth>I have a code →</LPPrimaryCTA>
          <LPSecondaryCTA fullWidth>Join the waitlist</LPSecondaryCTA>
        </div>

        <div style={{
          marginTop: 6, paddingTop: 16, borderTop: "1px solid var(--border)",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: "var(--fg-subtle)", letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}>
          Denver pilot · more cities later
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// DESKTOP  (≥1280px)
// ──────────────────────────────────────────────────────────────────
function LandingDesktopV2({ theme = "electric", animationMode = "stack" }) {
  const shows = window.LP_EVENTS || [];
  return (
    <div style={{
      ...ccTokenVarsLP(theme),
      width: "100%", height: "100%",
      background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui",
      display: "flex", flexDirection: "column",
      position: "relative", overflow: "hidden",
    }}>
      <header style={{
        flexShrink: 0,
        padding: "22px 48px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LPClusterMark size={32} color="var(--signal)" />
          <LPWordmark size={22} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <LPBetaPill />
          <button style={{
            all: "unset", cursor: "pointer",
            padding: "8px 14px", borderRadius: 8,
            border: "1px solid var(--border-strong)",
            fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 13,
            color: "var(--fg)", letterSpacing: "-0.005em",
            whiteSpace: "nowrap",
          }}>I have a code →</button>
        </div>
      </header>

      <main style={{
        flex: 1, overflowY: "auto", minHeight: 0,
        padding: "32px 48px 64px",
      }}>
        <div style={{ maxWidth: 1320, margin: "0 auto", width: "100%" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 0.9fr",
            gap: 56, alignItems: "center",
            minHeight: 600,
          }}>
            {/* Left: pitch + CTAs */}
            <div style={{ display: "flex", flexDirection: "column", gap: 28, minWidth: 0 }}>
              <h1 style={{
                margin: 0,
                fontFamily: "Inter, system-ui", fontWeight: 900,
                fontSize: 84, letterSpacing: "-0.04em", lineHeight: 0.92,
                textWrap: "balance",
              }}>
                See who's<br/>playing in Denver<br/>
                <span style={{ color: "var(--accent)" }}>tonight.</span>
              </h1>
              <p style={{
                margin: 0,
                fontFamily: "Inter, system-ui", fontSize: 19, fontWeight: 500,
                color: "var(--fg-muted)", letterSpacing: "-0.005em",
                lineHeight: 1.45, maxWidth: "44ch",
                textWrap: "pretty",
              }}>
                Every show worth knowing about — sorted, savable, shareable.
                Built by fans, not algorithms. Currently in invite-only beta.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", minWidth: 0 }}>
                <LPPrimaryCTA>I have a code →</LPPrimaryCTA>
                <LPSecondaryCTA>Join the waitlist</LPSecondaryCTA>
              </div>
            </div>

            {/* Right: poster animation — flexShrink:0 for the same reason as mobile */}
            <div style={{
              flexShrink: 0,
              display: "flex", justifyContent: "center", alignItems: "center",
              minWidth: 0,
            }}>
              {animationMode === "wall" ? (
                <window.LandingPosterAnimation
                  mode="wall" shows={shows}
                  width={340} height={Math.round(340 * 1.38)}
                  intervalMs={7000}
                />
              ) : animationMode === "ticker" ? (
                <window.LandingPosterAnimation
                  mode="ticker" shows={shows}
                  width={320} height={Math.round(320 * 1.38)}
                  intervalMs={6000}
                />
              ) : (
                <window.LandingPosterAnimation
                  mode="stack" shows={shows}
                  width={380} height={Math.round(380 * 1.38)}
                  intervalMs={5200}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

window.LandingMobileV2 = LandingMobileV2;
window.LandingDesktopV2 = LandingDesktopV2;

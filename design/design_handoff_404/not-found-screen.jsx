// not-found-screen.jsx — Concert Crawl · /404 route
//
// Full-bleed 404. No app chrome (no AppBar, no FilterBar, no bottom nav)
// because this is the catch-all route — we don't want to imply the user
// is still inside a normal page shell. The brand presence comes from the
// IdentityArt block and the wordmark, both of which carry our voice.
//
// Anatomy is the same on mobile and desktop, just rearranged:
//   • IdentityArt anchor (poster) — full-bleed, IdentityArt(name="404")
//   • Mono status rail — • ROUTE NOT FOUND ─── 404
//   • Headline — "That show doesn't exist."
//   • Body — 1-line plain English explanation
//   • Primary CTA — "Browse tonight's shows →"
//   • Mono footer — the attempted path, monospace, low-key
//
// Mobile is single column (art on top); desktop is two-column (art left,
// content right). The split point is 768px in production — handoff sizes
// here are 393 (mobile) and 1280 (desktop).
//
// Props
//   posterName    — string fed to IdentityArt for the deterministic poster.
//                   Default "404". Engineers can pass other strings to
//                   rotate (e.g. mount-time pick from a curated list).
//   attemptedPath — string shown in the mono footer. Default "/".
//   themeKey      — passthrough so canvas artboards can theme independently.
//   onBrowse      — primary-CTA handler. Default href to "/".

// ── Flavors ─────────────────────────────────────────────────────────
// The same anatomy ships in three flavors. `show` is the brand-locked
// catch-all (default) — leans hard into the gig-poster metaphor. `generic`
// and `display` are quieter variants for cases where the show metaphor is
// too on-the-nose (e.g. legal pages, marketing routes, settings deep-links).
//
// Pick at the route level — do not mix flavors on the same route.
const NF_FLAVORS = {
  show: {
    eyebrow:  "Route not found",
    headline: "That show doesn't exist.",
    body:     "Wrong night, wrong URL, or it got pulled. Either way — Denver's got plenty going on tonight.",
    posterMeta: true,   // gig-poster faux-meta on the IdentityArt block
    stamp: "404",       // chunky 404 on the poster
    displayHeadline: false,
  },
  generic: {
    eyebrow:  "Page not found",
    headline: "Page not found.",
    body:     "That URL doesn't lead anywhere we know about. Let's get you back to tonight's shows.",
    posterMeta: false,
    stamp: "404",
    displayHeadline: false,
  },
  display: {
    eyebrow:  "Page not found",
    headline: "404.",
    body:     "That URL doesn't lead anywhere we know about. Back to Browse?",
    posterMeta: false,
    stamp: "none",       // headline carries the number; poster stays clean
    displayHeadline: true,
  },
};

// ── Brand mark — copy of CCMark from browse-home.jsx ────────────────
// Source of truth: browse-home.jsx → function CCMark.
// Per CLAUDE.md: never invent a placeholder logo. This is a verbatim copy.
function NFCCMark({ size = 28 }) {
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

function NFWordmark({ size = 17 }) {
  return (
    <span style={{
      fontFamily: "Inter, system-ui",
      fontWeight: 800, fontSize: size,
      color: "var(--fg)", letterSpacing: "-0.02em",
      lineHeight: 1,
    }}>
      concert<span style={{ color: "var(--accent)" }}>crawl.</span>
    </span>
  );
}

// ── 404 stamp that replaces IdentityArt's built-in initials chip ─────
// Same anchor point (bottom-left), same chunky letterform, same backplate
// pattern — so swapping initials → "404" reads as "this poster's identity
// is the missing route itself". On dark papers (Electric/Jade default art)
// the chip is dark/translucent + white text; on light papers it inverts.
function NF404Stamp({ scale = "hero", paperIsDark }) {
  const chipBg = paperIsDark ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.82)";
  const chipFg = paperIsDark ? "#FFFFFF" : "#15131A";
  const big = scale === "hero";
  return (
    <div style={{
      position: "absolute",
      left: big ? 16 : 12, bottom: big ? 16 : 12,
      padding: big ? "8px 14px" : "4px 10px",
      borderRadius: big ? 12 : 8,
      background: chipBg,
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      fontFamily: "Inter, system-ui",
      fontWeight: 900,
      fontSize: big ? 52 : 26,
      letterSpacing: "-0.045em",
      lineHeight: 1,
      color: chipFg,
      pointerEvents: "none",
    }}>404</div>
  );
}

// ── Poster block — IdentityArt + 404 stamp + venue/date faux-metadata ─
// The faux-metadata is intentional: it makes the poster feel like a real
// gig poster that didn't survive. Each line is on-brand mono.
function NFPoster({ posterName = "404", scale = "hero", flavor = "show" }) {
  const f = NF_FLAVORS[flavor] || NF_FLAVORS.show;
  const identity = window.identityFor(posterName, "artist");
  const paperIsDark = window.ia_isDark(identity.palette.bg);
  const inkOnPaper = paperIsDark ? "rgba(255,255,255,0.78)" : "rgba(21,19,24,0.72)";
  const subInk     = paperIsDark ? "rgba(255,255,255,0.48)" : "rgba(21,19,24,0.45)";

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      <window.IdentityArt
        name={posterName}
        kind="artist"
        scale={scale}
        showInitials={false}
        grain={0.10}
        width="100%"
        height="100%"
      />
      {/* Top-left mono eyebrow — gig-poster city line on `show`, generic
         brand line on the rest so the metaphor reads quieter. */}
      <div style={{
        position: "absolute", top: 16, left: 16,
        display: "flex", alignItems: "center", gap: 8,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, fontWeight: 700,
        letterSpacing: "0.16em", textTransform: "uppercase",
        color: inkOnPaper, pointerEvents: "none", zIndex: 2,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: 6,
          background: paperIsDark ? "#FFFFFF" : "#15131A", opacity: 0.7,
        }}/>
        {f.posterMeta ? "Denver · 404" : "concertcrawl"}
      </div>
      {/* Top-right state pill — only on `show` flavor. "Cancelled" closes
         the gig-poster metaphor; generic + display flavors are pill-free. */}
      {f.posterMeta && (
        <div style={{
          position: "absolute", top: 14, right: 14,
          padding: "4px 9px",
          borderRadius: 999,
          background: paperIsDark ? "rgba(0,0,0,0.42)" : "rgba(255,255,255,0.78)",
          backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9.5, fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: paperIsDark ? "#FFFFFF" : "#15131A",
          pointerEvents: "none", zIndex: 2,
        }}>Cancelled</div>
      )}
      {/* Bottom-left 404 stamp — dropped on `display` flavor (the giant
         headline carries the number; stamp would be redundant). */}
      {f.stamp === "404" && <NF404Stamp scale={scale} paperIsDark={paperIsDark}/>}
      {/* Bottom-right faux date — only on `show` flavor */}
      {f.posterMeta && (
        <div style={{
          position: "absolute", bottom: 18, right: 16,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, fontWeight: 700,
          letterSpacing: "0.06em", textTransform: "uppercase",
          color: subInk, pointerEvents: "none", zIndex: 2,
          textDecoration: "line-through",
          textDecorationThickness: 1.4,
        }}>tonight · 8pm</div>
      )}
    </div>
  );
}

// ── Status rail · mono code line above the headline ────────────────
// Anatomy borrowed from <EmptyState variant="hybrid"> so the 404 reads as
// "the empty state for the URL bar." Same shape, route-not-found tone.
function NFStatusRail({ dense = false, eyebrow = "Route not found" }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%",
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: 6, background: "var(--accent)", flexShrink: 0,
      }}/>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: dense ? 9.5 : 10.5, color: "var(--accent)",
        letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700,
        whiteSpace: "nowrap",
      }}>{eyebrow}</div>
      <div style={{ flex: 1, height: 1, background: "var(--border)" }}/>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: dense ? 9.5 : 10.5, color: "var(--fg-subtle)",
        letterSpacing: "0.14em", textTransform: "uppercase",
      }}>404</div>
    </div>
  );
}

// ── Headline + body + CTA stack ────────────────────────────────────
function NFContent({ chrome, attemptedPath = "/", flavor = "show", onBrowse }) {
  const isDesktop = chrome === "desktop";
  const f = NF_FLAVORS[flavor] || NF_FLAVORS.show;
  // `display` flavor pushes the headline larger; the number IS the design.
  const headlineSize = f.displayHeadline
    ? (isDesktop ? 132 : 96)
    : (isDesktop ? 56 : 38);
  const headlineTracking = f.displayHeadline ? "-0.05em" : (isDesktop ? "-0.04em" : "-0.035em");
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      gap: isDesktop ? 22 : 18,
      width: "100%", maxWidth: isDesktop ? 520 : "100%",
      fontFamily: "Inter, system-ui", color: "var(--fg)",
    }}>
      <NFStatusRail eyebrow={f.eyebrow}/>

      <div style={{ display: "flex", flexDirection: "column", gap: isDesktop ? 12 : 10 }}>
        <h1 style={{
          margin: 0,
          fontFamily: "Inter, system-ui",
          fontSize: headlineSize,
          fontWeight: 900,
          letterSpacing: headlineTracking,
          lineHeight: f.displayHeadline ? 0.88 : 1.0,
          color: "var(--fg)",
          textWrap: "balance",
        }}>{f.headline}</h1>
        <p style={{
          margin: 0,
          fontSize: isDesktop ? 16 : 14.5,
          fontWeight: 500,
          lineHeight: 1.55,
          letterSpacing: "-0.005em",
          color: "var(--fg-muted)",
          textWrap: "pretty",
          maxWidth: 440,
        }}>{f.body}</p>
      </div>

      {/* Primary CTA — full-width on mobile, intrinsic on desktop */}
      <div style={{
        display: "flex", flexDirection: isDesktop ? "row" : "column",
        alignItems: isDesktop ? "center" : "stretch",
        gap: isDesktop ? 14 : 10,
        marginTop: isDesktop ? 4 : 2,
      }}>
        <a
          href="/"
          onClick={onBrowse}
          style={{
            all: "unset", cursor: "pointer", textAlign: "center",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            gap: 8,
            height: isDesktop ? 52 : 48,
            padding: isDesktop ? "0 28px" : "0 24px",
            borderRadius: 999,
            background: "var(--signal)",
            color: "var(--fg-on-accent)",
            fontFamily: "Inter, system-ui",
            fontSize: isDesktop ? 15 : 14.5,
            fontWeight: 800,
            letterSpacing: "-0.01em",
            whiteSpace: "nowrap",
            width: isDesktop ? "auto" : "100%",
          }}>
          Browse tonight's shows
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M3 7h8m-3-3 3 3-3 3" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      </div>

      {/* Mono footer — the attempted path. Reads as a server log line. */}
      <div style={{
        marginTop: isDesktop ? 8 : 6,
        display: "flex", flexDirection: "column", gap: 6,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11.5, fontWeight: 500,
        color: "var(--fg-subtle)",
        letterSpacing: "0.01em",
        wordBreak: "break-all",
      }}>
        <div style={{
          fontSize: 9.5, fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: "var(--fg-subtle)",
        }}>You tried</div>
        <div style={{ color: "var(--fg-muted)" }}>
          <span style={{ opacity: 0.55, marginRight: 6 }}>↳</span>
          concertcrawl.app{attemptedPath}
        </div>
      </div>
    </div>
  );
}

// ── Page header — wordmark + lockup. Same as AppBar lockup. ─────────
function NFHeader({ chrome }) {
  const isDesktop = chrome === "desktop";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 9,
      paddingTop: isDesktop ? 0 : 0,
    }}>
      <NFCCMark size={isDesktop ? 32 : 28}/>
      <NFWordmark size={isDesktop ? 19 : 17}/>
    </div>
  );
}

// ── NotFoundScreen · mobile ─────────────────────────────────────────
function NotFoundScreenMobile({ posterName = "404", attemptedPath = "/", themeKey, flavor = "show" }) {
  return (
    <window.ThemeProvider theme={themeKey} style={{
      width: "100%", height: "100%",
      background: "var(--bg)", color: "var(--fg)",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Poster anchor — full-bleed, ~52% of the viewport on mobile.
          Includes the wordmark overlaid in the top-left so the brand
          is present even though the rest of the chrome is stripped. */}
      <div style={{ position: "relative", width: "100%", height: 444, flexShrink: 0 }}>
        <NFPoster posterName={posterName} scale="hero" flavor={flavor}/>
        {/* Wordmark sits on top of the poster, top-left. The poster's
           own city-eyebrow is positioned slightly lower (top: 16) — we
           layer the wordmark at top: 56 (below iOS status bar inset). */}
        <div style={{
          position: "absolute", top: 60, left: 16, zIndex: 3,
          padding: "6px 10px",
          borderRadius: 8,
          background: "var(--scrim)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          display: "inline-flex",
        }}>
          <NFHeader chrome="mobile"/>
        </div>
        {/* Soft fade so the poster blends into the bg below */}
        <div style={{
          position: "absolute", left: 0, right: 0, bottom: 0, height: 60,
          background: "linear-gradient(to bottom, transparent, var(--bg))",
          pointerEvents: "none", zIndex: 1,
        }}/>
      </div>

      {/* Content — fills the remaining height */}
      <div style={{
        flex: 1,
        padding: "22px 24px 32px",
        display: "flex", flexDirection: "column",
      }}>
        <NFContent chrome="mobile" attemptedPath={attemptedPath} flavor={flavor}/>
      </div>
    </window.ThemeProvider>
  );
}

// ── NotFoundScreen · desktop ────────────────────────────────────────
// Two columns: poster left (560px), content right (rest). Header floats
// over the poster, top-left. Content is centered vertically in the right
// column. Symmetric 64px padding around the content column.
function NotFoundScreenDesktop({ posterName = "404", attemptedPath = "/", themeKey, flavor = "show" }) {
  return (
    <window.ThemeProvider theme={themeKey} style={{
      width: "100%", height: "100%",
      background: "var(--bg)", color: "var(--fg)",
      display: "flex", flexDirection: "row",
      overflow: "hidden",
    }}>
      {/* Left — poster column */}
      <div style={{ position: "relative", width: 560, flexShrink: 0, height: "100%" }}>
        <NFPoster posterName={posterName} scale="hero" flavor={flavor}/>
        {/* Wordmark, top-left over poster */}
        <div style={{
          position: "absolute", top: 36, left: 36, zIndex: 3,
          padding: "8px 12px",
          borderRadius: 10,
          background: "var(--scrim)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          display: "inline-flex",
        }}>
          <NFHeader chrome="desktop"/>
        </div>
      </div>

      {/* Right — content column */}
      <div style={{
        flex: 1, height: "100%",
        display: "flex", alignItems: "center", justifyContent: "flex-start",
        padding: "64px 80px",
      }}>
        <NFContent chrome="desktop" attemptedPath={attemptedPath} flavor={flavor}/>
      </div>
    </window.ThemeProvider>
  );
}

// ── Public dispatcher ──────────────────────────────────────────────
function NotFoundScreen({ chrome = "mobile", posterName = "404", attemptedPath = "/", themeKey = "electric", flavor = "show" }) {
  if (chrome === "desktop") {
    return <NotFoundScreenDesktop posterName={posterName} attemptedPath={attemptedPath} themeKey={themeKey} flavor={flavor}/>;
  }
  return <NotFoundScreenMobile posterName={posterName} attemptedPath={attemptedPath} themeKey={themeKey} flavor={flavor}/>;
}

Object.assign(window, {
  NotFoundScreen,
  NotFoundScreenMobile,
  NotFoundScreenDesktop,
  NFPoster,
  NFContent,
  NFStatusRail,
  NFHeader,
  NFCCMark,
  NF_FLAVORS,
});

window.__nf_ready = true;

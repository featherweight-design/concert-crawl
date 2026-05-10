// empty-state-canvas.jsx — visual harness around <EmptyState/>.
//
// Lays the three directions side-by-side across surfaces and variants so we
// can pick one. Mobile-first; one desktop row at the bottom. Direction 1
// is the safe baseline; D2 (suggestive) and D3 (voice) are the proposals.

const { useState: ESuseState } = React;

// ── Brand mark ──────────────────────────────────────────────────────
// Inline copy of `CCMark` from browse-home.jsx so the canvas renders the
// agreed-on cluster-path logo without depending on browse-home being loaded.
// Keep in sync with browse-home.jsx (single source of truth lives there).
function CCMark({ size = 28 }) {
  const trail = [
    { x: 14, y: 76, r: 1.5 }, { x: 24, y: 70, r: 2 },
    { x: 34, y: 64, r: 2.5 }, { x: 42, y: 58, r: 3 },
    { x: 50, y: 50, r: 4 },   { x: 58, y: 42, r: 5 },
    { x: 66, y: 32, r: 6 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true">
      <rect width="96" height="96" fill="var(--bg)" rx="16"/>
      <circle cx="72" cy="24" r="20" fill="var(--accent)" opacity="0.22"/>
      <circle cx="72" cy="24" r="12" fill="var(--accent)" opacity="0.42"/>
      <circle cx="72" cy="24" r="7"  fill="var(--signal)"/>
      {trail.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="var(--signal)" opacity={0.35 + i * 0.09}/>
      ))}
    </svg>
  );
}

// ── Mobile shell that matches the existing screens ──────────────────
function ESMobileShell({ children, themeKey = "electric", scrollable = false, label }) {
  return (
    <window.ThemeProvider theme={themeKey}>
      <div style={{
        width: 393, height: 852,
        background: "var(--bg)", color: "var(--fg)",
        position: "relative", overflow: "hidden",
        fontFamily: "Inter, system-ui",
      }}>
        <ESStatusBar/>
        <div style={{
          position: "absolute", top: 47, left: 0, right: 0, bottom: 0,
          display: "flex", flexDirection: "column",
          overflow: scrollable ? "auto" : "hidden",
        }}>
          {label && <ESChromeHeader label={label}/>}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            {children}
          </div>
        </div>
      </div>
    </window.ThemeProvider>
  );
}

function ESStatusBar() {
  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0,
      height: 47, padding: "14px 28px 0",
      display: "flex", alignItems: "flex-start", justifyContent: "space-between",
      fontFamily: "Inter, system-ui",
      fontSize: 15, fontWeight: 600,
      color: "var(--fg)", zIndex: 10, pointerEvents: "none",
      letterSpacing: "-0.01em",
    }}>
      <span>9:41</span>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <svg width="17" height="11" viewBox="0 0 17 11" fill="none"><path d="M1 8h2v2H1zM5 6h2v4H5zM9 4h2v6H9zM13 1h2v9h-2z" fill="currentColor"/></svg>
        <svg width="22" height="11" viewBox="0 0 22 11" fill="none"><rect x="1" y="1" width="18" height="9" rx="2" stroke="currentColor" strokeWidth="1" fill="currentColor" fillOpacity="0.4"/><rect x="20" y="4" width="1.5" height="3" rx=".5" fill="currentColor"/></svg>
      </div>
    </div>
  );
}

// Real chrome — mirrors the live AppBar + "What's on?" header from
// browse-home.jsx so the empty state slots into the actual surrounding UI
// Code will see at handoff.
function ESChromeHeader({ label }) {
  return (
    <div style={{ background: "var(--bg)" }}>
      {/* AppBar — concertcrawl. mark + search affordance */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "44px 16px 10px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CCMark size={28}/>
          <span style={{
            fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 17,
            color: "var(--fg)", letterSpacing: "-0.02em",
          }}>concert<span style={{ color: "var(--accent)" }}>crawl.</span></span>
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: 18,
          border: "1.5px solid var(--border-strong)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="var(--fg-muted)" strokeWidth="1.5"/>
            <path d="M11 11L14.5 14.5" stroke="var(--fg-muted)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
      {/* "What's on?" headline + location eyebrow */}
      <div style={{ padding: "0 16px 8px" }}>
        <span style={{
          fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 24,
          color: "var(--fg)", letterSpacing: "-0.03em",
        }}>{label.title || "What's on?"}</span>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5,
          color: "var(--fg-subtle)", letterSpacing: "0.08em",
          textTransform: "uppercase", marginTop: 2,
        }}>{label.eyebrow}</div>
      </div>
    </div>
  );
}

// Filter row — a stripped-down version of the live filter chips, used to
// make filtered-state empty states look like "filters are loud, results
// are zero" instead of just "no data".
function ESFilterChips({ chips }) {
  return (
    <div style={{
      display: "flex", gap: 6, padding: "10px 16px",
      borderBottom: "1px solid var(--border)",
      overflow: "hidden",
    }}>
      {chips.map((c, i) => (
        <span key={i} style={{
          padding: "5px 10px", borderRadius: 999,
          background: "var(--surface-1)",
          border: "1px solid var(--border-strong)",
          color: "var(--signal)",
          fontFamily: "Inter, system-ui",
          fontSize: 11.5, fontWeight: 600, letterSpacing: "-0.005em",
          whiteSpace: "nowrap",
        }}>{c}</span>
      ))}
    </div>
  );
}

// Search input chrome — mirrors SearchBarSM from search-mobile.jsx.
function ESSearchHeader({ value }) {
  return (
    <div style={{ paddingTop: 44, background: "var(--bg)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 16px 12px" }}>
        <button style={{
          all: "unset", width: 36, height: 36, borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--fg)", flexShrink: 0,
        }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9L11 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: 10,
          height: 44, padding: "0 14px", borderRadius: 12,
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          color: value ? "var(--fg)" : "var(--fg-subtle)",
          fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 15,
          letterSpacing: "-0.01em",
        }}>
          <span style={{ color: "var(--fg-muted)", display: "inline-flex", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.6"/>
              <path d="m12.5 12.5 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>{value || "Search artists, venues…"}</span>
          {value && (
            <span style={{
              width: 24, height: 24, borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--surface-3)", color: "var(--fg-muted)", flexShrink: 0,
              fontSize: 11,
            }}>×</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── A single demo cell. Renders one (variant, surface, state) combo ──
function ESCell({ direction, surface, state, density = "default", themeKey = "electric" }) {
  const key = `${surface}.${state}`;
  const c = window.ES_CONTENT[key];
  const ctas = window.ES_CTAS[key] || {};
  const sugs = (window.ES_SUGGESTIONS[key] || []).map(label => ({ label, onClick: () => {} }));
  if (!c) return null;
  const copy = c[direction] || c.quiet;

  // Build chrome based on surface so the empty state has context.
  let chrome = null;
  if (surface === "browse" && state === "filtered") {
    chrome = <ESFilterChips chips={["This week", "≤ $40", "Rock/punk", "× Clear"]}/>;
  } else if (surface === "search") {
    chrome = <ESSearchHeader value={state === "filtered" ? "thee oh sees" : ""}/>;
  } else if (surface === "browse") {
    chrome = <ESChromeHeader label={{ eyebrow: "WED · APR 29 · WASHINGTON DC", title: "What's on?" }}/>;
  } else if (surface === "watching") {
    chrome = <ESChromeHeader label={{ eyebrow: "WATCHING · 0 SHOWS", title: "Watching" }}/>;
  } else if (surface === "generic") {
    chrome = <ESChromeHeader label={{ eyebrow: state === "offline" ? "OFFLINE" : "BROWSE", title: "What's on?" }}/>;
  }

  return (
    <ESMobileShell themeKey={themeKey}>
      <div style={{
        display: "flex", flexDirection: "column", height: "100%",
      }}>
        {chrome}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <window.EmptyState
            variant={direction}
            state={state === "no-data" ? "no-data" : state === "filtered" ? "filtered" : "error"}
            density={density}
            eyebrow={copy.eyebrow || c.eyebrow}
            title={copy.title}
            body={copy.body}
            primaryCta={ctas.primary ? { label: ctas.primary, onClick: () => {} } : null}
            secondaryCta={ctas.secondary ? { label: ctas.secondary, onClick: () => {} } : null}
            suggestions={direction === "suggestive" ? sugs : null}
            icon={c.icon}
          />
        </div>
      </div>
    </ESMobileShell>
  );
}

// Inline / dense cell — the empty state inside an existing list slot,
// with a few real rows above to show how it sits in context.
function ESDenseCell({ direction, surface = "browse", themeKey = "electric" }) {
  const key = `${surface}.filtered`;
  const c = window.ES_CONTENT[key];
  const ctas = window.ES_CTAS[key] || {};
  const sugs = (window.ES_SUGGESTIONS[key] || []).map(label => ({ label, onClick: () => {} }));
  const copy = c[direction] || c.quiet;
  return (
    <ESMobileShell themeKey={themeKey}>
      <ESChromeHeader label={{ eyebrow: "WED · APR 29 · WASHINGTON DC", title: "What's on?" }}/>
      <ESFilterChips chips={["This week", "≤ $40", "Rock/punk", "× Clear"]}/>
      <div style={{ padding: 0, flex: 1 }}>
        <window.EmptyState
          variant={direction}
          state="filtered"
          density="dense"
          eyebrow={copy.eyebrow || c.eyebrow}
          title={copy.title}
          body={copy.body}
          primaryCta={ctas.primary ? { label: ctas.primary, onClick: () => {} } : null}
          secondaryCta={ctas.secondary ? { label: ctas.secondary, onClick: () => {} } : null}
          suggestions={direction === "suggestive" ? sugs : null}
          icon={c.icon}
        />
      </div>
    </ESMobileShell>
  );
}

// Desktop cell — wraps the empty state in a 1280-wide card-ish frame so
// we can confirm it doesn't sprawl on big monitors.
function ESDesktopCell({ direction, surface, state, themeKey = "electric" }) {
  const key = `${surface}.${state}`;
  const c = window.ES_CONTENT[key];
  const ctas = window.ES_CTAS[key] || {};
  const sugs = (window.ES_SUGGESTIONS[key] || []).map(label => ({ label, onClick: () => {} }));
  const copy = c[direction] || c.quiet;
  return (
    <window.ThemeProvider theme={themeKey}>
      <div style={{
        width: 1280, height: 720,
        background: "var(--bg)", color: "var(--fg)",
        display: "flex", flexDirection: "column",
        fontFamily: "Inter, system-ui",
      }}>
        {/* Top nav — mirrors TopNavBD from browse-desktop.jsx */}
        <div style={{
          height: 64, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 32px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-elevated)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 7, overflow: "hidden", flexShrink: 0 }}>
                <CCMark size={32}/>
              </div>
              <span style={{
                fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 17,
                letterSpacing: "-0.02em", color: "var(--fg)",
              }}>concert<span style={{ color: "var(--accent)" }}>crawl.</span></span>
            </div>
            <nav style={{ display: "flex", gap: 4 }}>
              {[
                { k: "browse", l: "Browse" },
                { k: "search", l: "Search" },
                { k: "saved",  l: "Saved" },
              ].map(t => {
                const active =
                  (surface === "browse"   && t.k === "browse") ||
                  (surface === "search"   && t.k === "search") ||
                  (surface === "watching" && t.k === "saved");
                return (
                  <span key={t.k} style={{
                    padding: "8px 14px", borderRadius: 8,
                    fontFamily: "Inter, system-ui",
                    fontWeight: active ? 700 : 500, fontSize: 13,
                    color: active ? "var(--fg)" : "var(--fg-muted)",
                    background: active ? "var(--surface-2)" : "transparent",
                    letterSpacing: "-0.01em",
                  }}>{t.l}</span>
                );
              })}
            </nav>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              height: 36, padding: "0 12px",
              borderRadius: 8, background: "var(--surface-1)",
              border: "1px solid var(--border)", width: 280, boxSizing: "border-box",
              color: "var(--fg-subtle)",
            }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <span style={{ fontFamily: "Inter, system-ui", fontSize: 13 }}>
                {surface === "search" && state === "filtered" ? "thee oh sees" : "Search artists, venues, genres…"}
              </span>
              <span style={{
                marginLeft: "auto",
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                color: "var(--fg-subtle)",
                padding: "2px 5px", borderRadius: 3,
                border: "1px solid var(--border-strong)",
              }}>⌘K</span>
            </div>
            <div style={{
              width: 36, height: 36, borderRadius: 999,
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
            }}/>
          </div>
        </div>
        {/* Content area */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          maxWidth: 880, margin: "0 auto", width: "100%", padding: "32px 32px 0",
        }}>
          {surface === "browse" && state === "filtered" && (
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {["This week", "≤ $40", "Rock/punk"].map(l => (
                <span key={l} style={{
                  padding: "6px 12px", borderRadius: 999,
                  background: "var(--surface-1)", border: "1px solid var(--border-strong)",
                  color: "var(--signal)", fontSize: 12.5, fontWeight: 600,
                }}>{l}</span>
              ))}
            </div>
          )}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <window.EmptyState
              variant={direction}
              state={state === "no-data" ? "no-data" : state === "filtered" ? "filtered" : "error"}
              density="default"
              eyebrow={copy.eyebrow || c.eyebrow}
              title={copy.title}
              body={copy.body}
              primaryCta={ctas.primary ? { label: ctas.primary, onClick: () => {} } : null}
              secondaryCta={ctas.secondary ? { label: ctas.secondary, onClick: () => {} } : null}
              suggestions={direction === "suggestive" ? sugs : null}
              icon={c.icon}
            />
          </div>
        </div>
      </div>
    </window.ThemeProvider>
  );
}

// ── The canvas itself ────────────────────────────────────────────────
function ESCanvas() {
  const DCSection = window.DCSection;
  const DCArtboard = window.DCArtboard;
  const DesignCanvas = window.DesignCanvas;

  return (
    <DesignCanvas
      title="Empty State — direction exploration (v2)"
      subtitle="Pre-beta blocker · May 25. v2 adds D4 (Hybrid) per feedback: Suggestive's hierarchy + Quiet's icon + Voice's mono status rail at a tuned headline size (~30px instead of 52). Dynamic chip suggestions are dropped — every CTA is now a known-static destination (chips risked routing to other empty states). Search no-results uses the locked 'Watch artist' teaser per Code's clarification (teaser ships in beta; alerts ship post-launch). Sections 2-4 kept for reference; Section 1.5 is the recommended Hybrid across every surface.">

      {/* ── 1. Direction comparison · canonical surface ─────────── */}
      <DCSection
        id="d-compare"
        title="1. All four directions, side by side"
        subtitle="Same surface (Watching · nothing watched yet), same copy contract. D4 (Hybrid) is the recommendation — borrows the dashed icon from D1, the mono status rail from D3, and a tuned headline size between Suggestive's 22px and Voice's 52px. Dynamic chip suggestions from D2 are dropped; CTAs are now route-locked.">
        <DCArtboard id="d1-quiet"      label="D1 · Quiet utility"                          width={393} height={852}>
          <ESCell direction="quiet"      surface="watching" state="no-data"/>
        </DCArtboard>
        <DCArtboard id="d2-suggestive" label="D2 · Suggestive (chips deprecated)"          width={393} height={852}>
          <ESCell direction="suggestive" surface="watching" state="no-data"/>
        </DCArtboard>
        <DCArtboard id="d3-voice"      label="D3 · Voice (editorial)"                     width={393} height={852}>
          <ESCell direction="voice"      surface="watching" state="no-data"/>
        </DCArtboard>
        <DCArtboard id="d4-hybrid"     label="D4 · Hybrid — RECOMMENDED"                    width={393} height={852}>
          <ESCell direction="hybrid"     surface="watching" state="no-data"/>
        </DCArtboard>
      </DCSection>

      {/* ── 1.5 Hybrid · surface coverage ─────────────────────── */}
      <DCSection
        id="surfaces-d4"
        title="1.5 Hybrid (recommended) · every surface"
        subtitle="Same anatomy across all surfaces: dashed icon (no-data only) → mono status rail → ~30px headline → body → primary + optional secondary CTA. No dynamic chips. Search no-results uses the locked 'Watch artist' teaser per Code's clarification (teaser ships in beta; alerts ship at launch).">
        <DCArtboard id="h-browse-nd"  label="Browse · no shows tonight"           width={393} height={852}><ESCell direction="hybrid" surface="browse"   state="no-data"/></DCArtboard>
        <DCArtboard id="h-browse-fl"  label="Browse · filtered out"               width={393} height={852}><ESCell direction="hybrid" surface="browse"   state="filtered"/></DCArtboard>
        <DCArtboard id="h-search-nd"  label="Search · empty input"                width={393} height={852}><ESCell direction="hybrid" surface="search"   state="no-data"/></DCArtboard>
        <DCArtboard id="h-search-fl"  label="Search · no results (locked teaser)" width={393} height={852}><ESCell direction="hybrid" surface="search"   state="filtered"/></DCArtboard>
        <DCArtboard id="h-watching"   label="Watching · empty queue"              width={393} height={852}><ESCell direction="hybrid" surface="watching" state="no-data"/></DCArtboard>
        <DCArtboard id="h-error"      label="Generic · failed to load"            width={393} height={852}><ESCell direction="hybrid" surface="generic"  state="error"/></DCArtboard>
        <DCArtboard id="h-offline"    label="Generic · offline"                   width={393} height={852}><ESCell direction="hybrid" surface="generic"  state="offline"/></DCArtboard>
      </DCSection>

      {/* ── 2. Surface coverage · D1 ────────────────────────────── */}
      <DCSection
        id="surfaces-d1"
        title="2. Surface coverage · Direction 1 (Quiet)"
        subtitle="Browse no-data · Browse filtered · Search empty · Search no-results · Watching · Generic error · Offline. Same six surfaces below for D2/D3.">
        <DCArtboard id="q-browse-nd"  label="Browse · no shows tonight"           width={393} height={852}><ESCell direction="quiet" surface="browse"   state="no-data"/></DCArtboard>
        <DCArtboard id="q-browse-fl"  label="Browse · filtered out"               width={393} height={852}><ESCell direction="quiet" surface="browse"   state="filtered"/></DCArtboard>
        <DCArtboard id="q-search-nd"  label="Search · empty input"                width={393} height={852}><ESCell direction="quiet" surface="search"   state="no-data"/></DCArtboard>
        <DCArtboard id="q-search-fl"  label="Search · no results"                 width={393} height={852}><ESCell direction="quiet" surface="search"   state="filtered"/></DCArtboard>
        <DCArtboard id="q-watching"   label="Watching · empty queue"              width={393} height={852}><ESCell direction="quiet" surface="watching" state="no-data"/></DCArtboard>
        <DCArtboard id="q-error"      label="Generic · failed to load"            width={393} height={852}><ESCell direction="quiet" surface="generic"  state="error"/></DCArtboard>
        <DCArtboard id="q-offline"    label="Generic · offline"                   width={393} height={852}><ESCell direction="quiet" surface="generic"  state="offline"/></DCArtboard>
      </DCSection>

      {/* ── 3. Surface coverage · D2 ────────────────────────────── */}
      <DCSection
        id="surfaces-d2"
        title="3. Surface coverage · Direction 2 (Suggestive)"
        subtitle="Same surfaces. The 'Try' chip row turns dead-ends into specific next moves. Search-empty especially benefits — recent / suggested searches sit inline.">
        <DCArtboard id="s-browse-nd"  label="Browse · no shows tonight"           width={393} height={852}><ESCell direction="suggestive" surface="browse"   state="no-data"/></DCArtboard>
        <DCArtboard id="s-browse-fl"  label="Browse · filtered out"               width={393} height={852}><ESCell direction="suggestive" surface="browse"   state="filtered"/></DCArtboard>
        <DCArtboard id="s-search-nd"  label="Search · empty input"                width={393} height={852}><ESCell direction="suggestive" surface="search"   state="no-data"/></DCArtboard>
        <DCArtboard id="s-search-fl"  label="Search · no results"                 width={393} height={852}><ESCell direction="suggestive" surface="search"   state="filtered"/></DCArtboard>
        <DCArtboard id="s-watching"   label="Watching · empty queue"              width={393} height={852}><ESCell direction="suggestive" surface="watching" state="no-data"/></DCArtboard>
        <DCArtboard id="s-error"      label="Generic · failed to load"            width={393} height={852}><ESCell direction="suggestive" surface="generic"  state="error"/></DCArtboard>
        <DCArtboard id="s-offline"    label="Generic · offline"                   width={393} height={852}><ESCell direction="suggestive" surface="generic"  state="offline"/></DCArtboard>
      </DCSection>

      {/* ── 4. Surface coverage · D3 ────────────────────────────── */}
      <DCSection
        id="surfaces-d3"
        title="4. Surface coverage · Direction 3 (Voice)"
        subtitle="Same surfaces. Voice is loudest at the headline; body copy stays informative so we don't obscure the 'no data' message. The mono status rail signals *why* it's empty without an icon.">
        <DCArtboard id="v-browse-nd"  label="Browse · no shows tonight"           width={393} height={852}><ESCell direction="voice" surface="browse"   state="no-data"/></DCArtboard>
        <DCArtboard id="v-browse-fl"  label="Browse · filtered out"               width={393} height={852}><ESCell direction="voice" surface="browse"   state="filtered"/></DCArtboard>
        <DCArtboard id="v-search-nd"  label="Search · empty input"                width={393} height={852}><ESCell direction="voice" surface="search"   state="no-data"/></DCArtboard>
        <DCArtboard id="v-search-fl"  label="Search · no results"                 width={393} height={852}><ESCell direction="voice" surface="search"   state="filtered"/></DCArtboard>
        <DCArtboard id="v-watching"   label="Watching · empty queue"              width={393} height={852}><ESCell direction="voice" surface="watching" state="no-data"/></DCArtboard>
        <DCArtboard id="v-error"      label="Generic · failed to load"            width={393} height={852}><ESCell direction="voice" surface="generic"  state="error"/></DCArtboard>
        <DCArtboard id="v-offline"    label="Generic · offline"                   width={393} height={852}><ESCell direction="voice" surface="generic"  state="offline"/></DCArtboard>
      </DCSection>

      {/* ── 5. Density · default vs dense ───────────────────────── */}
      <DCSection
        id="density"
        title="5. Density · default vs dense (inline within a list)"
        subtitle="Default = full route empty (browse-home, watching). Dense = the empty state slots inside an existing list with chrome above (e.g. inside the calendar's day-section). Same component, density='dense'. Eng matches what browse-home already passes.">
        <DCArtboard id="den-d1" label="D1 · dense (in-list)"             width={393} height={852}><ESDenseCell direction="quiet"      surface="browse"/></DCArtboard>
        <DCArtboard id="den-d2" label="D2 · dense (chips deprecated)"    width={393} height={852}><ESDenseCell direction="suggestive" surface="browse"/></DCArtboard>
        <DCArtboard id="den-d3" label="D3 · dense (in-list)"             width={393} height={852}><ESDenseCell direction="voice"      surface="browse"/></DCArtboard>
        <DCArtboard id="den-d4" label="D4 · dense — RECOMMENDED"          width={393} height={852}><ESDenseCell direction="hybrid"     surface="browse"/></DCArtboard>
      </DCSection>

      {/* ── 6. Themes ───────────────────────────────────────────── */}
      <DCSection
        id="themes"
        title="6. Themes · Electric / Jade / Light"
        subtitle="Component is purely token-driven; included here to confirm the headline weight + signal/accent treatments hold across all three. Recommended direction (D2) shown.">
        <DCArtboard id="t-electric" label="Electric (default)"  width={393} height={852}><ESCell direction="hybrid" surface="watching" state="no-data" themeKey="electric"/></DCArtboard>
        <DCArtboard id="t-jade"     label="Jade"                 width={393} height={852}><ESCell direction="hybrid" surface="watching" state="no-data" themeKey="jade"/></DCArtboard>
        <DCArtboard id="t-light"    label="Light"                width={393} height={852}><ESCell direction="hybrid" surface="watching" state="no-data" themeKey="light"/></DCArtboard>
      </DCSection>

      {/* ── 7. Desktop ──────────────────────────────────────────── */}
      <DCSection
        id="desktop"
        title="7. Desktop · same component, capped width"
        subtitle="Empty state caps at 460px max-width and centers in the 880px content column — never sprawls on wide monitors. Filter chips above the empty state are the only chrome that changes between mobile and desktop.">
        <DCArtboard id="dt-d4-bf" label="Hybrid · desktop · Browse filtered" width={1280} height={720}>
          <ESDesktopCell direction="hybrid" surface="browse"   state="filtered"/>
        </DCArtboard>
        <DCArtboard id="dt-d4-w"  label="Hybrid · desktop · Watching empty"  width={1280} height={720}>
          <ESDesktopCell direction="hybrid" surface="watching" state="no-data"/>
        </DCArtboard>
        <DCArtboard id="dt-d4-s"  label="Hybrid · desktop · Search empty"    width={1280} height={720}>
          <ESDesktopCell direction="hybrid" surface="search"   state="no-data"/>
        </DCArtboard>
      </DCSection>

      {/* ── 8. Notes for eng + flagged surfaces ─────────────────── */}
      <DCSection
        id="notes"
        title="8. Notes & flagged surfaces"
        subtitle="Three additional surfaces I'd want this component to cover but haven't speccd copy for yet — flagging so we can decide before handoff."
      >
        <DCArtboard id="notes-card" label="Read me" width={760} height={520}>
          <window.ThemeProvider theme="electric">
            <div style={{
              width: 760, height: 520, padding: "32px 36px",
              background: "var(--bg)", color: "var(--fg)",
              fontFamily: "Inter, system-ui",
              display: "flex", flexDirection: "column", gap: 14,
            }}>
              <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "var(--fg-muted)", letterSpacing: "0.12em", textTransform: "uppercase" }}>Handoff notes</div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>Surfaces flagged for follow-up</div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10, color: "var(--fg-muted)", fontSize: 13.5, lineHeight: 1.5 }}>
                <li><b style={{color:"var(--fg)"}}>Venue profile · no upcoming gigs.</b> Same shape as Watching (no-data). Suggested copy: "No upcoming shows at &lt;Venue&gt;." + "Watch the venue" CTA.</li>
                <li><b style={{color:"var(--fg)"}}>Submit-a-price · none submitted.</b> Reuses the Watching pattern; CTA points to recently-attended shows.</li>
                <li><b style={{color:"var(--fg)"}}>Auth-gate post-redemption · 0 invites left.</b> Different surface — probably its own treatment, not this component. Flagging so we don't paper over it.</li>
              </ul>
              <div style={{ height: 1, background: "var(--border)", margin: "8px 0" }}/>
              <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "var(--fg-muted)", letterSpacing: "0.12em", textTransform: "uppercase" }}>Component API</div>
              <pre style={{
                margin: 0, padding: 14, borderRadius: 8,
                background: "var(--surface-1)",
                border: "1px solid var(--border)",
                color: "var(--fg)",
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, lineHeight: 1.55,
                overflow: "hidden", whiteSpace: "pre-wrap",
              }}>{`<EmptyState
  variant="hybrid" | "quiet" | "voice"       // direction; 'hybrid' default
                                              // 'suggestive' kept exported but deprecated
  state="no-data" | "filtered" | "error"     // why it's empty
  density="default" | "dense"                // dense = inline within a list
  eyebrow="Watching"
  title="Crickets."
  body="…"
  primaryCta={{label, onClick}}
  secondaryCta={{label, onClick}}            // optional
  icon="bookmark | search | calendar | bolt | wifi"
/>`}</pre>
            </div>
          </window.ThemeProvider>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

window.ESCanvas = ESCanvas;

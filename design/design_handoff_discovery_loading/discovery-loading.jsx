// discovery-loading.jsx — DiscoveryShelf LOADING state (entitled + connected + picks pending)
//
// The transient gap: useEntitlement('spotify-sync') = true, useSpotifyConnection() = connected,
// useTastePicks() still in flight. Hugh's ask: "if someone is connected on Spotify, I want to
// show it" — so instead of rendering nothing, we acknowledge the shelf while picks resolve.
//
// Box model mirrors TastePickCard/DiscoveryShelf in discovery-surface.jsx VERBATIM
// (card w168 · r14 · surface-1 · image 116 · body pad 10/11/12 · gap 7 · header 22 logo)
// so real picks drop in with ZERO layout shift. Skeleton = same total height as a filled
// 2-card shelf; it may visually condense when fewer real picks arrive (per spec).
//
// Exports: DiscoveryLoadingShelf, DiscoveryLoadingScreen, DiscoveryLoadingDesktop, DL_MOTION

// ── one-time keyframes + reduced-motion guard ───────────────────
if (typeof document !== "undefined" && !document.getElementById("dl-keyframes")) {
  const s = document.createElement("style");
  s.id = "dl-keyframes";
  s.textContent = `
    @keyframes dlSweep  { 0%{transform:translateX(-115%)} 100%{transform:translateX(115%)} }
    @keyframes dlPulse  { 0%,100%{opacity:1} 50%{opacity:.42} }
    @keyframes dlSeg    { 0%,100%{opacity:.9} 50%{opacity:.4} }
    @keyframes dlDot    { 0%,100%{opacity:1; transform:scale(1)} 50%{opacity:.3; transform:scale(.82)} }
    /* System-level reduced-motion: hard stop, static placeholder */
    @media (prefers-reduced-motion: reduce) {
      .dl-anim { animation: none !important; }
      .dl-sweep { display: none !important; }
    }
  `;
  document.head.appendChild(s);
}

// motion spec (single source of truth — cite in the motion table)
const DL_MOTION = {
  sweep:  { name: "dlSweep", dur: "1500ms", ease: "cubic-bezier(0.4,0,0.2,1)", iter: "infinite" },
  pulse:  { name: "dlPulse", dur: "1600ms", ease: "ease-in-out",              iter: "infinite" },
  seg:    { name: "dlSeg",   dur: "1400ms", ease: "ease-in-out",              iter: "infinite" },
  dot:    { name: "dlDot",   dur: "1400ms", ease: "ease-in-out",              iter: "infinite" },
};

// a placeholder block. tint=price paints a faint --signal wash so the price line reads as "price".
function Bar({ w = "100%", h = 10, r = 6, tint = "surface", shimmer, motion, delay = 0 }) {
  const bg = tint === "price"
    ? "color-mix(in oklch, var(--signal) 18%, var(--surface-2))"
    : "var(--surface-2)";
  const anim = motion === "animated" && shimmer === "segmented"
    ? { animation: `${DL_MOTION.seg.name} ${DL_MOTION.seg.dur} ${DL_MOTION.seg.ease} ${DL_MOTION.seg.iter}`, animationDelay: `${delay}ms` }
    : {};
  const cls = "dl-bar" + (Object.keys(anim).length ? " dl-anim" : "");
  return <div className={cls} style={{ width: w, height: h, borderRadius: r, background: bg, flexShrink: 0, ...anim }} />;
}

// the sweeping light band (sweep style only). Tied to --fg so it lightens on dark themes,
// darkens on Light — no raw color, no green.
function SweepOverlay() {
  return (
    <div className="dl-sweep" aria-hidden="true" style={{
      position: "absolute", inset: 0, pointerEvents: "none",
      background: "linear-gradient(100deg, transparent 32%, color-mix(in oklch, var(--fg) 11%, transparent) 50%, transparent 68%)",
      animation: `${DL_MOTION.sweep.name} ${DL_MOTION.sweep.dur} ${DL_MOTION.sweep.ease} ${DL_MOTION.sweep.iter}`,
    }}/>
  );
}

// one skeleton pick card — box-identical to TastePickCard
function SkeletonCard({ shimmer = "sweep", motion = "animated", delay = 0 }) {
  const sweep = motion === "animated" && shimmer === "sweep";
  const pulse = motion === "animated" && shimmer === "pulse";
  const pulseAnim = pulse
    ? { animation: `${DL_MOTION.pulse.name} ${DL_MOTION.pulse.dur} ${DL_MOTION.pulse.ease} ${DL_MOTION.pulse.iter}`, animationDelay: `${delay}ms` }
    : {};
  return (
    <div className={"dl-shimmer-card" + (pulse ? " dl-anim" : "")} style={{
      width: 168, flexShrink: 0, borderRadius: 14, overflow: "hidden",
      background: "var(--surface-1)", border: "1px solid var(--border)",
      position: "relative", ...pulseAnim,
    }}>
      {/* image region (image / IdentityArt fallback slot) */}
      <div style={{ height: 116, background: "var(--surface-2)" }} />
      {/* body: reason chip · artist · venue·date · price — same 10/11/12 pad, gap 7 */}
      <div style={{ padding: "10px 11px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
        <Bar w={74} h={16} r={5} shimmer={shimmer} motion={motion} delay={delay} />
        <Bar w="82%" h={13} r={5} shimmer={shimmer} motion={motion} delay={delay + 90} />
        <Bar w="94%" h={9}  r={4} shimmer={shimmer} motion={motion} delay={delay + 180} />
        <Bar w={44}  h={11} r={5} tint="price" shimmer={shimmer} motion={motion} delay={delay + 270} />
      </div>
      {sweep && <SweepOverlay />}
    </div>
  );
}

// slim variant — a single "loading your picks" chip (Design's alt to match-shape)
function SlimChip({ shimmer = "sweep", motion = "animated" }) {
  const sweep = motion === "animated" && shimmer === "sweep";
  return (
    <div className="dl-shimmer-card" style={{
      position: "relative", overflow: "hidden", display: "inline-flex", alignItems: "center", gap: 9,
      padding: "12px 14px", borderRadius: 12, background: "var(--surface-1)", border: "1px solid var(--border)",
    }}>
      <span className={motion === "animated" ? "dl-anim" : ""} style={{
        width: 7, height: 7, borderRadius: 7, background: "var(--signal)", flexShrink: 0,
        boxShadow: "0 0 6px var(--signal)",
        animation: motion === "animated" ? `${DL_MOTION.dot.name} ${DL_MOTION.dot.dur} ${DL_MOTION.dot.ease} ${DL_MOTION.dot.iter}` : "none",
      }}/>
      <span style={{ fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13.5, color: "var(--fg-muted)", letterSpacing: "-0.01em" }}>Loading your picks…</span>
      {sweep && <SweepOverlay />}
    </div>
  );
}

// timeout fallback — a chip with a retry (Design's answer to open-Q #4).
// Deliberately lighter than the shipped "taste on pause" FAILURE state: this is
// "slow", not "broken". Sour Patch voice: playful + clear.
function TimeoutRetryChip({ onRetry }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
      borderRadius: 12, background: "var(--surface-1)", border: "1px solid var(--border)",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 6, background: "var(--warning)", flexShrink: 0, boxShadow: "0 0 6px var(--warning)" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--warning)", marginBottom: 3 }}>STILL TUNING</div>
        <div style={{ fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13, color: "var(--fg)", letterSpacing: "-0.01em" }}>Picks are taking a beat.</div>
      </div>
      <button onClick={onRetry} style={{
        all: "unset", cursor: "pointer", flexShrink: 0, padding: "8px 14px", borderRadius: 9,
        border: "1.5px solid color-mix(in oklch, var(--signal) 45%, var(--border))",
        color: "var(--signal)", fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 12.5, letterSpacing: "-0.01em",
      }}>Retry</button>
    </div>
  );
}

// ── The loading shelf (header + body) ───────────────────────────
// shape: "match" (header + eyebrow + 2 skeleton cards) | "slim"
// state: "loading" | "timeout"
// firstVisit: on cold sign-in, acknowledge the read ("READING YOUR SPOTIFY FOLLOWS…")
function DiscoveryLoadingShelf({ shape = "match", shimmer = "sweep", motion = "animated", firstVisit = false, state = "loading", cards = 2, onRetry = () => {} }) {
  const { SpotifyLogo } = window;
  const eyebrow = firstVisit ? "READING YOUR SPOTIFY FOLLOWS…" : "FINDING YOUR PICKS…";
  const showDot = state === "loading";
  return (
    <div style={{ paddingTop: 6 }} role="status" aria-live="polite" aria-label="Loading picks based on your taste">
      {/* header — identical to DiscoveryShelf */}
      <div style={{ padding: "0 16px", display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
        <SpotifyLogo size={22} radius={6} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em", color: "var(--fg)" }}>Based on your taste</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            {showDot && <span className={motion === "animated" ? "dl-anim" : ""} style={{
              width: 5, height: 5, borderRadius: 5, background: "var(--signal)", flexShrink: 0,
              boxShadow: "0 0 5px var(--signal)",
              animation: motion === "animated" ? `${DL_MOTION.dot.name} ${DL_MOTION.dot.dur} ${DL_MOTION.dot.ease} ${DL_MOTION.dot.iter}` : "none",
            }}/>}
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "var(--fg-subtle)" }}>
              {state === "timeout" ? "TAKING LONGER THAN USUAL" : eyebrow}
            </span>
          </div>
        </div>
      </div>
      {/* body */}
      {state === "timeout" ? (
        <div style={{ padding: "2px 16px 4px" }}><TimeoutRetryChip onRetry={onRetry} /></div>
      ) : shape === "slim" ? (
        <div style={{ padding: "2px 16px 4px" }}><SlimChip shimmer={shimmer} motion={motion} /></div>
      ) : (
        <div style={{ display: "flex", gap: 11, padding: "2px 16px 4px", overflow: "hidden" }}>
          {Array.from({ length: cards }).map((_, i) => (
            <SkeletonCard key={i} shimmer={shimmer} motion={motion} delay={i * 220} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Mobile /events screen with the loading shelf in place ───────
// header → discovery shelf (loading) → FilterBar → event list  (spec placement)
function FilterBarStub() {
  const chips = ["Following", "Tonight", "Venue", "Under $30", "Genre"];
  return (
    <div style={{ display: "flex", gap: 8, padding: "14px 16px 10px", overflow: "hidden" }}>
      {chips.map((c, i) => (
        <div key={i} style={{
          flexShrink: 0, padding: "7px 12px", borderRadius: 999,
          background: i === 0 ? "color-mix(in oklch, var(--signal) 14%, var(--surface-1))" : "var(--surface-1)",
          border: `1px solid ${i === 0 ? "color-mix(in oklch, var(--signal) 40%, var(--border))" : "var(--border)"}`,
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 12,
          color: i === 0 ? "var(--signal)" : "var(--fg-muted)", whiteSpace: "nowrap",
        }}>{c}</div>
      ))}
    </div>
  );
}

function AppHeader() {
  return (
    <div style={{ padding: "58px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <window.MMark size={26} />
        <span style={{ fontFamily: "Inter, system-ui", fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--fg)" }}>concert<span style={{ color: "var(--accent)" }}>crawl.</span></span>
      </div>
      <div style={{ width: 32, height: 32, borderRadius: 32, background: "var(--signal)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-on-accent)", fontWeight: 900, fontSize: 13 }}>H</div>
    </div>
  );
}

function DiscoveryLoadingScreen(props) {
  const rows = [
    { headline: "Two Friends", subtitle: "Big Bootie Tour", venue: "Red Rocks", time: "7:00 PM", genres: ["electronic"], price: "$45", hue: 210, followed: false },
    { headline: "Geese", subtitle: "3D Country Tour", venue: "Ogden Theatre", time: "9:00 PM", genres: ["rock"], price: "$25", hue: 200, followed: true },
  ];
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)", fontFamily: "Inter, system-ui", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <AppHeader />
      <div style={{ flex: 1, overflowY: "auto" }}>
        <DiscoveryLoadingShelf {...props} />
        <FilterBarStub />
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px 4px" }}>
          <span style={{ fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 12, color: "var(--fg)", letterSpacing: "0.05em", textTransform: "uppercase" }}>All Denver shows</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>
        <div style={{ padding: "0 16px 16px" }}>
          {rows.map((r, i) => (
            <React.Fragment key={i}>
              {i > 0 && <div style={{ height: 1, background: "var(--border)" }} />}
              <window.EventRowCC {...r} />
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Desktop /events with the loading shelf ──────────────────────
function DiscoveryLoadingDesktop(props) {
  const rows = [
    { headline: "Two Friends", subtitle: "Big Bootie Tour", venue: "Red Rocks", time: "7:00 PM", genres: ["electronic"], price: "$45", hue: 210, followed: false },
    { headline: "Geese", subtitle: "3D Country Tour", venue: "Ogden Theatre", time: "9:00 PM", genres: ["rock"], price: "$25", hue: 200, followed: true },
    { headline: "David Guetta", subtitle: "", venue: "Red Rocks", time: "8:00 PM", genres: ["house"], price: "$65", hue: 30, followed: false },
  ];
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)", fontFamily: "Inter, system-ui", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ height: 60, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <window.MMark size={26} />
          <span style={{ fontFamily: "Inter, system-ui", fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>concert<span style={{ color: "var(--accent)" }}>crawl.</span></span>
        </div>
        <div style={{ width: 34, height: 34, borderRadius: 34, background: "var(--signal)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-on-accent)", fontWeight: 900, fontSize: 14 }}>H</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "26px 20px 40px" }}>
          <div style={{ fontFamily: "Inter, system-ui", fontWeight: 900, fontSize: 30, letterSpacing: "-0.03em", marginBottom: 18, padding: "0 16px" }}>Denver</div>
          <DiscoveryLoadingShelf {...props} cards={props.cards || 4} />
          <FilterBarStub />
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px 4px" }}>
            <span style={{ fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 12, color: "var(--fg)", letterSpacing: "0.05em", textTransform: "uppercase" }}>All Denver shows</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>
          <div style={{ padding: "0 16px" }}>
            {rows.map((r, i) => (
              <React.Fragment key={i}>
                {i > 0 && <div style={{ height: 1, background: "var(--border)" }} />}
                <window.EventRowCC {...r} />
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  DiscoveryLoadingShelf, DiscoveryLoadingScreen, DiscoveryLoadingDesktop,
  SkeletonCard, TimeoutRetryChip, DL_MOTION,
});

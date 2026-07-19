// watchers-surface.jsx — #762 Who Else Is Watching
// The social-proof surface that replaces the retired "N watching" count tail on
// the event-detail Watch zone. Renders the four brief §4 states, an async
// loading skeleton, and an inline roster expansion. Mobile + desktop parity is
// behavioural — same component, same states; only the container width differs.
//
// Exports: <WatchersSurface> · <AvatarStack> · <WatchZone> · <WatchShowButtonCC>

const { useState: w_useState } = React;

// One-time keyframes for the skeleton shimmer.
if (typeof document !== "undefined" && !document.getElementById("w-styles")) {
  const s = document.createElement("style");
  s.id = "w-styles";
  s.textContent =
    "@keyframes w-shimmer{0%{opacity:.45}50%{opacity:.85}100%{opacity:.45}}" +
    ".w-see-all{background:none;border:none;padding:0;margin:0;font-family:inherit;cursor:pointer;color:var(--signal);font-weight:700;letter-spacing:-0.005em}" +
    ".w-see-all:hover{text-decoration:underline}" +
    ".w-see-all:focus-visible{outline:2px solid var(--focus);outline-offset:2px;border-radius:3px}";
  document.head.appendChild(s);
}

// ── Single avatar ────────────────────────────────────────────────────────────
// Named → letter on its own tone tint (WCAG-AA fill+ink pair). Anon → neutral
// disc, no letter (we don't fake an identity we don't have).
function WAvatar({ watcher, size = 24, ring = "var(--bg)" }) {
  const letter = watcherInitial(watcher);
  const ringShadow = `0 0 0 2px ${ring}`;
  if (!letter) {
    return (
      <div aria-hidden="true" style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0,
        background: "var(--surface-2)", border: "1.5px solid var(--border-strong)",
        boxShadow: ringShadow,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ width: size * 0.22, height: size * 0.22, borderRadius: "50%", background: "var(--fg-subtle)" }} />
      </div>
    );
  }
  const tone = watcherTone(watcher);
  return (
    <div aria-hidden="true" style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `color-mix(in oklch, var(--${tone}) 22%, var(--surface-1))`,
      border: `1.5px solid color-mix(in oklch, var(--${tone}) 50%, transparent)`,
      boxShadow: ringShadow,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Inter, system-ui", fontWeight: 800,
      fontSize: Math.round(size * 0.46), letterSpacing: "-0.02em", lineHeight: 1,
      color: `var(--${tone})`,
    }}>{letter}</div>
  );
}

// ── Overlapping stack ────────────────────────────────────────────────────────
// Named avatars overlap left→right; leftover watchers collapse into a "+N" chip.
// All-others state shows neutral discs so the stack never reads empty.
function AvatarStack({ watchers, size = 24, ring = "var(--bg)" }) {
  const { shown, others, anonOnly, total } = buildWatchers(watchers);
  const discs = anonOnly ? watchers.slice(0, Math.min(3, total)) : shown;
  const overflow = anonOnly ? total - discs.length : others;
  const overlap = Math.round(size * 0.3);
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {discs.map((w, i) => (
        <div key={w.handle ?? `anon-${i}`} style={{ marginLeft: i === 0 ? 0 : -overlap, zIndex: discs.length - i }}>
          <WAvatar watcher={w} size={size} ring={ring} />
        </div>
      ))}
      {overflow > 0 && (
        <div aria-hidden="true" style={{
          marginLeft: -overlap, zIndex: 0,
          minWidth: size, height: size, padding: "0 6px", borderRadius: size,
          background: "var(--surface-2)", border: `1.5px solid var(--border-strong)`,
          boxShadow: `0 0 0 2px ${ring}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'JetBrains Mono', monospace", fontSize: Math.round(size * 0.4),
          fontWeight: 700, color: "var(--fg-muted)", letterSpacing: "-0.02em",
        }}>+{overflow}</div>
      )}
    </div>
  );
}

// ── The sentence (named handles in --fg, connective in --fg-muted) ───────────
function SentenceText({ parts, size = 12.5 }) {
  return (
    <span style={{ fontFamily: "Inter, system-ui", fontSize: size, lineHeight: 1.4,
      color: "var(--fg-muted)", letterSpacing: "-0.005em" }}>
      {parts.map((p, i) =>
        p.t === "name"
          ? <span key={i} style={{ fontWeight: 700, color: "var(--fg)" }}>{p.v}</span>
          : <span key={i}>{p.v}</span>
      )}
    </span>
  );
}

// Build both the rendered parts and the flat a11y sentence for a watcher set.
function watchersToParts(watchers) {
  const { shown, others, anonOnly, total } = buildWatchers(watchers);
  if (anonOnly) {
    return {
      parts: [{ t: "text", v: WATCHERS_COPY.countOnly(total) }],
      aria: WATCHERS_COPY.countOnly(total),
      others, anonOnly, total,
    };
  }
  const names = shown.map((w) => w.handle);
  const nameParts = joinNames(names);
  let tail;
  if (others > 0) tail = " " + WATCHERS_COPY.plusOthers(others);
  else if (names.length === 1) tail = " " + WATCHERS_COPY.one;
  else tail = " " + WATCHERS_COPY.areWatching;
  const parts = [...nameParts, { t: "text", v: tail }];
  const aria = names.join(names.length > 2 ? ", " : " & ").replace(/, ([^,]*)$/, " & $1") + tail;
  return { parts, aria, others, anonOnly, total };
}

// ── Loading skeleton ─────────────────────────────────────────────────────────
function WatchersSkeleton({ size = 24, ring = "var(--bg)" }) {
  const overlap = Math.round(size * 0.3);
  return (
    <div role="status" aria-live="polite" aria-busy="true"
      style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 28 }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            marginLeft: i === 0 ? 0 : -overlap, width: size, height: size, borderRadius: "50%",
            background: "var(--surface-2)", boxShadow: `0 0 0 2px ${ring}`,
            animation: "w-shimmer 1.4s ease-in-out infinite", animationDelay: `${i * 0.15}s`,
          }} />
        ))}
      </div>
      <div style={{ width: 132, height: 10, borderRadius: 5, background: "var(--surface-2)",
        animation: "w-shimmer 1.4s ease-in-out infinite", animationDelay: "0.2s" }} />
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        {WATCHERS_COPY.loading}
      </span>
    </div>
  );
}

// ── Inline roster (expanded "see all") ───────────────────────────────────────
// Named watchers list individually (handles are PLAIN TEXT — no profile pages
// exist, so nothing is a link). Anon watchers collapse into ONE honest summary
// row ("14 other crawlers") — listing them individually wastes space and says
// nothing.
function WatchersRoster({ watchers, ring = "var(--surface-1)" }) {
  const named = watchers.filter((w) => w.handle);
  const anon = watchers.length - named.length;
  return (
    <div style={{ marginTop: 12, padding: 14, borderRadius: 12,
      background: "var(--surface-1)", border: "1px solid var(--border)" }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
        letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fg-subtle)", marginBottom: 12 }}>
        {WATCHERS_COPY.rosterTitle}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {named.map((w, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <WAvatar watcher={w} size={28} ring={ring} />
            <span style={{ fontFamily: "Inter, system-ui", fontSize: 13.5, letterSpacing: "-0.005em",
              fontWeight: 600, color: "var(--fg)" }}>{w.handle}</span>
          </div>
        ))}
        {anon > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10,
            paddingTop: named.length ? 10 : 0,
            borderTop: named.length ? "1px solid var(--border)" : "none" }}>
            <WAvatar watcher={{ handle: null }} size={28} ring={ring} />
            <span style={{ fontFamily: "Inter, system-ui", fontSize: 13.5, letterSpacing: "-0.005em",
              fontWeight: 600, color: "var(--fg-muted)" }}>{WATCHERS_COPY.rosterOthers(anon)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── The surface ──────────────────────────────────────────────────────────────
// role="group" + aria-label carries the whole sentence as prose (not a list) —
// screen readers announce "marisol, dev & priya + 11 more in the crawl,
// watching." in one breath. Avatars are decorative (aria-hidden).
function WatchersSurface({ watchers = [], loading = false, size = 24, ring = "var(--bg)",
                           startExpanded = false, expandable = true }) {
  const [open, setOpen] = w_useState(startExpanded);
  if (loading) return <WatchersSkeleton size={size} ring={ring} />;
  if (!watchers.length) return null;

  const { parts, aria, others, anonOnly, total } = watchersToParts(watchers);
  const canExpand = expandable && (others > 0 || (anonOnly && total > 3));

  return (
    <div>
      <div role="group" aria-label={aria}
        style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minHeight: 28 }}>
        <AvatarStack watchers={watchers} size={size} ring={ring} />
        <SentenceText parts={parts} />
        {canExpand && (
          <button type="button" className="w-see-all" aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            style={{ fontSize: 12, minHeight: 28, display: "inline-flex", alignItems: "center" }}>
            {open ? WATCHERS_COPY.rosterHide : WATCHERS_COPY.rosterToggle(total)}
          </button>
        )}
      </div>
      {anonOnly && (
        <div style={{ marginTop: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
          fontWeight: 600, letterSpacing: "0.04em", color: "var(--fg-subtle)" }}>
          {WATCHERS_COPY.countOnlyHonest}
        </div>
      )}
      {open && <WatchersRoster watchers={watchers} ring="var(--surface-1)" />}
    </div>
  );
}

// ── Watch button — copied from event-detail-v2, count TAIL REMOVED (Q6) ──────
// Verbatim visual (28px outline, don't restyle) minus the retired "N watching"
// tail. The alerts affordance that tail carried is rehomed as watchHint below.
function WatchShowButtonCC({ initialActive = false, initialConfirming = false }) {
  const [active, setActive] = w_useState(initialActive);
  const [confirming, setConfirming] = w_useState(initialConfirming);
  const baseBtn = {
    all: "unset", cursor: "pointer", boxSizing: "border-box",
    display: "inline-flex", alignItems: "center", gap: 6,
    height: 28, padding: "0 11px", borderRadius: 7,
    fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12, letterSpacing: "-0.005em",
  };
  if (active && confirming) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => { setActive(false); setConfirming(false); }}
          style={{ ...baseBtn, background: "transparent", color: "var(--warning)", border: "1px solid var(--warning)" }}>Stop watching</button>
        <button onClick={() => setConfirming(false)}
          style={{ ...baseBtn, padding: "0 8px", background: "transparent", color: "var(--fg-muted)", border: "1px solid var(--border)" }}>Cancel</button>
      </div>
    );
  }
  return (
    <button onClick={() => active ? setConfirming(true) : setActive(true)} style={{
      ...baseBtn,
      background: active ? "color-mix(in oklab, var(--accent) 12%, transparent)" : "transparent",
      color: active ? "var(--accent)" : "var(--fg)",
      border: active ? "1px solid var(--accent)" : "1px solid var(--border-strong)",
    }}>
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
        {active
          ? <path d="M2.5 6.5l2.5 2.5L9.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          : <path d="M6 2.5v7M2.5 6h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>}
      </svg>
      {active ? "Watching" : "Watch this show"}
    </button>
  );
}

// ── The adjacency: Watch button + watchers surface stacked ───────────────────
// This is the owned layout spec. Column, gap 12. Button row on top (unchanged);
// watchers surface directly beneath. Inactive → watchHint (rehomed alerts copy)
// sits between them so the affordance the retired count carried survives.
function WatchZone({ active = false, watchers = WATCHER_FIXTURES.few, loading = false,
                    startExpanded = false, ring = "var(--bg)" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
      <WatchShowButtonCC initialActive={active} />
      {!active && (
        <div style={{ fontFamily: "Inter, system-ui", fontSize: 11.5, color: "var(--fg-subtle)",
          letterSpacing: "-0.005em", marginTop: -4 }}>
          {WATCHERS_COPY.watchHint}
        </div>
      )}
      <WatchersSurface watchers={watchers} loading={loading} ring={ring} startExpanded={startExpanded} />
    </div>
  );
}

Object.assign(window, {
  WAvatar, AvatarStack, SentenceText, watchersToParts,
  WatchersSkeleton, WatchersRoster, WatchersSurface,
  WatchShowButtonCC, WatchZone,
});

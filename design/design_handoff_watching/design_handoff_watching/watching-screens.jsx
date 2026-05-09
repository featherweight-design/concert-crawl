// watching-screens.jsx — Phase 9 Saved/Watching surface
// Components for the consumer Watching list. Layout is grouped-by-date only
// (Tonight / This week / Next week / Month name) — the prior "digest" variant
// was deprecated; the change-summary in the header carries the price-moved
// signal without losing chronology. Desktop shell mirrors Browse's TopNav
// pattern (horizontal bar + cc wordmark); no separate sidebar.
//
// Voice: utilitarian, deadpan default. No "we'll notify you" promises live yet —
// alerts surface as a future-state row.
//
// Exports (all attached to window):
//   <WatchingRoute>           — mobile hub
//   <WatchingRouteDesktop>    — desktop topnav + main shell
//   <WatchingItem>            — single row. density = "compact" | "cozy" | "roomy"
//   <DeltaTag>                — saved→current delta token (arrow + amount)
//   <NotifyFutureRow>         — gray "coming soon" affordance
//   <WatchingEmpty>           — empty state

const { useState, useEffect, useMemo } = React;
const W_NOW_MS = new Date("2026-04-29T19:00:00Z").getTime();

// ── Tiny inline icons ─────────────────────────────────────────
function IconBookmark({ size = 16, filled = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M3.5 2.5h9v11l-4.5-3-4.5 3v-11z"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"
        fill={filled ? "currentColor" : "none"} />
    </svg>
  );
}
function IconBell({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M3 10.5h8M4 10.5V7a3 3 0 0 1 6 0v3.5M6 12.5a1 1 0 0 0 2 0"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconX({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
function IconArrowDown({ size = 10 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none">
      <path d="M5 1.5v7M2 5.5l3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconArrowUp({ size = 10 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none">
      <path d="M5 8.5v-7M2 4.5l3-3 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconClock({ size = 11 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
      <path d="M6 3.5V6l1.7 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Delta tag (saved → current) ──────────────────────────────
// Replaces the old per-row sparkline. Just an arrow + amount, plus tooltip
// with full context ("was $62 when you saved"). The tracking chart lives on
// Event Detail where it has room.
function DeltaTag({ saved, current, compact = false }) {
  if (saved == null || current == null) return null;
  const cls = w_classifyDelta(saved, current);
  if (cls === "fresh") {
    return (
      <span title={`Was $${saved} when you saved`} style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: compact ? 10 : 11, fontWeight: 600,
        color: "var(--fg-subtle)", letterSpacing: "0.04em", cursor: "help",
      }}>flat</span>
    );
  }
  const txt = w_formatDelta(saved, current);
  const color = cls === "drop" ? "var(--success)" : "var(--fg-muted)";
  const Arrow = cls === "drop" ? IconArrowDown : IconArrowUp;
  return (
    <span
      title={`${cls === "drop" ? "Down" : "Up"} from $${saved} when you saved`}
      style={{
        display: "inline-flex", alignItems: "center", gap: 3,
        fontFamily: "'JetBrains Mono', monospace", fontSize: compact ? 11 : 12,
        fontWeight: 700, color, letterSpacing: "0.01em", cursor: "help",
      }}
    >
      <Arrow size={9}/>{txt}
    </span>
  );
}

// ── Source pill (Resale / Community) ──────────────────────────
// Lives in the price column under the delta tag — it qualifies the *price*,
// not the artist. Always renders the full word; we never fall back to the
// 1-letter form, so the language is consistent across densities.
function SourcePill({ kind }) {
  if (kind !== "resale" && kind !== "community") return null;
  const isResale = kind === "resale";
  const label    = isResale ? "Resale" : "Community";
  const tip      = isResale
    ? "Resale price — secondary market, not face value"
    : "Community price — submitted by a fan";
  const color    = isResale ? "var(--warning)" : "var(--signal)";
  return (
    <span
      title={tip}
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9.5, fontWeight: 700,
        letterSpacing: "0.10em",
        textTransform: "uppercase", color,
        border: `1px solid ${color}`,
        padding: "1px 6px",
        borderRadius: 2,
        flexShrink: 0, cursor: "help",
      }}
    >
      {label}
    </span>
  );
}

// ── Single watching row ───────────────────────────────────────
// density: "compact" | "cozy" (default) | "roomy"
function WatchingItem({ show, density = "cozy", onRemove }) {
  const cls       = w_classifyDelta(show.savedPrice, show.currentPrice);
  const isSoldOut = show.status === "soldout";
  const isPresale = show.status === "presale";
  const isStale   = show.observedAt && (W_NOW_MS - new Date(show.observedAt).getTime()) > 24 * 3600 * 1000;
  const door      = w_doorIn(show.dateISO);
  const isTonight = door === "Tonight";

  // Density sizing. Right padding is generous so the remove-X never sits on text.
  const sizes = {
    compact: { art: 40, padY: 10, padL: 14, padR: 38, gap: 12, title: 13,   meta: 11,   price: 14 },
    cozy:    { art: 56, padY: 14, padL: 14, padR: 44, gap: 14, title: 14.5, meta: 11.5, price: 16 },
    roomy:   { art: 64, padY: 18, padL: 18, padR: 48, gap: 16, title: 16,   meta: 12,   price: 18 },
  }[density];

  const venueDate = `${show.venue} · ${show.dateLabel}${show.showTime ? ` · ${show.showTime}` : ""}`;

  return (
    <div
      data-screen-label={`row-${show.id}`}
      style={{
        display: "grid",
        gridTemplateColumns: `${sizes.art}px 1fr auto`,
        gap: sizes.gap,
        alignItems: "center",
        padding: `${sizes.padY}px ${sizes.padR}px ${sizes.padY}px ${sizes.padL}px`,
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        opacity: isSoldOut ? 0.78 : 1,
        position: "relative",
        fontFamily: "Inter, system-ui",
      }}
    >
      {/* Identity art */}
      <div style={{ width: sizes.art, height: sizes.art, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
        <IdentityArt name={show.artist} kind="artist" scale="tile" showInitials={false} grain={0.05}/>
      </div>

      {/* Title block */}
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: density === "roomy" ? 4 : 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <div style={{
            fontWeight: 700, fontSize: sizes.title, letterSpacing: "-0.01em",
            color: "var(--fg)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{show.artist}</div>
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: sizes.meta,
          color: "var(--fg-muted)", letterSpacing: "0.02em",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {venueDate}
        </div>
        {density === "roomy" && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginTop: 4,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5,
            color: "var(--fg-subtle)", letterSpacing: "0.02em",
          }}>
            <span>saved {w_relTime(show.savedAt)}</span>
            {show.savedPrice != null && (
              <>
                <span style={{ opacity: 0.4 }}>·</span>
                <span>at ${show.savedPrice}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Price column — current price + delta tag below. Sold-out renders an
          explicit pill instead of the price; presale renders an em-dash + label. */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "flex-end",
        gap: 4, flexShrink: 0,
      }}>
        {isSoldOut ? (
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
            color: "var(--warning)",
            background: "color-mix(in oklch, var(--warning) 14%, transparent)",
            border: "1px solid color-mix(in oklch, var(--warning) 40%, transparent)",
            padding: "3px 8px", borderRadius: 4,
            letterSpacing: "0.14em", textTransform: "uppercase",
          }}>Sold out</span>
        ) : isPresale ? (
          <>
            <span style={{ color: "var(--fg-subtle)", fontSize: sizes.price, fontWeight: 700,
              fontVariantNumeric: "tabular-nums" }}>—</span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
              color: "var(--fg-subtle)", letterSpacing: "0.10em", textTransform: "uppercase",
            }}>presale</span>
          </>
        ) : show.currentPrice == null ? (
          <span style={{ color: "var(--fg-subtle)", fontSize: sizes.price, fontWeight: 700 }}>—</span>
        ) : (
          <>
            <span style={{
              fontFamily: "Inter, system-ui",
              fontSize: sizes.price, fontWeight: 800, letterSpacing: "-0.01em",
              color: cls === "drop" ? "var(--success)" : "var(--fg)",
              fontVariantNumeric: "tabular-nums",
            }}>{w_formatUSD(show.currentPrice)}</span>
            <DeltaTag saved={show.savedPrice} current={show.currentPrice} compact={density === "compact"}/>
            {!isSoldOut && <SourcePill kind={show.sourceKind}/>}
            {isStale && (
              <span
                title={`Last checked ${w_relTime(show.observedAt)} — could be stale`}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--warning)",
                  border: "1px solid color-mix(in oklch, var(--warning) 50%, transparent)",
                  background: "color-mix(in oklch, var(--warning) 10%, transparent)",
                  padding: "1px 5px", borderRadius: 2,
                  marginTop: 2, cursor: "help",
                }}
              >
                Stale · {w_relTime(show.observedAt)}
              </span>
            )}
          </>
        )}
      </div>

      {/* Remove (X) — single tap, no confirm. Sits in the row's right gutter. */}
      <button
        onClick={() => onRemove && onRemove(show.id)}
        aria-label={`Stop watching ${show.artist}`}
        title="Stop watching"
        style={{
          position: "absolute", top: 8, right: 8,
          width: 24, height: 24, borderRadius: 6, border: "none", background: "transparent",
          color: "var(--fg-subtle)", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: 0.55, transition: "opacity 120ms, background 120ms",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; e.currentTarget.style.background = "var(--overlay-hover)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = 0.55; e.currentTarget.style.background = "transparent"; }}
      >
        <IconX size={11}/>
      </button>
    </div>
  );
}

// ── Notify-me future-state row ────────────────────────────────
// Same horizontal padding as a normal row so it doesn't read as squished.
function NotifyFutureRow() {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "14px 16px",
      background: "var(--surface-1)",
      border: "1px dashed var(--border-strong)",
      borderRadius: 12,
      color: "var(--fg-muted)",
      fontFamily: "Inter, system-ui",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--surface-2)", color: "var(--fg-subtle)", flexShrink: 0,
      }}>
        <IconBell size={16}/>
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg-muted)", letterSpacing: "-0.005em" }}>
          Price drop alerts
        </div>
        <div style={{ fontSize: 12, color: "var(--fg-subtle)", letterSpacing: "-0.005em", marginTop: 2 }}>
          Coming soon.
        </div>
      </div>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
        letterSpacing: "0.14em", textTransform: "uppercase",
        color: "var(--fg-subtle)",
        border: "1px solid var(--border-strong)",
        padding: "3px 7px", borderRadius: 3, flexShrink: 0,
      }}>Soon</span>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────
function WatchingEmpty() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 18, padding: "72px 32px 60px", textAlign: "center",
      fontFamily: "Inter, system-ui", color: "var(--fg)",
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 14,
        border: "1.5px dashed var(--border-strong)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--fg-subtle)",
      }}>
        <IconBookmark size={26}/>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.025em", color: "var(--fg)" }}>
          Crickets.
        </div>
        <div style={{ fontSize: 13.5, color: "var(--fg-muted)", lineHeight: 1.55, letterSpacing: "-0.005em", maxWidth: 300 }}>
          You're not watching any shows yet. Tap the bookmark on a show to keep an eye on its price.
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

// ── Header ────────────────────────────────────────────────────
// Two-line header: "Watching" eyebrow + plain count headline. Subline calls
// out drops/spikes/sold-out concretely — never the word "moved".
function WatchingHeader({ count, dropCount, spikeCount, soldOutCount }) {
  let sub;
  if (count === 0) {
    sub = "";
  } else if (dropCount === 0 && spikeCount === 0 && soldOutCount === 0) {
    sub = "Prices held since you saved.";
  } else {
    const parts = [];
    if (dropCount  > 0) parts.push(`${dropCount} dropped`);
    if (spikeCount > 0) parts.push(`${spikeCount} went up`);
    if (soldOutCount > 0) parts.push(`${soldOutCount} sold out`);
    sub = parts.join(" · ");
  }

  return (
    <div style={{
      padding: "20px 20px 16px", display: "flex", flexDirection: "column", gap: 6,
      borderBottom: "1px solid var(--border)",
      background: "var(--bg)",
    }}>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
        letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fg-subtle)",
      }}>Watching</span>
      <span style={{ fontFamily: "Inter, system-ui", fontSize: 26, fontWeight: 900,
        letterSpacing: "-0.025em", color: "var(--fg)" }}>
        {count} {count === 1 ? "show" : "shows"}
      </span>
      {sub && (
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600,
          color: dropCount > 0 ? "var(--success)" : "var(--fg-muted)",
          letterSpacing: "0.02em",
        }}>{sub}</span>
      )}
    </div>
  );
}

// ── Grouping helper ───────────────────────────────────────────
// Returns an ordered array of { key, label, shows } buckets.
// Tonight, This week, Next week, then month-name buckets in chronological order.
function groupByDateBuckets(shows) {
  const map = new Map();
  shows.forEach(s => {
    const key = w_groupForDate(s.dateISO);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  });

  const out = [];
  W_GROUP_ORDER.forEach(k => {
    if (map.has(k)) {
      out.push({ key: k, label: W_GROUP_LABEL[k], shows: map.get(k) });
      map.delete(k);
    }
  });
  // Remaining keys are month names — sort by first show's date.
  const remaining = [...map.entries()]
    .map(([k, v]) => ({ key: k, label: k, shows: v, sort: new Date(v[0].dateISO).getTime() }))
    .sort((a, b) => a.sort - b.sort);
  remaining.forEach(r => out.push({ key: r.key, label: r.label, shows: r.shows }));
  return out;
}

// ── Bodies ────────────────────────────────────────────────────
function GroupedBody({ shows, density, onRemove, showNotifyTeaser }) {
  const buckets = groupByDateBuckets(shows);
  return (
    <>
      {buckets.map(b => (
        <Section key={b.key} title={b.label} subtitle={`${b.shows.length}`} accent={b.key === "tonight"}>
          {b.shows.map(s => <WatchingItem key={s.id} show={s} density={density} onRemove={onRemove}/>)}
        </Section>
      ))}
      {showNotifyTeaser && <div style={{ marginTop: 8 }}><NotifyFutureRow/></div>}
    </>
  );
}

function Section({ title, subtitle, accent, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "10px 4px 4px" }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: accent ? "var(--accent)" : "var(--fg-subtle)",
        }}>{title}</span>
        {subtitle && (
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 500,
            color: "var(--fg-subtle)", letterSpacing: "0.04em",
          }}>· {subtitle}</span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </div>
  );
}

// ── Mobile route ──────────────────────────────────────────────
// Grouped-by-date is the only layout. We removed the Digest variant after
// consolidating on a single source of truth: chronology + the change-summary
// in the header.
function WatchingRoute({
  shows = W_SHOWS,
  density = "cozy",
  showNotifyTeaser = true,
  themeKey = "electric",
}) {
  const [list, setList] = useState(shows);
  useEffect(() => { setList(shows); }, [shows]);
  const remove = (id) => setList(prev => prev.filter(s => s.id !== id));

  const future   = list.filter(s => w_daysUntil(s.dateISO) >= 0);
  const sorted   = [...future].sort((a,b) => new Date(a.dateISO) - new Date(b.dateISO));
  const dropped  = sorted.filter(s => w_classifyDelta(s.savedPrice, s.currentPrice) === "drop").length;
  const spiked   = sorted.filter(s => w_classifyDelta(s.savedPrice, s.currentPrice) === "spike").length;
  const soldOut  = sorted.filter(s => s.status === "soldout").length;

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "var(--bg)", color: "var(--fg)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <WatchingHeader
        count={sorted.length}
        dropCount={dropped}
        spikeCount={spiked}
        soldOutCount={soldOut}
      />
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 100px", display: "flex", flexDirection: "column", gap: 10 }}>
        {sorted.length === 0 ? (
          <WatchingEmpty />
        ) : (
          <GroupedBody shows={sorted} density={density} onRemove={remove} showNotifyTeaser={showNotifyTeaser}/>
        )}
      </div>
    </div>
  );
}

// ── Desktop TopNav (matches Browse's pattern) ─────────────────
function WatchingTopNav({ active = "saved" }) {
  // Submit-a-price isn't global — it lives on a show's detail page. TopNav is
  // just the three top-level destinations.
  const tabs = [
    { key: "browse", label: "Browse" },
    { key: "search", label: "Search" },
    { key: "saved",  label: "Watching" },
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

// ── Desktop route ─────────────────────────────────────────────
// TopNav pattern (matches Browse), single-column main with maxWidth cap.
function WatchingRouteDesktop({
  shows = W_SHOWS,
  density = "cozy",
  showNotifyTeaser = true,
}) {
  const [list, setList] = useState(shows);
  useEffect(() => { setList(shows); }, [shows]);
  const remove = (id) => setList(prev => prev.filter(s => s.id !== id));
  const future  = list.filter(s => w_daysUntil(s.dateISO) >= 0);
  const sorted  = [...future].sort((a,b) => new Date(a.dateISO) - new Date(b.dateISO));
  const dropped = sorted.filter(s => w_classifyDelta(s.savedPrice, s.currentPrice) === "drop").length;
  const spiked  = sorted.filter(s => w_classifyDelta(s.savedPrice, s.currentPrice) === "spike").length;
  const soldOut = sorted.filter(s => s.status === "soldout").length;

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "var(--bg)", color: "var(--fg)",
      display: "flex", flexDirection: "column", overflow: "hidden",
      fontFamily: "Inter, system-ui",
    }}>
      <WatchingTopNav active="saved"/>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "32px 32px 80px" }}>
          {/* Headline */}
          <div style={{ marginBottom: 24, paddingBottom: 18, borderBottom: "1px solid var(--border)" }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
              letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fg-subtle)",
              marginBottom: 6,
            }}>Watching</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 18, flexWrap: "wrap" }}>
              <span style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-0.025em", color: "var(--fg)" }}>
                {sorted.length} {sorted.length === 1 ? "show" : "shows"}
              </span>
              {sorted.length > 0 && (
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600,
                  color: dropped > 0 ? "var(--success)" : "var(--fg-muted)", letterSpacing: "0.02em",
                }}>
                  {(() => {
                    const parts = [];
                    if (dropped > 0) parts.push(`${dropped} dropped`);
                    if (spiked  > 0) parts.push(`${spiked} went up`);
                    if (soldOut > 0) parts.push(`${soldOut} sold out`);
                    return parts.length === 0 ? "prices held" : parts.join(" · ");
                  })()}
                </span>
              )}
            </div>
          </div>

          {sorted.length === 0 ? (
            <WatchingEmpty/>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <GroupedBody shows={sorted} density={density} onRemove={remove} showNotifyTeaser={showNotifyTeaser}/>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Brand mark ────────────────────────────────────────────────
// Canonical Concert Crawl mark — focal halo + dotted trail on a rounded
// dark square. Sourced from design_handoff_brand_and_theming. Tokenized
// so it picks up --bg / --accent / --signal across themes.
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
function _CCMarkLegacy({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect width="28" height="28" rx="7" fill="var(--signal)"/>
      <path
        d="M19 10.5a4.5 4.5 0 1 0 0 7M19 10.5h-2.5"
        stroke="var(--bg)" strokeWidth="2.2" strokeLinecap="round" fill="none"
      />
      <circle cx="10.5" cy="19.5" r="1.6" fill="var(--accent)"/>
    </svg>
  );
}

Object.assign(window, {
  WatchingRoute, WatchingRouteDesktop, WatchingTopNav, CCMark,
  WatchingItem, DeltaTag, SourcePill,
  NotifyFutureRow, WatchingEmpty,
  IconBookmark, IconBell, IconClock,
});

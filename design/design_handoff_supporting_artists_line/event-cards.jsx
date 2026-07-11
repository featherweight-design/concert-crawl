// event-cards.jsx — reference surfaces for #643, rebuilt to consume EventTitleBlock.
// These mirror the real components named in the brief:
//   EventCard.tsx (browse, watching) · HeroEventCard.tsx · events/[id]/page.tsx
// Visual vocabulary lifted from browse-home.jsx (EventRow / HeroCard). Token-only.

// ── ArtistImage — copy of CCArtistImage from browse-home.jsx (source of truth) ──
function SALArtistImage({ artist, size = 56, rounded = false, fullBleed = false, height = 180 }) {
  const hash = artist.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const hues = [280, 200, 340, 160, 30, 220, 310, 180, 50, 260];
  const hue = hues[hash % hues.length];
  const initial = artist.charAt(0).toUpperCase();
  return (
    <div style={{
      width: fullBleed ? "100%" : size, height: fullBleed ? height : size, flexShrink: 0,
      borderRadius: rounded ? size : fullBleed ? 0 : 8,
      background: `linear-gradient(135deg, oklch(0.35 0.08 ${hue}), oklch(0.22 0.06 ${hue + 40}))`,
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
    }}>
      <span style={{
        fontFamily: "Inter, system-ui", fontWeight: 800,
        fontSize: fullBleed ? 64 : size * 0.4,
        color: `oklch(0.75 0.12 ${hue})`, opacity: 0.7, letterSpacing: "-0.02em",
      }}>{initial}</span>
      <div style={{ position: "absolute", inset: 0, background: "var(--image-tint)" }} />
    </div>
  );
}

// ── Meta line (venue · time · price) — the OTHER middot line, kept distinct ──
function MetaLine({ venue, time, price, dim = false }) {
  const c = dim ? "var(--fg-subtle)" : "var(--fg-muted)";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 5, marginTop: 5,
      fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
      color: c, letterSpacing: "0.02em", minWidth: 0,
    }}>
      <span style={{ color: dim ? c : "var(--signal)", whiteSpace: "nowrap" }}>{venue}</span>
      <span style={{ opacity: 0.4 }}>·</span>
      <span style={{ whiteSpace: "nowrap" }}>{time}</span>
      {price && <>
        <span style={{ opacity: 0.4 }}>·</span>
        <span style={{ color: dim ? c : "var(--signal)", whiteSpace: "nowrap" }}>{price}</span>
      </>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EventCard — compact list row (browse + watching). The 320px overflow surface.
// ─────────────────────────────────────────────────────────────────────────────
function EventCard({ event, opts = {} }) {
  const {
    variant = "billing", separator = "middot", lead, tourPlacement = "eyebrow",
    maxInline = 2, interactive = false, onArtist,
  } = opts;
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "12px 14px", borderRadius: 12,
      background: "var(--surface-1)", border: "1px solid var(--border)",
    }}>
      <SALArtistImage artist={event.headliner} size={56} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <EventTitleBlock
          headliner={event.headliner}
          supportingArtists={event.supportingArtists}
          tourName={event.tourName}
          surface="card"
          variant={variant}
          separator={separator}
          lead={lead}
          tourPlacement={tourPlacement}
          maxInline={maxInline}
          status={event.status}
          interactive={interactive}
          onArtist={onArtist}
        />
        <MetaLine venue={event.venue} time={event.time} price={event.price} dim={!!event.status} />
      </div>
      {event.price && !event.status && (
        <span style={{
          fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 14,
          color: "var(--signal)", letterSpacing: "-0.01em", flexShrink: 0, marginTop: 1,
        }}>{event.price.split("–")[0]}</span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HeroEventCard — full-bleed art + gradient, title block sits over the image
// ─────────────────────────────────────────────────────────────────────────────
function HeroEventCard({ event, opts = {} }) {
  const {
    variant = "billing", separator = "middot", lead, tourPlacement = "eyebrow",
    maxInline = 3, interactive = false, onArtist,
  } = opts;
  return (
    <div style={{
      borderRadius: 16, overflow: "hidden", background: "var(--surface-1)",
      border: "1px solid var(--border-strong)", position: "relative",
    }}>
      <div style={{ position: "relative" }}>
        <SALArtistImage artist={event.headliner} fullBleed height={200} />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, transparent 24%, var(--bg) 104%)",
        }} />
        <div style={{
          position: "absolute", top: 12, left: 12,
          padding: "3px 8px", borderRadius: 4, background: "var(--accent)",
          color: "var(--fg-on-accent)", fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
        }}>★ tonight's pick</div>
      </div>
      <div style={{ padding: "0 18px 18px", marginTop: -52, position: "relative" }}>
        <EventTitleBlock
          headliner={event.headliner}
          supportingArtists={event.supportingArtists}
          tourName={event.tourName}
          surface="hero"
          variant={variant}
          separator={separator}
          lead={lead}
          tourPlacement={tourPlacement}
          maxInline={maxInline}
          status={event.status}
          interactive={interactive}
          onArtist={onArtist}
        />
        <MetaLine venue={event.venue} time={event.time} price={event.price} dim={!!event.status} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DetailHeader — event detail page. Full room: openers can wrap, no truncation.
// ─────────────────────────────────────────────────────────────────────────────
function DetailHeader({ event, opts = {} }) {
  const {
    variant = "billing", separator = "middot", lead, tourPlacement = "eyebrow",
    interactive = false, onArtist,
  } = opts;
  return (
    <div style={{ padding: "26px 24px 22px" }}>
      <EventTitleBlock
        headliner={event.headliner}
        supportingArtists={event.supportingArtists}
        tourName={event.tourName}
        surface="detail"
        variant={variant}
        separator={separator}
        lead={lead}
        tourPlacement={tourPlacement}
        maxInline={null}
        status={event.status}
        interactive={interactive}
        onArtist={onArtist}
      />
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginTop: 16,
        fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
        color: "var(--fg-muted)", letterSpacing: "0.04em", flexWrap: "wrap",
      }}>
        <span style={{ color: "var(--signal)" }}>{event.venue}</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>{event.dateLong || event.time}</span>
        {event.price && <>
          <span style={{ opacity: 0.4 }}>·</span>
          <span style={{ color: "var(--signal)" }}>{event.price}</span>
        </>}
      </div>
    </div>
  );
}

Object.assign(window, {
  SALArtistImage, MetaLine, EventCard, HeroEventCard, DetailHeader,
});

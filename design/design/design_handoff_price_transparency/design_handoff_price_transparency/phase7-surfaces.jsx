// phase7-surfaces.jsx — Mock surfaces for Phase 7
// Trimmed-down Event Detail (mobile + desktop) and Browse list,
// just enough to show the price block in context. The full versions live
// in detail-screens.jsx / detail-desktop.jsx / browse-home.jsx — these
// mocks intentionally drop chrome (status bar, top nav) since the canvas
// labels each artboard.

const ELECTRIC_TOKENS_S = window.CC_THEMES.electric.tokens;
function tVarsS(tokens) {
  const v = {};
  for (const [k, val] of Object.entries(tokens)) v[`--${k}`] = val;
  return v;
}

// ── Tiny shared bits ───────────────────────────────────────────
function HeroBand({ artist, height = 200, hueSource }) {
  const hash = (hueSource || artist).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const hues = [280, 200, 340, 160, 30, 220, 310, 180, 50, 260];
  const hue = hues[hash % hues.length];
  return (
    <div style={{
      width: "100%", height, flexShrink: 0,
      background: `linear-gradient(135deg, oklch(0.35 0.08 ${hue}), oklch(0.22 0.06 ${hue + 40}))`,
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
    }}>
      <span style={{
        fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: height * 0.4,
        color: `oklch(0.75 0.12 ${hue})`, opacity: 0.6,
        letterSpacing: "-0.03em",
      }}>{artist.charAt(0)}</span>
      <div style={{ position: "absolute", inset: 0, background: "var(--image-tint)" }}/>
    </div>
  );
}

function InfoRowS({ icon, label, value, signal = false }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
      <div style={{ width: 16, height: 16, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: "var(--fg-subtle)", letterSpacing: "0.06em", textTransform: "uppercase",
        }}>{label}</div>
        <div style={{
          fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 14,
          color: signal ? "var(--signal)" : "var(--fg)", marginTop: 1,
          letterSpacing: "-0.01em",
        }}>{value}</div>
      </div>
    </div>
  );
}

function ChipRowS({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
      {items.map(g => (
        <span key={g} style={{
          padding: "3px 8px", borderRadius: 4,
          background: "var(--surface-3)", color: "var(--fg-muted)",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          letterSpacing: "0.03em",
        }}>{g}</span>
      ))}
    </div>
  );
}

// ── Icons ───────────────────────────────────────────────────────
const IconPinS = () => (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5C5.24 1.5 3 3.74 3 6.5C3 10.25 8 14.5 8 14.5C8 14.5 13 10.25 13 6.5C13 3.74 10.76 1.5 8 1.5Z" stroke="var(--fg-subtle)" strokeWidth="1.5" strokeLinejoin="round"/><circle cx="8" cy="6.5" r="2" stroke="var(--fg-subtle)" strokeWidth="1.5"/></svg>);
const IconCalS = () => (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="2" stroke="var(--fg-subtle)" strokeWidth="1.5"/><path d="M2 7h12" stroke="var(--fg-subtle)" strokeWidth="1.5"/><path d="M5.5 1.5v3M10.5 1.5v3" stroke="var(--fg-subtle)" strokeWidth="1.5" strokeLinecap="round"/></svg>);
const IconClockS = () => (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="var(--fg-subtle)" strokeWidth="1.5"/><path d="M8 4.5V8l3 1.5" stroke="var(--fg-subtle)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const IconUsersS = () => (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="2.5" stroke="var(--fg-subtle)" strokeWidth="1.5"/><path d="M1 14c0-2.8 2.2-4.5 5-4.5s5 1.7 5 4.5" stroke="var(--fg-subtle)" strokeWidth="1.5" strokeLinecap="round"/><circle cx="11.5" cy="5.5" r="2" stroke="var(--fg-subtle)" strokeWidth="1.2"/><path d="M12.5 9.5c1.8.4 3 1.6 3 3.5" stroke="var(--fg-subtle)" strokeWidth="1.2" strokeLinecap="round"/></svg>);

// ============================================================
// MOCK EVENT DETAIL — MOBILE
// Renders header + info + price block (variant) + CTA + footer space.
// One "frame" worth of vertical content.
// ============================================================
function MockEventDetailMobile({ event, variant = "A", tone = "deadpan", themeTokens = ELECTRIC_TOKENS_S }) {
  const Block =
    variant === "B" ? window.PriceBlockB :
    variant === "C" ? window.PriceBlockC :
                      window.PriceBlockA;

  // Variant A is an InfoRow that lives inside the info block.
  // Variants B and C are dedicated sections that sit between the info
  // block and the CTA. We render the info block accordingly.
  return (
    <div style={{
      ...tVarsS(themeTokens),
      width: "100%", height: "100%",
      background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui", overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      <HeroBand artist={event.artist} height={180} hueSource={event.artist}/>
      <div style={{
        flex: 1, padding: "14px 18px 18px", overflow: "hidden",
        display: "flex", flexDirection: "column",
      }}>
        <ChipRowS items={event.genre}/>
        <h1 style={{
          margin: 0, fontWeight: 900, fontSize: 24,
          letterSpacing: "-0.03em", lineHeight: 1.1,
        }}>{event.artist}</h1>
        {event.title !== event.artist && (
          <div style={{
            fontWeight: 500, fontSize: 13, color: "var(--fg-muted)",
            marginTop: 4, letterSpacing: "-0.005em",
          }}>{event.title}</div>
        )}

        {/* Info block */}
        <div style={{
          marginTop: 12, padding: "2px 0",
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
        }}>
          <InfoRowS icon={<IconPinS/>}    label="Venue"        value={event.venue}/>
          <InfoRowS icon={<IconCalS/>}    label="Date"         value={event.date}/>
          <InfoRowS icon={<IconClockS/>}  label="Doors / Show" value={`${event.doors} / ${event.showTime}`}/>
          {variant === "A" && <Block price={event.price} tone={tone}/>}
          <InfoRowS icon={<IconUsersS/>}  label="Ages"         value={event.ages}/>
        </div>

        {/* Variant B / C — dedicated sections */}
        {variant === "B" && <Block price={event.price} tone={tone}/>}
        {variant === "C" && <Block price={event.price} tone={tone}/>}

        {/* CTA */}
        <button style={{
          all: "unset", cursor: "pointer", marginTop: 16,
          display: "flex", width: "100%", height: 44, borderRadius: 10,
          background: event.price && event.price.status === "soldout" ? "var(--surface-2)" : "var(--accent)",
          color: event.price && event.price.status === "soldout" ? "var(--fg-muted)" : "var(--fg-on-accent)",
          fontWeight: 800, fontSize: 14,
          letterSpacing: "-0.01em", alignItems: "center", justifyContent: "center",
          boxSizing: "border-box",
          border: event.price && event.price.status === "soldout" ? "1px solid var(--border-strong)" : "none",
        }}>
          {event.price && event.price.status === "soldout"
            ? "Show closed"
            : event.price ? "Get tickets ↗" : "Add to my list"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// MOCK EVENT DETAIL — DESKTOP (no top nav, no breadcrumb chrome —
// the canvas labels handle that). Centered ~520px article column to
// match the hi-fi pages.
// ============================================================
function MockEventDetailDesktop({ event, variant = "A", tone = "deadpan", themeTokens = ELECTRIC_TOKENS_S }) {
  const Block =
    variant === "B" ? window.PriceBlockB :
    variant === "C" ? window.PriceBlockC :
                      window.PriceBlockA;
  return (
    <div style={{
      ...tVarsS(themeTokens),
      width: "100%", height: "100%",
      background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui", overflow: "hidden",
      display: "flex", justifyContent: "center",
    }}>
      <div style={{
        width: "100%", maxWidth: 540, padding: "20px 28px",
        display: "flex", flexDirection: "column",
      }}>
        {/* Breadcrumb */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6, marginBottom: 14,
          fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 12,
          color: "var(--fg-muted)",
        }}>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
            <path d="M11 4L5 8l6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
          <span>Browse</span>
          <span style={{ color: "var(--fg-subtle)", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>/</span>
          <span style={{ color: "var(--fg)" }}>{event.artist}</span>
        </div>

        <div style={{
          borderRadius: 12, overflow: "hidden",
          border: "1px solid var(--border)",
        }}>
          <HeroBand artist={event.artist} height={210} hueSource={event.artist}/>
        </div>

        <div style={{ marginTop: 16 }}>
          <ChipRowS items={event.genre}/>
          <h1 style={{
            margin: 0, fontWeight: 900, fontSize: 30,
            letterSpacing: "-0.03em", lineHeight: 1.05,
          }}>{event.artist}</h1>
          {event.title !== event.artist && (
            <div style={{
              fontWeight: 500, fontSize: 14, color: "var(--fg-muted)",
              marginTop: 5, letterSpacing: "-0.005em",
            }}>{event.title}</div>
          )}
        </div>

        {/* Info block — desktop slightly looser */}
        <div style={{
          marginTop: 14, padding: "2px 0",
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
        }}>
          <InfoRowS icon={<IconPinS/>}    label="Venue"        value={event.venue}/>
          <InfoRowS icon={<IconCalS/>}    label="Date"         value={event.date}/>
          <InfoRowS icon={<IconClockS/>}  label="Doors / Show" value={`${event.doors} / ${event.showTime}`}/>
          {variant === "A" && <Block price={event.price} tone={tone}/>}
          <InfoRowS icon={<IconUsersS/>}  label="Ages"         value={event.ages}/>
        </div>

        {variant === "B" && <Block price={event.price} tone={tone}/>}
        {variant === "C" && <Block price={event.price} tone={tone}/>}

        <button style={{
          all: "unset", cursor: "pointer", marginTop: 16,
          display: "flex", height: 46, borderRadius: 10,
          background: event.price && event.price.status === "soldout" ? "var(--surface-2)" : "var(--accent)",
          color: event.price && event.price.status === "soldout" ? "var(--fg-muted)" : "var(--fg-on-accent)",
          fontWeight: 800, fontSize: 14,
          letterSpacing: "-0.01em", alignItems: "center", justifyContent: "center",
          boxSizing: "border-box", padding: "0 24px", alignSelf: "flex-start",
          border: event.price && event.price.status === "soldout" ? "1px solid var(--border-strong)" : "none",
        }}>
          {event.price && event.price.status === "soldout"
            ? "Show closed"
            : event.price ? "Get tickets ↗" : "Add to my list"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// MOCK BROWSE LIST — shows the new price chip across event types
// ============================================================
function ArtistTile({ artist, size = 44 }) {
  const hash = artist.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const hues = [280, 200, 340, 160, 30, 220, 310, 180, 50, 260];
  const hue = hues[hash % hues.length];
  return (
    <div style={{
      width: size, height: size, flexShrink: 0, borderRadius: 6,
      background: `linear-gradient(135deg, oklch(0.35 0.08 ${hue}), oklch(0.22 0.06 ${hue + 40}))`,
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
    }}>
      <span style={{
        fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: size * 0.42,
        color: `oklch(0.75 0.12 ${hue})`, opacity: 0.7, letterSpacing: "-0.02em",
      }}>{artist.charAt(0)}</span>
      <div style={{ position: "absolute", inset: 0, background: "var(--image-tint)" }}/>
    </div>
  );
}

function venueShortS(v) {
  const map = {
    "Red Rocks Amphitheatre": "Red Rocks",
    "Mission Ballroom": "Mission",
    "Ogden Theatre": "Ogden",
    "Gothic Theatre": "Gothic",
    "Bluebird Theater": "Bluebird",
  };
  return map[v] || v;
}

function MockBrowseRow({ event, tone = "deadpan" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 0" }}>
      <ArtistTile artist={event.artist}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 14,
          color: "var(--fg)", letterSpacing: "-0.01em",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{event.artist}</div>
        <div style={{
          display: "flex", gap: 5, marginTop: 2, alignItems: "center",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
          color: "var(--fg-muted)", letterSpacing: "0.02em",
        }}>
          <span>{venueShortS(event.venue)}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{event.showTime}</span>
        </div>
      </div>
      {event.price ? (
        <window.PriceChip price={event.price} tone={tone}/>
      ) : (
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: "var(--fg-subtle)", letterSpacing: "0.04em",
          textTransform: "uppercase", flexShrink: 0,
        }}>tba</span>
      )}
    </div>
  );
}

function MockBrowseList({ events, tone = "deadpan", themeTokens = ELECTRIC_TOKENS_S, label = "Tonight" }) {
  return (
    <div style={{
      ...tVarsS(themeTokens),
      width: "100%", height: "100%",
      background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui", overflow: "hidden",
      padding: "16px 16px",
      display: "flex", flexDirection: "column", gap: 0,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, paddingBottom: 4,
      }}>
        <span style={{
          fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 12,
          color: "var(--accent)", letterSpacing: "0.05em", textTransform: "uppercase",
        }}>{label}</span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }}/>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: "var(--fg-subtle)",
        }}>{events.length} shows</span>
      </div>
      {events.map((e, i) => (
        <React.Fragment key={i}>
          {i > 0 && <div style={{ height: 1, background: "var(--border)", marginLeft: 55 }}/>}
          <MockBrowseRow event={e} tone={tone}/>
        </React.Fragment>
      ))}
    </div>
  );
}

window.MockEventDetailMobile  = MockEventDetailMobile;
window.MockEventDetailDesktop = MockEventDetailDesktop;
window.MockBrowseList         = MockBrowseList;

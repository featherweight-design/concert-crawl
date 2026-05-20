// Event Detail + Venue Profile — hi-fi mobile mocks (375pt iPhone)
// Electric theme, fully tokenized. Two screens side by side in IOSDevice frames.
// v2: custom icons, consistency pass, directions link, outdoor chip moved to stats

// ── Tokens ─────────────────────────────────────────────────────
const ELECTRIC_TOKENS = {
  "bg":            "#070A1A",
  "bg-elevated":   "#0E1226",
  "surface-1":     "#11162E",
  "surface-2":     "#171D3A",
  "surface-3":     "#1F2748",
  "fg":            "#E8F3FF",
  "fg-muted":      "#9AA8C7",
  "fg-subtle":     "#5A6788",
  "fg-on-accent":  "#070A1A",
  "border":        "#1F2748",
  "border-strong": "#2C3661",
  "border-focus":  "#7AE6FF",
  "signal":        "#7AE6FF",
  "signal-muted":  "#3FA3C2",
  "accent":        "#FF7BD4",
  "accent-muted":  "#B8559A",
  "success":       "#7BFFB0",
  "warning":       "#FFD27A",
  "danger":        "#FF7A8A",
  "focus":         "#7AE6FF",
  "overlay-hover": "rgba(122,230,255,0.08)",
  "overlay-press": "rgba(122,230,255,0.16)",
  "scrim":         "rgba(7,10,26,0.72)",
  "image-tint":    "rgba(7,10,26,0.20)",
};

function tVars(tokens) {
  const v = {};
  for (const [k, val] of Object.entries(tokens)) v[`--${k}`] = val;
  return v;
}

// ── Custom line icons (16×16, 1.5px stroke) ────────────────────
// Consistent weight across all icons — no emoji.
function IconPin() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 1.5C5.24 1.5 3 3.74 3 6.5C3 10.25 8 14.5 8 14.5C8 14.5 13 10.25 13 6.5C13 3.74 10.76 1.5 8 1.5Z" stroke="var(--fg-subtle)" strokeWidth="1.5" strokeLinejoin="round"/>
      <circle cx="8" cy="6.5" r="2" stroke="var(--fg-subtle)" strokeWidth="1.5"/>
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="11" rx="2" stroke="var(--fg-subtle)" strokeWidth="1.5"/>
      <path d="M2 7h12" stroke="var(--fg-subtle)" strokeWidth="1.5"/>
      <path d="M5.5 1.5v3M10.5 1.5v3" stroke="var(--fg-subtle)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="var(--fg-subtle)" strokeWidth="1.5"/>
      <path d="M8 4.5V8l3 1.5" stroke="var(--fg-subtle)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconTicket() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M1.5 5a2 2 0 010 4v3.5h13V9a2 2 0 010-4V1.5h-13V5z" stroke="var(--fg-subtle)" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M6 5.5v5" stroke="var(--fg-subtle)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="1.5 2"/>
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="6" cy="5" r="2.5" stroke="var(--fg-subtle)" strokeWidth="1.5"/>
      <path d="M1 14c0-2.8 2.2-4.5 5-4.5s5 1.7 5 4.5" stroke="var(--fg-subtle)" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="11.5" cy="5.5" r="2" stroke="var(--fg-subtle)" strokeWidth="1.2"/>
      <path d="M12.5 9.5c1.8.4 3 1.6 3 3.5" stroke="var(--fg-subtle)" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}
function IconDirections() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1l5.5 5.5L7 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12.5 6.5H5a3.5 3.5 0 00-3.5 3.5v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

// ── Shared components ──────────────────────────────────────────

// Standardized hero image — works for both artist and venue
function HeroImage({ label, height = 320, hueSource = "", venueStyle = false }) {
  const hash = hueSource.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const hues = venueStyle ? [30, 160, 260, 80, 320, 200] : [280, 200, 340, 160, 30, 220, 310, 180, 50, 260];
  const hue = hues[hash % hues.length];
  return (
    <div style={{
      width: "100%", height, flexShrink: 0,
      background: `linear-gradient(${venueStyle ? 160 : 135}deg, oklch(${venueStyle ? 0.28 : 0.35} 0.08 ${hue}), oklch(${venueStyle ? 0.18 : 0.22} 0.06 ${hue + 40}))`,
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
    }}>
      <span style={{
        fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: height * 0.33,
        color: `oklch(${venueStyle ? 0.60 : 0.75} 0.12 ${hue})`, opacity: venueStyle ? 0.5 : 0.6,
        letterSpacing: "-0.03em",
      }}>{label}</span>
      <div style={{ position: "absolute", inset: 0, background: "var(--image-tint)" }} />
    </div>
  );
}

function BackButton() {
  return (
    <div style={{
      position: "absolute", top: 56, left: 14, zIndex: 20,
      width: 36, height: 36, borderRadius: 18,
      background: "var(--scrim)",
      display: "flex", alignItems: "center", justifyContent: "center",
      cursor: "pointer",
    }}>
      <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
        <path d="M8 2L2 8l6 6" stroke="var(--fg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

function SaveButton() {
  return (
    <div style={{
      position: "absolute", top: 56, right: 14, zIndex: 20,
      width: 36, height: 36, borderRadius: 18,
      background: "var(--scrim)",
      display: "flex", alignItems: "center", justifyContent: "center",
      cursor: "pointer",
    }}>
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
        <path d="M9 15l-6.5-6A3.5 3.5 0 019 4.5 3.5 3.5 0 0115.5 9L9 15z" stroke="var(--fg)" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

function InfoRow({ icon, label, value, signal = false, onClick = null }) {
  const inner = (
    <>
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
          textDecoration: onClick ? "underline" : "none",
          textDecorationColor: onClick ? "var(--border-strong)" : "transparent",
          textUnderlineOffset: 3,
        }}>{value}</div>
      </div>
      {onClick && (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: "var(--fg-subtle)" }}>
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      )}
    </>
  );
  if (onClick) {
    return (
      <button onClick={onClick} style={{
        all: "unset", cursor: "pointer", display: "flex", alignItems: "center",
        gap: 10, padding: "8px 0", width: "100%", boxSizing: "border-box",
      }}>{inner}</button>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>{inner}</div>
  );
}

// Standardized genre/type chips
function ChipRow({ items }) {
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

// Section header — consistent across both screens
function SectionHeader({ title, count }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, marginBottom: 4,
    }}>
      <span style={{
        fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 14,
        color: "var(--fg)", letterSpacing: "-0.01em",
        whiteSpace: "nowrap",
      }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      {count != null && (
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: "var(--fg-subtle)",
          whiteSpace: "nowrap",
        }}>{count}</span>
      )}
    </div>
  );
}

// About section — consistent across both screens
function AboutSection({ text }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
        color: "var(--fg-subtle)", letterSpacing: "0.06em", textTransform: "uppercase",
        marginBottom: 6,
      }}>About</div>
      <p style={{
        margin: 0, fontFamily: "Inter, system-ui", fontSize: 13,
        color: "var(--fg-muted)", lineHeight: 1.55, textWrap: "pretty",
      }}>{text}</p>
    </div>
  );
}

function SmallEventRow({ artist, venue, date, time, price }) {
  const hash = artist.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const hues = [280, 200, 340, 160, 30, 220, 310, 180, 50, 260];
  const hue = hues[hash % hues.length];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0" }}>
      <div style={{
        width: 40, height: 40, borderRadius: 6, flexShrink: 0,
        background: `linear-gradient(135deg, oklch(0.35 0.08 ${hue}), oklch(0.22 0.06 ${hue + 40}))`,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
      }}>
        <span style={{
          fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 16,
          color: `oklch(0.75 0.12 ${hue})`, opacity: 0.7,
        }}>{artist.charAt(0)}</span>
        <div style={{ position: "absolute", inset: 0, background: "var(--image-tint)" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13,
          color: "var(--fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{artist}</div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: "var(--fg-muted)", marginTop: 1,
        }}>{venue ? venue + " · " : ""}{date} · {time}</div>
      </div>
      {price ? (
        <span style={{
          fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 12,
          color: "var(--signal)", flexShrink: 0,
        }}>{price}</span>
      ) : (
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: "var(--fg-subtle)", flexShrink: 0,
        }}>tba</span>
      )}
    </div>
  );
}

function EventRowDivider() {
  return <div style={{ height: 1, background: "var(--border)", marginLeft: 50 }} />;
}

// Map placeholder — shared, consistent
function MapPlaceholder({ address }) {
  return (
    <div style={{
      height: 110, borderRadius: 10,
      background: "var(--surface-1)", border: "1px solid var(--border)",
      overflow: "hidden", position: "relative",
    }}>
      <svg width="100%" height="100%" viewBox="0 0 360 110" preserveAspectRatio="xMidYMid slice">
        <rect width="360" height="110" fill="var(--surface-1)" />
        <g stroke="var(--border-strong)" strokeWidth="0.6" fill="none" opacity="0.6">
          <path d="M 0 28 Q 90 23 180 33 T 360 26" />
          <path d="M 0 55 Q 120 50 200 62 T 360 57" />
          <path d="M 0 82 Q 80 77 160 87 T 360 80" />
          <path d="M 80 0 Q 85 37 82 73 T 88 110" />
          <path d="M 200 0 Q 205 46 198 82 T 204 110" />
          <path d="M 300 0 Q 295 41 302 78 T 298 110" />
        </g>
        <circle cx="180" cy="55" r="8" fill="var(--accent)" opacity="0.8" />
        <circle cx="180" cy="55" r="3" fill="var(--fg-on-accent)" />
      </svg>
      <div style={{
        position: "absolute", bottom: 7, left: 10,
        fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
        color: "var(--fg-subtle)", letterSpacing: "0.04em",
      }}>{address}</div>
    </div>
  );
}

// ============================================================
// Map a Browse-grid event (artist, venue, date(YYYY-MM-DD), time, price, genre)
// into the richer shape EventDetail expects. Used by the desktop modal.
function expandEventForDetail(e) {
  if (!e) return null;
  const venueShortMap = {
    "Red Rocks Amphitheatre": "Red Rocks",
    "Mission Ballroom": "Mission",
    "Fillmore Auditorium": "Fillmore",
    "Ogden Theatre": "Ogden",
    "Gothic Theatre": "Gothic",
    "Bluebird Theater": "Bluebird",
  };
  const neighborhoodMap = {
    "Red Rocks Amphitheatre": "Morrison, CO",
    "Mission Ballroom": "RiNo, Denver",
    "Fillmore Auditorium": "Capitol Hill, Denver",
    "Ogden Theatre": "Capitol Hill, Denver",
    "Gothic Theatre": "Englewood, CO",
    "Bluebird Theater": "Capitol Hill, Denver",
  };
  // Pretty date string "Wed, Apr 30"
  const d = new Date(e.date + "T12:00:00");
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const prettyDate = `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
  // Doors = 1 hour before show
  const showTime = e.time;
  let doors = "";
  const m = /^([0-9]{1,2}):([0-9]{2})\s*(AM|PM)$/.exec(showTime || "");
  if (m) {
    let hour = parseInt(m[1], 10);
    const min = m[2];
    let mer = m[3];
    hour = hour - 1;
    if (hour === 0) { hour = 12; mer = (mer === "AM" ? "PM" : "AM"); }
    if (hour < 0) { hour += 12; }
    doors = `${hour}:${min} ${mer}`;
  }
  return {
    artist: e.artist,
    title: e.title || e.artist,
    venue: e.venue,
    venueShort: venueShortMap[e.venue] || e.venue,
    neighborhood: neighborhoodMap[e.venue] || "",
    date: prettyDate,
    doors,
    showTime,
    price: e.price,
    genre: e.genre || [],
    ages: "All Ages",
    description: `${e.artist}${e.title && e.title !== e.artist ? " — " + e.title : ""} at ${e.venue}. Showtime ${e.time}.${e.price ? " Tickets " + e.price + "." : " Tickets TBA."}`,
  };
}

// EVENT DETAIL
// ============================================================
function EventDetail({ themeTokens = ELECTRIC_TOKENS, event: eventProp, chrome = "mobile" }) {
  const defaultEvent = {
    artist: "Electric Callboy",
    title: "Tanzneid World Tour",
    venue: "Red Rocks Amphitheatre",
    venueShort: "Red Rocks",
    neighborhood: "Morrison, CO",
    date: "Wed, Apr 30",
    doors: "6:00 PM",
    showTime: "7:00 PM",
    price: null,
    genre: ["metalcore"],
    ages: "All Ages",
    description: "Electric Callboy brings the Tanzneid World Tour to Red Rocks. Expect pyrotechnics, crowd surfs, and songs your parents pretend not to like.",
  };
  const event = eventProp || defaultEvent;

  const related = [
    { artist: "YUNGBLUD", date: "May 11", time: "8:00 PM", price: null },
    { artist: "Mannequin Pussy", venue: "Bluebird", date: "May 7", time: "8:30 PM", price: "$28" },
    { artist: "Puscifer", date: "May 3", time: "7:30 PM", price: null },
  ];

  return (
    <div style={{
      ...tVars(themeTokens),
      height: "100%", display: "flex", flexDirection: "column",
      background: "var(--bg)", color: "var(--fg)", fontFamily: "Inter, system-ui",
    }}>
      {/* Hero image + overlaid nav */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <HeroImage label={event.artist.charAt(0)} height={320} hueSource={event.artist} />
        {chrome === "mobile" && <BackButton />}
        {chrome === "mobile" && <SaveButton />}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 80,
          background: "linear-gradient(transparent, var(--bg))",
        }} />
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", marginTop: -20, position: "relative" }}>
        <div style={{ padding: "0 18px" }}>
          {/* Genre chips */}
          <ChipRow items={event.genre} />

          {/* Title */}
          <h1 style={{
            margin: 0, fontWeight: 900,
            fontSize: 26, letterSpacing: "-0.03em", lineHeight: 1.1,
          }}>{event.artist}</h1>
          {event.title !== event.artist && (
            <div style={{
              fontWeight: 500, fontSize: 14,
              color: "var(--fg-muted)", marginTop: 4,
            }}>{event.title}</div>
          )}

          {/* Info block */}
          <div style={{
            marginTop: 16, padding: "4px 0",
            borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
          }}>
            <InfoRow
              icon={<IconPin />}
              label="Venue"
              value={event.venue}
              onClick={() => window.dispatchEvent(new CustomEvent("cc:openVenue", { detail: event.venue }))}
            />
            <InfoRow icon={<IconCalendar />} label="Date" value={event.date} />
            <InfoRow icon={<IconClock />} label="Doors / Show" value={`${event.doors} / ${event.showTime}`} />
            <InfoRow icon={<IconTicket />} label="Price" value={event.price || "TBA"} signal={!!event.price} />
            <InfoRow icon={<IconUsers />} label="Ages" value={event.ages} />
          </div>

          {/* About */}
          <AboutSection text={event.description} />

          {/* CTA */}
          <button style={{
            all: "unset", cursor: "pointer", marginTop: 20,
            display: "flex", width: "100%", height: 48, borderRadius: 10,
            background: "var(--accent)", color: "var(--fg-on-accent)",
            fontWeight: 800, fontSize: 15,
            letterSpacing: "-0.01em", alignItems: "center", justifyContent: "center",
            boxSizing: "border-box",
          }}>Get Tickets ↗</button>

          {/* Anonymous nudge */}
          <div style={{
            marginTop: 10, textAlign: "center",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            color: "var(--fg-subtle)", letterSpacing: "0.02em",
          }}>
            <span style={{ color: "var(--signal)", cursor: "pointer" }}>Sign up</span> to save this show
          </div>

          {/* More at venue */}
          <div style={{ marginTop: 24, paddingBottom: 24 }}>
            <SectionHeader title={`More at ${event.venueShort}`} count={`${related.length} shows`} />
            {related.map((r, i) => (
              <React.Fragment key={i}>
                {i > 0 && <EventRowDivider />}
                <SmallEventRow {...r} />
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// VENUE PROFILE
// ============================================================
function VenueProfile({ themeTokens = ELECTRIC_TOKENS, chrome = "mobile" }) {
  const venue = {
    name: "Red Rocks Amphitheatre",
    neighborhood: "Morrison, CO",
    address: "18300 W Alameda Pkwy, Morrison, CO 80465",
    capacity: "~9,525",
    type: "Outdoor",
    vibe: "The one. Sandstone monoliths, open sky, sound that bounces off 200-million-year-old rocks. If you haven't been, fix that.",
  };

  const upcoming = [
    { artist: "Lewis Capaldi", date: "Apr 28", time: "7:30 PM", price: "$55" },
    { artist: "Electric Callboy", date: "Apr 30", time: "7:00 PM", price: null },
    { artist: "Two Friends", date: "May 1", time: "7:00 PM", price: "$45" },
    { artist: "Jason Isbell and the 400 Unit", date: "May 2", time: "7:00 PM", price: "$55" },
    { artist: "Puscifer", date: "May 3", time: "7:30 PM", price: null },
    { artist: "David Guetta", date: "May 5", time: "8:00 PM", price: "$65" },
  ];

  const words = venue.name.split(" ");
  const initials = words.length > 2 ? words.slice(0, 2).map(w => w.charAt(0)).join("") : words.map(w => w.charAt(0)).join("");

  return (
    <div style={{
      ...tVars(themeTokens),
      height: "100%", display: "flex", flexDirection: "column",
      background: "var(--bg)", color: "var(--fg)", fontFamily: "Inter, system-ui",
    }}>
      {/* Hero image */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <HeroImage label={initials} height={320} hueSource={venue.name} venueStyle />
        {chrome === "mobile" && <BackButton />}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 80,
          background: "linear-gradient(transparent, var(--bg))",
        }} />
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", marginTop: -20, position: "relative" }}>
        <div style={{ padding: "0 18px" }}>
          {/* Chips — type badge lives here, not floating on image */}
          <ChipRow items={[venue.type]} />

          {/* Venue name */}
          <h1 style={{
            margin: 0, fontWeight: 900,
            fontSize: 26, letterSpacing: "-0.03em", lineHeight: 1.1,
          }}>{venue.name}</h1>

          {/* Neighborhood + directions link */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginTop: 5,
          }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              color: "var(--fg-muted)", letterSpacing: "0.04em",
              whiteSpace: "nowrap",
            }}>{venue.neighborhood}</span>
            <span style={{ color: "var(--fg-subtle)", opacity: 0.4 }}>·</span>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              color: "var(--signal)", letterSpacing: "0.03em", cursor: "pointer",
            }}>
              <IconDirections /> Directions
            </span>
          </div>

          {/* Stats row */}
          <div style={{
            display: "flex", gap: 12, marginTop: 14, padding: "12px 0",
            borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
          }}>
            <StatPill label="Capacity" value={venue.capacity} />
            <StatPill label="Upcoming" value={`${upcoming.length} shows`} signal />
            <StatPill label="Type" value={venue.type} />
          </div>

          {/* About */}
          <AboutSection text={venue.vibe} />

          {/* Upcoming shows */}
          <div style={{ marginTop: 22 }}>
            <SectionHeader title="Upcoming" count={`${upcoming.length} shows`} />
            {upcoming.map((u, i) => (
              <React.Fragment key={i}>
                {i > 0 && <EventRowDivider />}
                <SmallEventRow {...u} />
              </React.Fragment>
            ))}
          </div>

          {/* Map */}
          <div style={{ marginTop: 20, marginBottom: 24 }}>
            <MapPlaceholder address={venue.address} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value, signal = false }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
        color: "var(--fg-subtle)", letterSpacing: "0.06em", textTransform: "uppercase",
      }}>{label}</span>
      <span style={{
        fontWeight: 700, fontSize: 12,
        color: signal ? "var(--signal)" : "var(--fg)",
        letterSpacing: "-0.01em",
      }}>{value}</span>
    </div>
  );
}

// ============================================================
// MAIN — two phones side by side
// ============================================================
function DetailScreens() {
  const [theme, setTheme] = (window.useThemeState ? window.useThemeState("electric") : React.useState("electric"));
  const themeDef = window.CC_THEMES ? window.CC_THEMES[theme] : null;
  const themeTokens = themeDef ? themeDef.tokens : ELECTRIC_TOKENS;
  const isDarkFrame = themeDef ? themeDef.mode === "dark" : true;
  const labelColor = themeDef && themeDef.mode === "light" ? "#9AA8C7" : "#5A6788";
  return (
    <div style={{
      display: "flex", gap: 32, justifyContent: "center", alignItems: "flex-start",
      minHeight: "100vh", background: "#111", padding: "32px 16px",
      flexWrap: "wrap",
    }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <IOSDevice dark={isDarkFrame} width={393} height={852}>
          <EventDetail themeTokens={themeTokens} />
        </IOSDevice>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          color: labelColor, letterSpacing: "0.06em", textTransform: "uppercase",
        }}>Event Detail</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <IOSDevice dark={isDarkFrame} width={393} height={852}>
          <VenueProfile themeTokens={themeTokens} />
        </IOSDevice>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          color: labelColor, letterSpacing: "0.06em", textTransform: "uppercase",
        }}>Venue Profile</span>
      </div>
      {window.ThemeSwitcher && <window.ThemeSwitcher value={theme} onChange={setTheme} />}
    </div>
  );
}

window.DetailScreens = DetailScreens;
window.EventDetail = EventDetail;
window.VenueProfile = VenueProfile;
window.expandEventForDetail = expandEventForDetail;

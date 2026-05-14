// Event Detail v2 — additions to existing phase5b layout
// Three arrangement variations expressed as A / B / C.
// Shared design across mobile + desktop: single column, max-width, fluid type.
//
// Additions baked in:
//   1. Price trail   — lifts PriceBlockC (editorial) from Phase 7 + adds inline
//                      "Submit a price you saw" entry that routes to Phase 8.
//   2. Setlist preview (collapsible) — new module, sourced from Setlist.fm.
//                      Renders nothing if no data.
//   3. Watching count — small "N watching" pill near the save button.

const EV2_NS = window.phase7;  // helpers from price-data.jsx

// ─── Sample data ─────────────────────────────────────────────────
const EV2_EVENT = {
  artist: "Electric Callboy",
  title: "Tanzneid World Tour",
  venue: "Red Rocks Amphitheatre",
  venueShort: "Red Rocks",
  neighborhood: "Morrison, CO",
  date: "Wed, Apr 30",
  doors: "6:00 PM",
  showTime: "7:00 PM",
  genre: ["metalcore"],
  ages: "All Ages",
  description:
    "Electric Callboy brings the Tanzneid World Tour to Red Rocks. Expect pyrotechnics, crowd surfs, and songs your parents pretend not to like.",
  watching: 14,
  // Ticketing routing: ticketUrl is the direct deep-link when we have one
  // (most primary + resale prices), venueUrl is the always-known fallback.
  // The Get Tickets button picks copy based on which is present.
  ticketUrl: "https://www.axs.com/events/example",
  venueUrl: "https://www.redrocksonline.com/",
  price: window.PHASE7_EVENTS ? window.PHASE7_EVENTS.electricCallboy.price : null,
  // Setlist.fm-style — most recent show on the current tour
  setlist: {
    source: "setlist.fm",
    sourceUrl: "https://www.setlist.fm/",
    when: "Apr 26, 2026 · Salt Lake City",
    songs: [
      "Spaceman",
      "We Got the Moves",
      "Pump It",
      "Hate/Love",
      "Hurrikan",
      "Tekkno Train",
      "Mindfuck",
      "Fuckboi",
      "Castrop X Spandau",
      "Pitch Black",
      "Crystals",
      "MC Thunder",
      "Parasite",
      "Tanzneid",
    ],
    encore: ["The Scene", "Best Day"],
  },
  related: [
    { artist: "YUNGBLUD",         date: "May 11", time: "8:00 PM", price: null },
    { artist: "Mannequin Pussy",  venue: "Bluebird", date: "May 7", time: "8:30 PM", price: "$28" },
    { artist: "Puscifer",         date: "May 3", time: "7:30 PM", price: null },
  ],
};

// ─── Variant data — swap the price object to demo other states ──
const EV2_PRICE_BY_STATE = {
  default:    () => window.PHASE7_EVENTS ? window.PHASE7_EVENTS.electricCallboy.price : null,
  drop:       () => window.PHASE7_EVENTS ? window.PHASE7_EVENTS.amyl.price          : null,
  none:       () => null,
  soldout:    () => window.PHASE7_EVENTS ? window.PHASE7_EVENTS.geese.price         : null,
  resale:     () => window.PHASE7_EVENTS ? window.PHASE7_EVENTS.bladee.price        : null,
  community:  () => window.PHASE7_EVENTS ? window.PHASE7_EVENTS.caroline.price      : null,
  stale:      () => window.PHASE7_EVENTS ? window.PHASE7_EVENTS.twoFriends.price    : null,
  verified:   () => window.PHASE7_EVENTS ? window.PHASE7_EVENTS.caroline.price      : null,  // community + verification
  // Phase 7.2 — box-office tier
  boBought:   () => window.PHASE7_EVENTS ? window.PHASE7_EVENTS.bigThief.price      : null,  // in-person + bought + alternates
  boPhone:    () => window.PHASE7_EVENTS ? window.PHASE7_EVENTS.ldr.price           : null,  // phone + bought
  boSaw:      () => window.PHASE7_EVENTS ? window.PHASE7_EVENTS.julien.price        : null,  // in-person + saw
  boCalled:   () => window.PHASE7_EVENTS ? window.PHASE7_EVENTS.cigarettes.price    : null,  // phone + saw → community tier
};

// ─── New module: Setlist preview ────────────────────────────────
// Collapsed by default. Renders nothing if no setlist.
function SetlistPreview({ setlist, defaultOpen = false, dense = false }) {
  if (!setlist || !setlist.songs || setlist.songs.length === 0) return null;
  const [open, setOpen] = React.useState(defaultOpen);
  const previewCount = 3;
  return (
    <div style={{
      marginTop: dense ? 14 : 18,
      borderTop: "1px solid var(--border)",
      borderBottom: "1px solid var(--border)",
    }}>
      <button onClick={() => setOpen(o => !o)} style={{
        all: "unset", cursor: "pointer", display: "flex",
        alignItems: "center", gap: 10, width: "100%",
        padding: dense ? "10px 0" : "12px 0",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            color: "var(--fg-subtle)", letterSpacing: "0.06em", textTransform: "uppercase",
          }}>Likely setlist</div>
          <div style={{
            fontFamily: "Inter, system-ui", fontSize: 13.5, fontWeight: 600,
            color: "var(--fg)", marginTop: 2, letterSpacing: "-0.01em",
          }}>
            {open ? `${setlist.songs.length} songs` : (
              <>
                <span style={{ color: "var(--fg-muted)" }}>{setlist.songs.slice(0, previewCount).join(", ")}</span>
                <span style={{ color: "var(--fg-subtle)" }}>{` +${setlist.songs.length - previewCount} more`}</span>
              </>
            )}
          </div>
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" style={{
          transform: `rotate(${open ? 180 : 0}deg)`, transition: "transform .15s",
        }}>
          <path d="M3 5l3 3 3-3" stroke="var(--fg-subtle)" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      </button>

      {open && (
        <div style={{ paddingBottom: 12 }}>
          <ol style={{
            margin: 0, padding: 0, listStyle: "none",
            display: "grid", gridTemplateColumns: "1fr", gap: 0,
          }}>
            {setlist.songs.map((s, i) => (
              <li key={i} style={{
                display: "flex", gap: 10, padding: "5px 0",
                fontFamily: "Inter, system-ui", fontSize: 13,
                color: "var(--fg)", letterSpacing: "-0.005em",
              }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                  color: "var(--fg-subtle)", width: 18, flexShrink: 0,
                  textAlign: "right",
                }}>{String(i + 1).padStart(2, "0")}</span>
                <span style={{ flex: 1, minWidth: 0 }}>{s}</span>
              </li>
            ))}
            {setlist.encore && setlist.encore.length > 0 && (
              <>
                <li style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 0 4px",
                }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                    color: "var(--fg-subtle)", letterSpacing: "0.06em",
                    textTransform: "uppercase", flexShrink: 0,
                  }}>Encore</span>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }}/>
                </li>
                {setlist.encore.map((s, i) => (
                  <li key={`e${i}`} style={{
                    display: "flex", gap: 10, padding: "5px 0",
                    fontFamily: "Inter, system-ui", fontSize: 13,
                    color: "var(--fg)", letterSpacing: "-0.005em",
                  }}>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                      color: "var(--fg-subtle)", width: 18, flexShrink: 0,
                      textAlign: "right",
                    }}>E{i + 1}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>{s}</span>
                  </li>
                ))}
              </>
            )}
          </ol>

          <div style={{
            marginTop: 10,
            display: "flex", alignItems: "center", gap: 8,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            color: "var(--fg-subtle)", letterSpacing: "0.04em",
          }}>
            <span>Last played {setlist.when}</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <a href={setlist.sourceUrl} onClick={(e) => e.preventDefault()} style={{
              color: "var(--fg-subtle)", textDecoration: "underline",
              textDecorationColor: "var(--border-strong)", textUnderlineOffset: 2,
            }}>via {setlist.source}</a>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Submit-a-price entry point ─────────────────────────────────
// Inline link that routes to the existing Phase 8 submit route.
function SubmitPriceLink({ inline = false, dense = false }) {
  return (
    <a href="#submit-price" onClick={(e) => e.preventDefault()} style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
      color: "var(--signal)", letterSpacing: "0.04em",
      textDecoration: "none",
      cursor: "pointer",
    }}>
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
        <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round"/>
      </svg>
      {inline ? "Submit a price you saw" : "Saw a different price?"}
    </a>
  );
}

// ─── Sold-out CTA — disabled primary button ──────────────────────
// Reverts to the disabled-button pattern. The SOLD OUT pill already
// renders next to the price, so the button just states the obvious in
// the same shape as Get Tickets.
function SoldOutCTA() {
  return (
    <button disabled style={{
      all: "unset", boxSizing: "border-box", cursor: "not-allowed",
      display: "flex", alignItems: "center", justifyContent: "center",
      width: "100%", height: 48, borderRadius: 10,
      background: "var(--surface-1)",
      border: "1px solid var(--border)",
      color: "var(--fg-subtle)",
      fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 14,
      letterSpacing: "-0.005em",
    }}>Sold out</button>
  );
}

// ─── Watch CTA — reduced-weight version ────────────────────────
// Sits under the title. Outline button (not filled) at 28px height so it
// doesn't compete with the band name. Two states:
//   inactive → "+ Watch this show" with watching count alongside
//   active   → "✓ Watching" — click reveals "Stop watching" affordance
// Stop-watching uses an inline confirm: ✓ Watching becomes a 2-button row
// (Stop watching / Cancel) so it's reversible without a modal.
function WatchShowButton({ initialActive = false, initialConfirming = false, count }) {
  const [active, setActive] = React.useState(initialActive);
  const [confirming, setConfirming] = React.useState(initialConfirming);

  const baseBtn = {
    all: "unset", cursor: "pointer", boxSizing: "border-box",
    display: "inline-flex", alignItems: "center", gap: 6,
    height: 28, padding: "0 11px", borderRadius: 7,
    fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12,
    letterSpacing: "-0.005em",
  };

  // Active + confirming → reversible inline confirm
  if (active && confirming) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => { setActive(false); setConfirming(false); }} style={{
          ...baseBtn,
          background: "transparent",
          color: "var(--warning)",
          border: "1px solid var(--warning)",
        }}>Stop watching</button>
        <button onClick={() => setConfirming(false)} style={{
          ...baseBtn, padding: "0 8px",
          background: "transparent",
          color: "var(--fg-muted)",
          border: "1px solid var(--border)",
        }}>Cancel</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <button onClick={() => active ? setConfirming(true) : setActive(true)} style={{
        ...baseBtn,
        background: active ? "color-mix(in oklab, var(--accent) 12%, transparent)" : "transparent",
        color: active ? "var(--accent)" : "var(--fg)",
        border: active ? "1px solid var(--accent)" : "1px solid var(--border-strong)",
      }}>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          {active ? (
            <path d="M2.5 6.5l2.5 2.5L9.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          ) : (
            <path d="M6 2.5v7M2.5 6h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          )}
        </svg>
        {active ? "Watching" : "Watch this show"}
      </button>
      {count > 0 && (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, fontWeight: 700,
          color: "var(--fg-subtle)", letterSpacing: "0.04em",
        }}>
          <span style={{ width: 4, height: 4, borderRadius: 2, background: "var(--accent)" }}/>
          {count} watching {active ? "" : "· alerts on price + sold out"}
        </span>
      )}
    </div>
  );
}

// Bigger surface — full-width card-end CTA used by variant B
function SubmitPriceCardCTA() {
  return (
    <a href="#submit-price" onClick={(e) => e.preventDefault()} style={{
      all: "unset", cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 10, padding: "10px 12px",
      borderRadius: 8,
      border: "1px dashed var(--border-strong)",
      color: "var(--fg-muted)",
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 12.5,
          color: "var(--fg)", letterSpacing: "-0.005em",
        }}>Saw a different price?</span>
        <span style={{
          fontFamily: "Inter, system-ui", fontSize: 11.5,
          color: "var(--fg-muted)", letterSpacing: "-0.005em",
        }}>Two confirms moves a community price out of pending.</span>
      </div>
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
        color: "var(--signal)", letterSpacing: "0.06em", textTransform: "uppercase",
        flexShrink: 0,
      }}>Submit
        <svg width="9" height="9" viewBox="0 0 10 10">
          <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      </span>
    </a>
  );
}

// ─── Reused primitives (small copies of the phase5b set) ────────
function HeroImage({ label, height = 320, hueSource = "" }) {
  const hash = hueSource.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
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
        fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: height * 0.33,
        color: `oklch(0.75 0.12 ${hue})`, opacity: 0.6,
        letterSpacing: "-0.03em",
      }}>{label}</span>
      <div style={{ position: "absolute", inset: 0, background: "var(--image-tint)" }}/>
    </div>
  );
}

function BackButton() {
  return (
    <div style={{
      position: "absolute", top: 56, left: 14, zIndex: 20,
      width: 36, height: 36, borderRadius: 18, background: "var(--scrim)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
        <path d="M8 2L2 8l6 6" stroke="var(--fg)" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

function SaveButton() {
  return (
    <div style={{
      position: "absolute", top: 56, right: 14, zIndex: 20,
      width: 36, height: 36, borderRadius: 18, background: "var(--scrim)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
        <path d="M9 15l-6.5-6A3.5 3.5 0 019 4.5 3.5 3.5 0 0115.5 9L9 15z"
              stroke="var(--fg)" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

function IconPin()      { return (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5C5.24 1.5 3 3.74 3 6.5C3 10.25 8 14.5 8 14.5C8 14.5 13 10.25 13 6.5C13 3.74 10.76 1.5 8 1.5Z" stroke="var(--fg-subtle)" strokeWidth="1.5" strokeLinejoin="round"/><circle cx="8" cy="6.5" r="2" stroke="var(--fg-subtle)" strokeWidth="1.5"/></svg>);}
function IconCalendar() { return (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="2" stroke="var(--fg-subtle)" strokeWidth="1.5"/><path d="M2 7h12" stroke="var(--fg-subtle)" strokeWidth="1.5"/><path d="M5.5 1.5v3M10.5 1.5v3" stroke="var(--fg-subtle)" strokeWidth="1.5" strokeLinecap="round"/></svg>);}
function IconClock()    { return (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="var(--fg-subtle)" strokeWidth="1.5"/><path d="M8 4.5V8l3 1.5" stroke="var(--fg-subtle)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>);}
function IconUsers()    { return (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="2.5" stroke="var(--fg-subtle)" strokeWidth="1.5"/><path d="M1 14c0-2.8 2.2-4.5 5-4.5s5 1.7 5 4.5" stroke="var(--fg-subtle)" strokeWidth="1.5" strokeLinecap="round"/><circle cx="11.5" cy="5.5" r="2" stroke="var(--fg-subtle)" strokeWidth="1.2"/><path d="M12.5 9.5c1.8.4 3 1.6 3 3.5" stroke="var(--fg-subtle)" strokeWidth="1.2" strokeLinecap="round"/></svg>);}

function InfoRow({ icon, label, value, signal = false }) {
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

function SectionHeader({ title, count, action }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, marginBottom: 4,
    }}>
      <span style={{
        fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 14,
        color: "var(--fg)", letterSpacing: "-0.01em", whiteSpace: "nowrap",
      }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: "var(--border)" }}/>
      {count != null && (
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: "var(--fg-subtle)", whiteSpace: "nowrap",
        }}>{count}</span>
      )}
      {action}
    </div>
  );
}

function AboutSection({ text }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
        color: "var(--fg-subtle)", letterSpacing: "0.06em",
        textTransform: "uppercase", marginBottom: 6,
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
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13,
          color: "var(--fg)", whiteSpace: "nowrap", overflow: "hidden",
          textOverflow: "ellipsis",
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
  return <div style={{ height: 1, background: "var(--border)", marginLeft: 50 }}/>;
}

// PrimaryCTA — always renders. Two copy variants share the SAME button bounds
// (height 48, width 100%, radius 10, single 15px line) so swapping between
// "Get Tickets ↗" and "Visit Venue Website ↗" produces zero layout shift.
//
//   variant="direct"  → "Get Tickets ↗"          (used when ticketUrl is present)
//   variant="venue"   → "Visit Venue Website ↗"  (fallback when only venueUrl is known)
//
// Engineering: pick the variant on the caller side from the URL set you have;
// the CTA always renders so there is no empty-button gap on no-price events.
function PrimaryCTA({ variant = "direct", href = "#", disabled = false }) {
  const label = variant === "venue" ? "Visit Venue Website ↗" : "Get Tickets ↗";
  return (
    <a href={href} onClick={(e) => disabled && e.preventDefault()} style={{
      all: "unset", cursor: disabled ? "default" : "pointer",
      display: "flex", width: "100%", height: 48, borderRadius: 10,
      background: disabled ? "var(--surface-2)" : "var(--accent)",
      color: disabled ? "var(--fg-subtle)" : "var(--fg-on-accent)",
      fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 15,
      letterSpacing: "-0.01em",
      alignItems: "center", justifyContent: "center",
      whiteSpace: "nowrap",
      boxSizing: "border-box",
    }}>{label}</a>
  );
}

// ============================================================
// EventDetail — MODULAR CARDS (chosen variant)
// Each addition is a distinct surface. Price trail uses the spacious
// PriceBlockB card with the submit-a-price CTA tucked into its footer.
// Setlist preview is its own card. Watch CTA + watching count is a
// strip directly under the title; Save (heart, top-right) stays a
// separate, lighter affordance.
// ============================================================
function EventDetail({ event, chrome = "mobile" }) {
  const soldOut = event.price && event.price.status === "soldout";
  // `chrome="none"` means we're being rendered without the iOS device frame
  // — typically in a full-scroll artboard where the content needs to expand
  // naturally rather than scroll inside a fixed-height container.
  const isUnscrolled = chrome === "none";
  return (
    <div style={{
      height: isUnscrolled ? "auto" : "100%",
      display: "flex", flexDirection: "column",
      background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui",
    }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <HeroImage label={event.artist.charAt(0)} height={300} hueSource={event.artist}/>
        {chrome === "mobile" && <BackButton/>}
        {/* Save heart removed per May-13 feedback — Watch CTA below the title
            now carries the same intent (subscribe for updates on this show).
            Two-mechanism redundancy was confusing. */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 80,
          background: "linear-gradient(transparent, var(--bg))",
        }}/>
      </div>

      <div style={{
        flex: isUnscrolled ? "none" : 1,
        overflowY: isUnscrolled ? "visible" : "auto",
        marginTop: -20, position: "relative",
      }}>
        <div style={{ padding: "0 18px" }}>
          <ChipRow items={event.genre}/>
          <h1 style={{
            margin: 0, fontWeight: 900,
            fontSize: 26, letterSpacing: "-0.03em", lineHeight: 1.1,
          }}>{event.artist}</h1>
          {event.title !== event.artist && (
            <div style={{
              fontWeight: 500, fontSize: 14, color: "var(--fg-muted)", marginTop: 4,
            }}>{event.title}</div>
          )}

          {/* Watch CTA + watching count — sits right under the title.
              Watch is the primary action; the count is supporting context. */}
          <div style={{ marginTop: 12 }}>
            <WatchShowButton count={event.watching}/>
          </div>

          {/* Info block — no price row here, that lives in the dedicated card */}
          <div style={{
            marginTop: 14, padding: "4px 0",
            borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
          }}>
            <InfoRow icon={<IconPin/>}      label="Venue" value={event.venue}/>
            <InfoRow icon={<IconCalendar/>} label="Date"  value={event.date}/>
            <InfoRow icon={<IconClock/>}    label="Doors / Show" value={`${event.doors} / ${event.showTime}`}/>
            <InfoRow icon={<IconUsers/>}    label="Ages" value={event.ages}/>
          </div>

          {/* Spacious price card — PriceBlockB for priced states, and the
              community-handoff card for no-price (rendered by PriceBlockB itself).
              The "Saw a different price?" revise CTA only attaches when we have
              a price to revise — no longer doubles up under the no-price card,
              which already carries its own focal-point submit button. */}
          {window.PriceBlockB && <window.PriceBlockB price={event.price} tone="deadpan" venue={event.venueShort || event.venue}/>}
          {event.price && (
            <div style={{ marginTop: 8 }}>
              <SubmitPriceCardCTA/>
            </div>
          )}

          {/* Setlist as its own surface card */}
          {event.setlist && (
            <div style={{
              marginTop: 18, padding: "0 14px",
              borderRadius: 12, background: "var(--surface-1)",
              border: "1px solid var(--border)",
            }}>
              <SetlistPreview setlist={event.setlist}/>
            </div>
          )}

          {/* CTA — always renders. Sold out is the only state that swaps the
              button shape (disabled "Sold out"). Otherwise: ticketUrl wins,
              venueUrl is the fallback so the slot is never empty. */}
          <div style={{ marginTop: 18 }}>
            {soldOut
              ? <SoldOutCTA/>
              : event.ticketUrl
                ? <PrimaryCTA variant="direct" href={event.ticketUrl}/>
                : <PrimaryCTA variant="venue"  href={event.venueUrl || "#"}/>}
          </div>

          {/* About */}
          <AboutSection text={event.description}/>

          {/* Related */}
          <div style={{ marginTop: 22, paddingBottom: 24 }}>
            <SectionHeader title={`More at ${event.venueShort}`} count={`${event.related.length} shows`}/>
            {event.related.map((r, i) => (
              <React.Fragment key={i}>
                {i > 0 && <EventRowDivider/>}
                <SmallEventRow {...r}/>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Variant frame — embeds a variant inside an iOS device.
// One frame per variant; arrangement is the variation, the rest of
// the design (hero, type, color, components) stays consistent.
// ============================================================
function VariantFrame({ Variant, event, label, sublabel, theme }) {
  const themeDef = window.CC_THEMES ? window.CC_THEMES[theme] : null;
  const themeTokens = themeDef ? themeDef.tokens : null;
  const isDark = themeDef ? themeDef.mode === "dark" : true;
  return (
    <div style={{
      ...(themeTokens ? Object.fromEntries(Object.entries(themeTokens).map(([k,v]) => [`--${k}`, v])) : {}),
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
    }}>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "flex-start",
        gap: 4, alignSelf: "stretch",
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: "var(--fg-subtle)", letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}>{label}</span>
        <span style={{
          fontFamily: "Inter, system-ui", fontSize: 13,
          color: "var(--fg-muted)", letterSpacing: "-0.005em",
          lineHeight: 1.4, textWrap: "pretty",
        }}>{sublabel}</span>
      </div>
      <window.IOSDevice dark={isDark} width={393} height={852}>
        <Variant event={event} chrome="mobile"/>
      </window.IOSDevice>
    </div>
  );
}

window.EventDetail = EventDetail;
window.WatchShowButton = WatchShowButton;
window.WatchConfirmDemo = WatchConfirmDemo;
window.SoldOutCTA = SoldOutCTA;
window.SetlistPreview = SetlistPreview;
// Demo wrapper for the confirming state — pre-mounts in the confirm dialog
function WatchConfirmDemo() {
  return <WatchShowButton initialActive={true} initialConfirming={true} count={14}/>;
}

window.SubmitPriceLink = SubmitPriceLink;
window.SubmitPriceCardCTA = SubmitPriceCardCTA;
window.PrimaryCTA = PrimaryCTA;
window.EV2_EVENT = EV2_EVENT;
window.EV2_PRICE_BY_STATE = EV2_PRICE_BY_STATE;
window.EV2_VariantFrame = VariantFrame;

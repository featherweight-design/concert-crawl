// event-detail-v2-desktop.jsx — desktop adaptation of EventDetail
//
// Two adds in this file:
//
//   <DesktopTopBar/>     — App shell chrome: brand mark + nav + search + avatar.
//                          Matches the staging concertcrawl.app top bar.
//
//   <EventDetailDesktop/> — Centered max-width column on a full-bleed hero.
//                          Reuses ALL the existing event-detail-v2 components
//                          (Watch button, price card, setlist, primary CTA, etc.)
//                          — desktop is only a layout adaptation, not a redesign.
//
// Per Hugh's May-13 feedback: the staging page renders content LEFT-aligned
// at ~1700px width. Fix here is a max-width 880 column with `margin: 0 auto`.

// ── CCMark — inline copy of the canonical mark from browse-home.jsx ──────
// Renamed to CCMarkDesktop to avoid collisions if browse-home.jsx is also
// loaded. Per CLAUDE.md: never invent a placeholder; copy the source of truth.
function CCMarkDesktop({ size = 32 }) {
  const trail = [
    { x: 14, y: 76, r: 1.5 }, { x: 24, y: 70, r: 2 },
    { x: 34, y: 62, r: 2.5 }, { x: 42, y: 56, r: 3 },
    { x: 50, y: 50, r: 4 },   { x: 58, y: 42, r: 5 },
    { x: 66, y: 32, r: 6 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 96 96">
      <rect width="96" height="96" fill="var(--bg)" rx="16"/>
      <circle cx="72" cy="24" r="20" fill="var(--accent)" opacity="0.22"/>
      <circle cx="72" cy="24" r="12" fill="var(--accent)" opacity="0.42"/>
      <circle cx="72" cy="24" r="7"  fill="var(--signal)"/>
      {trail.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r}
          fill="var(--signal)" opacity={0.35 + i * 0.09}/>
      ))}
    </svg>
  );
}

// ── Top bar — app-shell chrome that wraps the desktop event detail ──────
function DesktopTopBar({ active = "browse" }) {
  const tabs = [
    { key: "browse",   label: "Browse" },
    { key: "search",   label: "Search" },
    { key: "watching", label: "Watching" },
  ];
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      height: 64, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px",
      borderBottom: "1px solid var(--border)",
      background: "var(--bg)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        {/* Brand lockup — CCMark + wordmark per the project standard */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CCMarkDesktop size={32}/>
          <span style={{
            fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 17,
            letterSpacing: "-0.02em",
          }}>
            concert<span style={{ color: "var(--accent)" }}>crawl.</span>
          </span>
        </div>
        <nav style={{ display: "flex", gap: 4 }}>
          {tabs.map(t => {
            const isActive = t.key === active;
            return (
              <button key={t.key} style={{
                all: "unset", cursor: "pointer",
                padding: "8px 14px", borderRadius: 8,
                fontFamily: "Inter, system-ui",
                fontWeight: isActive ? 700 : 500, fontSize: 13,
                color: isActive ? "var(--fg)" : "var(--fg-muted)",
                background: isActive ? "var(--surface-2)" : "transparent",
                letterSpacing: "-0.01em",
              }}>{t.label}</button>
            );
          })}
        </nav>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Search field — matches staging width ~360px on wide screens */}
        <button style={{
          all: "unset", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8,
          height: 36, padding: "0 12px",
          borderRadius: 8, background: "var(--surface-1)",
          border: "1px solid var(--border)", width: 320, boxSizing: "border-box",
          color: "var(--fg-subtle)",
        }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span style={{ fontFamily: "Inter, system-ui", fontSize: 13 }}>
            Search artists or venues…
          </span>
          <span style={{
            marginLeft: "auto",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: "var(--fg-subtle)",
            padding: "2px 5px", borderRadius: 3,
            border: "1px solid var(--border-strong)",
          }}>⌘K</span>
        </button>
        <div style={{
          width: 36, height: 36, borderRadius: 18,
          background: "color-mix(in oklab, var(--signal) 18%, transparent)",
          border: "1px solid color-mix(in oklab, var(--signal) 50%, var(--border))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13,
          color: "var(--signal)",
        }}>H</div>
      </div>
    </header>
  );
}

// ── Breadcrumb — desktop replacement for the mobile back button ─────────
function Breadcrumb({ crumbs }) {
  return (
    <nav style={{
      display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
      fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
      color: "var(--fg-subtle)", letterSpacing: "0.08em",
      textTransform: "uppercase",
    }}>
      {crumbs.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span style={{ opacity: 0.5 }}>/</span>}
          {c.href ? (
            <a href={c.href} onClick={(e) => e.preventDefault()} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              color: i < crumbs.length - 1 ? "var(--fg-muted)" : "var(--fg)",
              textDecoration: "none", fontWeight: i < crumbs.length - 1 ? 600 : 700,
            }}>
              {i === 0 && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M7 1.5L3.5 5 7 8.5" stroke="currentColor"
                        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              {c.label}
            </a>
          ) : (
            <span style={{ color: "var(--fg)", fontWeight: 700 }}>{c.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

// ── Wide hero — full-bleed pattern image, no in-image chrome ────────────
function HeroWide({ label, height = 360, hueSource = "" }) {
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
        fontFamily: "Inter, system-ui", fontWeight: 800,
        fontSize: height * 0.45,
        color: `oklch(0.75 0.12 ${hue})`, opacity: 0.55,
        letterSpacing: "-0.03em",
      }}>{label}</span>
      <div style={{ position: "absolute", inset: 0, background: "var(--image-tint)" }}/>
      {/* Bottom fade so the title below isn't fighting hero edges */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, height: 120,
        background: "linear-gradient(transparent, var(--bg))",
      }}/>
    </div>
  );
}

// ── Reused mobile primitives (lifted so the desktop file is self-contained
//     where it uses different chrome — components from event-detail-v2.jsx
//     are still pulled off `window`). ─────────────────────────────────────
function DInfoRow({ icon, label, value, signal = false }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
      <div style={{ width: 18, height: 18, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: "var(--fg-subtle)", letterSpacing: "0.06em", textTransform: "uppercase",
        }}>{label}</div>
        <div style={{
          fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 15,
          color: signal ? "var(--signal)" : "var(--fg)", marginTop: 2,
          letterSpacing: "-0.01em",
        }}>{value}</div>
      </div>
    </div>
  );
}
function DChipRow({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {items.map(g => (
        <span key={g} style={{
          padding: "3px 9px", borderRadius: 4,
          background: "var(--surface-3)", color: "var(--fg-muted)",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          letterSpacing: "0.03em",
        }}>{g}</span>
      ))}
    </div>
  );
}

// Icons — same paths as mobile, 18px size for desktop hierarchy
function IconPinD()      { return (<svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M8 1.5C5.24 1.5 3 3.74 3 6.5C3 10.25 8 14.5 8 14.5C8 14.5 13 10.25 13 6.5C13 3.74 10.76 1.5 8 1.5Z" stroke="var(--fg-subtle)" strokeWidth="1.5" strokeLinejoin="round"/><circle cx="8" cy="6.5" r="2" stroke="var(--fg-subtle)" strokeWidth="1.5"/></svg>);}
function IconCalendarD() { return (<svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="2" stroke="var(--fg-subtle)" strokeWidth="1.5"/><path d="M2 7h12" stroke="var(--fg-subtle)" strokeWidth="1.5"/><path d="M5.5 1.5v3M10.5 1.5v3" stroke="var(--fg-subtle)" strokeWidth="1.5" strokeLinecap="round"/></svg>);}
function IconClockD()    { return (<svg width="18" height="18" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="var(--fg-subtle)" strokeWidth="1.5"/><path d="M8 4.5V8l3 1.5" stroke="var(--fg-subtle)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>);}
function IconUsersD()    { return (<svg width="18" height="18" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="2.5" stroke="var(--fg-subtle)" strokeWidth="1.5"/><path d="M1 14c0-2.8 2.2-4.5 5-4.5s5 1.7 5 4.5" stroke="var(--fg-subtle)" strokeWidth="1.5" strokeLinecap="round"/><circle cx="11.5" cy="5.5" r="2" stroke="var(--fg-subtle)" strokeWidth="1.2"/><path d="M12.5 9.5c1.8.4 3 1.6 3 3.5" stroke="var(--fg-subtle)" strokeWidth="1.2" strokeLinecap="round"/></svg>);}

// ─── EventDetailDesktop ───────────────────────────────────────────────────
// Single centered column on a full-bleed hero. Width target: 880px content
// inside a 1440-wide artboard (~30% margin each side) — comfortable reading
// width without dead space. Top bar is sticky, full-width.
//
// All inner modules (Watch, PriceBlockB, SetlistPreview, PrimaryCTA, etc.)
// are the same as mobile — desktop is layout, not redesign.
function EventDetailDesktop({ event }) {
  const soldOut = event.price && event.price.status === "soldout";
  return (
    <div style={{
      background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui",
      minHeight: "100%",
      display: "flex", flexDirection: "column",
    }}>
      <DesktopTopBar active="browse"/>

      <HeroWide label={event.artist.charAt(0)} height={360} hueSource={event.artist}/>

      <main style={{
        maxWidth: 880, width: "100%",
        margin: "0 auto", boxSizing: "border-box",
        padding: "20px 32px 64px",
        marginTop: -60, position: "relative", zIndex: 1,
      }}>
        {/* Breadcrumb + genre row + title block — sits in the bottom-fade of
            the hero so it reads as a single masthead. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          <Breadcrumb crumbs={[
            { label: "Browse", href: "#" },
            { label: event.artist },
          ]}/>
          <DChipRow items={event.genre}/>
          <h1 style={{
            margin: 0, fontWeight: 900,
            fontSize: 44, letterSpacing: "-0.03em", lineHeight: 1.05,
          }}>{event.artist}</h1>
          {event.title !== event.artist && (
            <div style={{
              fontWeight: 500, fontSize: 16, color: "var(--fg-muted)",
              letterSpacing: "-0.01em",
            }}>{event.title}</div>
          )}
        </div>

        {/* Watch CTA — same component as mobile, sits under title */}
        <div style={{ marginBottom: 24 }}>
          <window.WatchShowButton count={event.watching}/>
        </div>

        {/* Info grid — 2 columns on desktop so the dense fact block reads
            wider and balances the visual weight of the price card below. */}
        <div style={{
          padding: "8px 0",
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          columnGap: 32,
        }}>
          <DInfoRow icon={<IconPinD/>}      label="Venue"        value={event.venue}/>
          <DInfoRow icon={<IconCalendarD/>} label="Date"         value={event.date}/>
          <DInfoRow icon={<IconClockD/>}    label="Doors / Show" value={`${event.doors} / ${event.showTime}`}/>
          <DInfoRow icon={<IconUsersD/>}    label="Ages"         value={event.ages}/>
        </div>

        {/* Price card — reused from mobile (same PriceBlockB) */}
        {window.PriceBlockB && (
          <window.PriceBlockB price={event.price} tone="deadpan" venue={event.venueShort || event.venue}/>
        )}
        {event.price && (
          <div style={{ marginTop: 10 }}>
            <window.SubmitPriceCardCTA/>
          </div>
        )}

        {/* Setlist */}
        {event.setlist && (
          <div style={{
            marginTop: 22, padding: "0 16px",
            borderRadius: 12, background: "var(--surface-1)",
            border: "1px solid var(--border)",
          }}>
            <window.SetlistPreview setlist={event.setlist}/>
          </div>
        )}

        {/* Primary CTA — same shape as mobile, full width of the centered column */}
        <div style={{ marginTop: 24 }}>
          {soldOut
            ? <window.SoldOutCTA/>
            : event.ticketUrl
              ? <window.PrimaryCTA variant="direct" href={event.ticketUrl}/>
              : <window.PrimaryCTA variant="venue"  href={event.venueUrl || "#"}/>}
        </div>

        {/* About */}
        <div style={{ marginTop: 28 }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: "var(--fg-subtle)", letterSpacing: "0.06em",
            textTransform: "uppercase", marginBottom: 8,
          }}>About</div>
          <p style={{
            margin: 0, fontFamily: "Inter, system-ui", fontSize: 14.5,
            color: "var(--fg-muted)", lineHeight: 1.6, textWrap: "pretty",
            maxWidth: "65ch",
          }}>{event.description}</p>
        </div>

        {/* Related — desktop variant: 3-up grid */}
        {event.related && event.related.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10, marginBottom: 14,
            }}>
              <span style={{
                fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 16,
                color: "var(--fg)", letterSpacing: "-0.01em", whiteSpace: "nowrap",
              }}>More at {event.venueShort}</span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }}/>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                color: "var(--fg-subtle)", letterSpacing: "0.04em",
              }}>{event.related.length} shows</span>
            </div>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12,
            }}>
              {event.related.map((r, i) => {
                const hash = r.artist.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
                const hues = [280, 200, 340, 160, 30, 220, 310, 180, 50, 260];
                const hue = hues[hash % hues.length];
                return (
                  <a key={i} href="#" onClick={(e) => e.preventDefault()} style={{
                    all: "unset", cursor: "pointer",
                    display: "flex", flexDirection: "column",
                    padding: 12,
                    border: "1px solid var(--border)", borderRadius: 10,
                    background: "var(--surface-1)",
                    gap: 10,
                  }}>
                    <div style={{
                      width: "100%", height: 80, borderRadius: 6,
                      background: `linear-gradient(135deg, oklch(0.35 0.08 ${hue}), oklch(0.22 0.06 ${hue + 40}))`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      position: "relative", overflow: "hidden",
                    }}>
                      <span style={{
                        fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 32,
                        color: `oklch(0.75 0.12 ${hue})`, opacity: 0.7,
                      }}>{r.artist.charAt(0)}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{
                        fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13.5,
                        color: "var(--fg)", letterSpacing: "-0.005em",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>{r.artist}</span>
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
                        color: "var(--fg-muted)", letterSpacing: "0.04em",
                      }}>
                        {r.venue ? r.venue + " · " : ""}{r.date} · {r.time}
                      </span>
                    </div>
                    {r.price ? (
                      <span style={{
                        fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 13,
                        color: "var(--signal)", marginTop: -4,
                      }}>{r.price}</span>
                    ) : (
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                        color: "var(--fg-subtle)", marginTop: -4,
                        letterSpacing: "0.06em", textTransform: "uppercase",
                      }}>price tba</span>
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

window.EventDetailDesktop = EventDetailDesktop;
window.DesktopTopBar = DesktopTopBar;
window.CCMarkDesktop = CCMarkDesktop;

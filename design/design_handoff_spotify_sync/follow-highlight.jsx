// follow-highlight.jsx — "You follow" treatment + browse card hierarchy audit
//
// Rebuilt to match the LIVE browse row (see reference screenshot): square art,
// bold headline, tour subtitle, VENUE · TIME mono line, genre chips.
//
// Two changes land together:
//   1. The eye/"watch" button is REMOVED from the browse row (watch happens on the
//      event-detail page) — this frees the right column and the visual budget.
//   2. "You follow" is woven into the EXISTING chip row as a filled chip (our
//      --accent, NOT Spotify green) + a light left rail. Zero net-new elements.
//
//   AuditStrip          — before / rejected / after, on the REAL row
//   EventRowCC          — the shipped list row (followed | plain)
//   HeroCardCC          — hero with integrated follow treatment
//   DetailFollowStrip   — event-detail recognition strip
//   BrowseWithFollows   — a full browse screen showing hierarchy in context

function fhArt(hue, size, radius = 8) {
  return {
    width: size, height: size, borderRadius: radius, flexShrink: 0,
    background: `linear-gradient(135deg, oklch(0.4 0.11 ${hue}), oklch(0.24 0.07 ${hue + 45}))`,
  };
}
function GenreChip({ children }) {
  return (
    <span style={{
      padding: "3px 8px", borderRadius: 5, background: "var(--surface-2)",
      color: "var(--fg-muted)", fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10, letterSpacing: "0.02em", lineHeight: 1.4,
    }}>{children}</span>
  );
}
function FollowChip() {
  const { SpotifyLogo } = window;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 8px 3px 5px", borderRadius: 5,
      background: "var(--surface-3)", border: "1px solid var(--border-strong)",
      color: "var(--fg)", fontFamily: "Inter, system-ui",
      fontWeight: 700, fontSize: 10.5, letterSpacing: "-0.005em", lineHeight: 1.3, whiteSpace: "nowrap",
    }}>
      <SpotifyLogo size={13} radius={3} />
      Following
    </span>
  );
}

// ── The shipped list row (matches the live UI) ─────────────────
// Follow signal = a neutral, Spotify-marked chip in the existing chip row.
// --accent is reserved for Watching (shows); Following never uses it.
function EventRowCC({
  headline = "Sleep Token", subtitle = "Even In Arcadia Tour",
  venue = "Fillmore Auditorium", time = "8:00 PM",
  genres = ["metal", "prog"], price = "$42", hue = 280,
  followed = false,
}) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "12px 0", minWidth: 0 }}>
      <div style={fhArt(hue, 56)} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 15, color: "var(--fg)", letterSpacing: "-0.01em", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{headline}</div>
        {subtitle && <div style={{ fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</div>}
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: "var(--fg-muted)", letterSpacing: "0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {venue}<span style={{ opacity: 0.45 }}> · </span>{time}
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 1, alignItems: "center" }}>
          {followed && <FollowChip />}
          {genres.map(g => <GenreChip key={g}>{g}</GenreChip>)}
        </div>
      </div>
      <div style={{ flexShrink: 0, alignSelf: "flex-start", paddingTop: 1 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: price === "tba" ? "var(--fg-subtle)" : "var(--signal)", fontWeight: price === "tba" ? 400 : 600, letterSpacing: "0.03em" }}>{price}</span>
      </div>
    </div>
  );
}

// ── The audit: before / rejected / after (on the real row) ─────
function AuditStrip() {
  const Label = ({ tone, children }) => (
    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8, color: tone === "bad" ? "var(--danger)" : tone === "good" ? "var(--accent)" : "var(--fg-subtle)" }}>{children}</div>
  );
  const Frame = ({ children }) => (
    <div style={{ padding: "2px 12px", borderRadius: 12, background: "var(--surface-1)", border: "1px solid var(--border)" }}>{children}</div>
  );
  // rejected: the naive approach — keep the eye button AND stack a green badge
  const Rejected = () => (
    <div style={{ display: "flex", gap: 12, padding: "12px 0", alignItems: "flex-start" }}>
      <div style={fhArt(280, 56)} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Sleep Token</span>
          <span style={{ padding: "2px 6px", borderRadius: 4, background: "color-mix(in oklch, var(--spotify-green) 20%, transparent)", color: "var(--spotify-green)", fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 700, letterSpacing: "0.06em", flexShrink: 0 }}>FOLLOWING</span>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>Even In Arcadia Tour</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: "var(--fg-muted)" }}>Fillmore Auditorium · 8:00 PM</div>
        <div style={{ display: "flex", gap: 5 }}><GenreChip>metal</GenreChip><GenreChip>prog</GenreChip></div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M2 9s2.5-4.5 7-4.5S16 9 16 9s-2.5 4.5-7 4.5S2 9 2 9z" stroke="var(--fg-muted)" strokeWidth="1.4"/><circle cx="9" cy="9" r="2" stroke="var(--fg-muted)" strokeWidth="1.4"/></svg>
        </div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--fg-subtle)" }}>tba</span>
      </div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <Label>Before · today's live row</Label>
        <Frame>
          <div style={{ display: "flex", gap: 12, padding: "12px 0", alignItems: "flex-start" }}>
            <div style={fhArt(280, 56)} />
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Sleep Token</div>
              <div style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>Even In Arcadia Tour</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: "var(--fg-muted)" }}>Fillmore Auditorium · 8:00 PM</div>
              <div style={{ display: "flex", gap: 5 }}><GenreChip>metal</GenreChip><GenreChip>prog</GenreChip></div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M2 9s2.5-4.5 7-4.5S16 9 16 9s-2.5 4.5-7 4.5S2 9 2 9z" stroke="var(--fg-muted)" strokeWidth="1.4"/><circle cx="9" cy="9" r="2" stroke="var(--fg-muted)" strokeWidth="1.4"/></svg></div>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--fg-subtle)" }}>tba</span>
            </div>
          </div>
        </Frame>
      </div>
      <div>
        <Label tone="bad">Rejected · badge stacked on + eye button kept (green, extra element)</Label>
        <Frame><Rejected /></Frame>
        <div style={{ fontSize: 11.5, color: "var(--fg-subtle)", marginTop: 6, lineHeight: 1.4, fontStyle: "italic" }}>A green chip that fights the headline, a redundant eye button, and jarring green against our palette.</div>
      </div>
      <div>
        <Label tone="good">After · follow chip in the existing chip row · eye button dropped</Label>
        <Frame><EventRowCC followed={true} /></Frame>
        <div style={{ fontSize: 11.5, color: "var(--fg-subtle)", marginTop: 6, lineHeight: 1.4, fontStyle: "italic" }}>"Following" joins the chip row it belongs in, in our --accent — text-only, no icon. A 2px rail promotes the row. Watch moved to detail.</div>
      </div>
    </div>
  );
}

// ── Hero card with follow treatment ─────────────────────────────
function HeroCardCC({ followed = true }) {
  const { SpotifyLogo } = window;
  return (
    <div style={{ borderRadius: 14, overflow: "hidden", background: "var(--surface-1)", border: "1px solid var(--border-strong)", position: "relative" }}>
      <div style={{ position: "relative", height: 168, background: "linear-gradient(135deg, oklch(0.38 0.11 280), oklch(0.22 0.07 325))" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 34%, var(--bg) 100%)" }} />
        {followed ? (
          <div style={{ position: "absolute", top: 12, left: 12, display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 9px", borderRadius: 6, background: "var(--surface-1)", border: "1px solid var(--border-strong)", color: "var(--fg)" }}>
            <SpotifyLogo size={13} radius={3} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>Following</span>
          </div>
        ) : (
          <div style={{ position: "absolute", top: 12, left: 12, display: "inline-flex", alignItems: "center", padding: "4px 9px", borderRadius: 6, background: "var(--accent)", color: "var(--fg-on-accent)" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>★ Tonight's pick</span>
          </div>
        )}
      </div>
      <div style={{ padding: "0 15px 16px", marginTop: -34, position: "relative" }}>
        <div style={{ fontFamily: "Inter, system-ui", fontWeight: 900, fontSize: 22, letterSpacing: "-0.025em", lineHeight: 1.1, color: "var(--fg)" }}>Sleep Token</div>
        <div style={{ fontSize: 12.5, color: "var(--fg-muted)", marginTop: 3 }}>Even In Arcadia Tour</div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: "var(--fg-muted)" }}>
          <span style={{ color: "var(--signal)" }}>Fillmore</span><span style={{ opacity: 0.4 }}>·</span><span>Jun 14</span><span style={{ opacity: 0.4 }}>·</span><span style={{ color: "var(--signal)" }}>$42</span>
        </div>
      </div>
    </div>
  );
}

// ── Watching pill (accent, as shipped) + Event-detail mocks ─────
function WatchingPill({ watching = true }) {
  if (watching) return (
    <button style={{ all: "unset", boxSizing: "border-box", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 15px", borderRadius: 10, border: "1px solid var(--accent)", color: "var(--accent)", background: "color-mix(in oklch, var(--accent) 10%, transparent)", fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 14 }}>
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3.2 3.2L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      Watching
    </button>
  );
  return (
    <button style={{ all: "unset", boxSizing: "border-box", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 15px", borderRadius: 10, border: "1px solid var(--border-strong)", color: "var(--fg)", background: "transparent", fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 14 }}>
      <span style={{ fontSize: 16, lineHeight: 1, marginTop: -1 }}>+</span> Watch this show
    </button>
  );
}

// ── Event-detail recognition strip (neutral — NOT accent) ───────
function DetailFollowStrip({ artist = "The Head And The Heart" }) {
  const { SpotifyLogo } = window;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", borderRadius: 12, background: "var(--surface-1)", border: "1px solid var(--border)" }}>
      <SpotifyLogo size={30} radius={8} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.01em" }}>You follow {artist} on Spotify</div>
      </div>
    </div>
  );
}

// ── Event-detail header — Watching (action) vs Following (context) ─
function DetailHeaderMock() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
      <div style={{ display: "flex", gap: 6 }}><GenreChip>indie</GenreChip><GenreChip>folk</GenreChip></div>
      <div style={{ fontFamily: "Inter, system-ui", fontWeight: 900, fontSize: 26, letterSpacing: "-0.03em", lineHeight: 1.08, color: "var(--fg)" }}>The Head And The Heart</div>
      <div style={{ fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.35 }}>The Head And The Heart with the Colorado Symphony Orchestra</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
        <WatchingPill watching />
      </div>
      <DetailFollowStrip />
    </div>
  );
}

// ── Full browse screen, follows in context ──────────────────────
function BrowseWithFollows() {
  const rows = [
    { headline: "Sleep Token", subtitle: "Even In Arcadia Tour", venue: "Fillmore Auditorium", time: "8:00 PM", genres: ["metal", "prog"], price: "$42", hue: 280, followed: true },
    { headline: "Wednesday", subtitle: "with Lightning Bug", venue: "Mission Ballroom", time: "8:00 PM", genres: ["shoegaze", "indie"], price: "$30", hue: 160, followed: true },
    { headline: "Two Friends", subtitle: "Big Bootie Tour", venue: "Red Rocks", time: "7:00 PM", genres: ["electronic"], price: "$45", hue: 210, followed: false },
    { headline: "DJ Deelo b2b Timmy Neutron", subtitle: "Treehouse presents", venue: "Larimer Lounge", time: "8:00 PM", genres: ["house"], price: "tba", hue: 30, followed: false },
    { headline: "Geese", subtitle: "3D Country Tour", venue: "Ogden Theatre", time: "9:00 PM", genres: ["rock"], price: "$25", hue: 200, followed: true },
  ];
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)", fontFamily: "Inter, system-ui", padding: "58px 16px 16px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <window.MMark size={26} />
        <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>concert<span style={{ color: "var(--accent)" }}>crawl.</span></span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 2 }}>
        <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.03em", color: "var(--accent)" }}>Tonight</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--fg-muted)", letterSpacing: "0.08em" }}>5 SHOWS · 3 YOU FOLLOW</span>
      </div>
      <div style={{ marginTop: 6 }}>
        {rows.map((r, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div style={{ height: 1, background: "var(--border)" }} />}
            <EventRowCC {...r} />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { EventRowCC, AuditStrip, HeroCardCC, DetailFollowStrip, DetailHeaderMock, WatchingPill, BrowseWithFollows });

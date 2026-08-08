// artist-surface.jsx — the artist page's own parts.
// Hero · follow · history prose · upcoming shows · empty-upcoming · chrome.
// Every colour is var(--*). The ONE exception on this page is the embed
// stand-in (artist-embed.jsx), which is foreign by definition.

if (typeof document !== "undefined" && !document.getElementById("ap-styles")) {
  const s = document.createElement("style");
  s.id = "ap-styles";
  s.textContent = [
    "@keyframes ap-sh{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}",
    ".ap-shimmer{background:linear-gradient(90deg,transparent,var(--overlay-hover),transparent);animation:ap-sh 1.4s ease-in-out infinite}",
    ".ap-skel{background:var(--surface-2);border-radius:6px;position:relative;overflow:hidden}",
    ".ap-skel:after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,var(--overlay-hover),transparent);animation:ap-sh 1.4s ease-in-out infinite}",
    ".ap-row:hover{background:var(--overlay-hover)}",
    ".ap-page a{color:var(--signal)}.ap-page a:hover{color:var(--fg)}",
  ].join("");
  document.head.appendChild(s);
}

// ── Photo slot ──────────────────────────────────────────────────────────────
// The photo and the IdentityArt fallback occupy the IDENTICAL container, per
// the Phase 7.5 hard-swap contract: no layout churn when a match resolves.
// FLAG (see README): press photos arrive on expiring signed URLs at arbitrary
// aspect ratios. This treatment fixes the CONTAINER, not the image — crop with
// object-fit: cover and re-sign on load; never let the image set the height.
function ArtistPlate({ name, photo, height, initials = true }) {
  if (!photo) {
    return <window.IdentityArt name={name} kind="artist" scale="hero"
      showInitials={initials} height={height} grain={0.1}/>;
  }
  return (
    <div style={{ height, width: "100%", position: "relative", overflow: "hidden",
      background: "#231F2B" }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.5,
        backgroundImage: "repeating-linear-gradient(115deg,#3A3446 0 12px,#2B2634 12px 24px)" }}/>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center",
        justifyContent: "center" }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, fontWeight: 700,
          letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)",
          textAlign: "center", lineHeight: 1.7 }}>
          press photo<br/>cover-cropped · signed url
        </span>
      </div>
      <div style={{ position: "absolute", inset: 0, background: "var(--image-tint)" }}/>
    </div>
  );
}

// ── Chrome — matches Event Detail v2 / Venue Profile exactly ────────────────
function BackChip({ top = 56 }) {
  return (
    <button aria-label={ARTIST_COPY.backLabel} style={{
      all: "unset", cursor: "pointer", position: "absolute", top, left: 14, zIndex: 20,
      width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ width: 36, height: 36, borderRadius: 18, background: "var(--scrim)",
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--fg)"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3L5 8l5 5"/></svg>
      </span>
    </button>
  );
}

function Crumb({ name }) {
  return (
    <nav style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "Inter, system-ui",
      fontSize: 13, color: "var(--fg-muted)", marginBottom: 18 }}>
      <a href="#" style={{ color: "var(--fg-muted)", textDecoration: "none" }}>{ARTIST_COPY.crumbRoot}</a>
      <span style={{ color: "var(--fg-subtle)" }}>/</span>
      <span style={{ color: "var(--fg)", fontWeight: 600 }}>{name}</span>
    </nav>
  );
}

// Sticky sub-header — appears once the hero name scrolls out, and carries the
// follow with it. The page never has two live follow affordances at once.
// showFollow=false in the no-shows state, where the page's single follow lives
// inside the empty block — duplicating it here would break the invariant.
// NATIVE FOLLOWING: `state` is threaded through to the sticky Follow button.
// While scrolled this IS the page's one live follow affordance, so it has to
// carry locked and pending like every other instance. Without it the same user
// state would look different depending on scroll position.
function StickyBar({ name, following, compact, showFollow = true, state }) {
  return (
    <div style={{ position: "absolute", top: compact ? 0 : 44, left: 0, right: 0, zIndex: 30,
      height: 56, display: "flex", alignItems: "center", gap: 10, padding: "0 12px",
      background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
      <button aria-label={ARTIST_COPY.backLabel} style={{ all: "unset", cursor: "pointer", width: 44,
        height: 44, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--fg)"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3L5 8l5 5"/></svg>
      </button>
      <span style={{ flex: 1, minWidth: 0, fontFamily: "Inter, system-ui", fontWeight: 800,
        fontSize: 15, color: "var(--fg)", letterSpacing: "-0.01em", whiteSpace: "nowrap",
        overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
      {showFollow && <FollowButton following={following} name={name} size="compact" state={state}/>}
    </div>
  );
}

// ── Follow ──────────────────────────────────────────────────────────────────
// One affordance, one mental model: autoWatch. Writes user_artist_follows with
// source:'manual'. Never touches the user's Spotify account. Identical for
// non-Spotify artists.
// NATIVE FOLLOWING extension: `state` adds locked / pending to the shipped
// two-state button. idle + following skins are UNCHANGED, so a caller that
// passes only `following` behaves exactly as before.
//
// There is no `unavailable`. R2 had one for "artist exists, zero Denver
// shows"; that artist can't exist (artists are a projection off event billing,
// and the detail endpoint 404s with no visible event). See EmptyUpcoming for
// how "played here before, nothing upcoming" reads instead.
function FollowButton({ following, name, size = "full", signedOut = false, state, onToggle }) {
  const compact = size === "compact";
  const base = {
    all: "unset", boxSizing: "border-box", cursor: "pointer", display: "flex",
    alignItems: "center", justifyContent: "center", gap: 7,
    fontFamily: "Inter, system-ui", fontWeight: 800, letterSpacing: "-0.01em",
    minHeight: 44, borderRadius: 10,
  };
  const style = compact
    ? { ...base, height: 44, padding: "0 14px", fontSize: 13.5, flexShrink: 0 }
    : { ...base, height: 48, width: "100%", fontSize: 15 };
  const extra = state === "locked"
      ? { background: "transparent", color: "var(--fg)", border: "1px solid var(--border-strong)" }
    : state === "pending"
      ? { background: "var(--signal)", color: "var(--fg-on-accent)", border: "1px solid var(--signal)", opacity: 0.72 }
    : null;
  const skin = extra ? extra : signedOut
    ? { background: "transparent", color: "var(--fg)", border: "1px solid var(--border-strong)" }
    : following
      ? { background: "color-mix(in oklab, var(--signal) 14%, transparent)", color: "var(--signal)",
          border: "1px solid var(--signal)" }
      : { background: "var(--signal)", color: "var(--fg-on-accent)", border: "1px solid var(--signal)" };
  const label = state === "locked" ? ARTIST_COPY.follow
    : state === "pending" ? "Following…"
    : signedOut ? ARTIST_COPY.followSignedOut
    : following ? ARTIST_COPY.following : ARTIST_COPY.follow;
  const glyph = state === "locked"
      ? <svg width="13" height="13" viewBox="0 0 12 14" fill="none"><rect x="1.2" y="6" width="9.6" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M3.6 6V4.2a2.4 2.4 0 014.8 0V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
    : signedOut ? null
    : (following
        ? <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor"
            strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2 7.5l3.4 3.4L12 3.6"/></svg>
        : <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor"
            strokeWidth="2.4" strokeLinecap="round"><path d="M7 2v10M2 7h10"/></svg>);
  return (
    <button onClick={onToggle} aria-pressed={signedOut || state ? undefined : !!following}
      aria-label={signedOut ? ARTIST_COPY.followSignedOut
        : following ? ARTIST_COPY.followingAria(name) : ARTIST_COPY.followAria(name)}
      style={{ ...style, ...skin }}>
      {glyph}
      {label}
    </button>
  );
}

// No follower count. R2 drew one and Hugh liked it, but it's new API work and
// production has zero manual follows — it would read 0–2 for months and
// undercut exactly the artist it was meant to vouch for. Revisit when the
// numbers are real.
//
// The "played Denver before, nothing upcoming" case is NOT handled here. The
// shipped page already routes it through EmptyUpcoming, which carries its own
// follow button and its own copy for exactly that case. FollowBlock stays
// guarded on hasShows so the page never grows a second live follow.
function FollowBlock({ name, following, signedOut, state }) {
  const pitch = state === "locked" ? "Following artists is part of Premium. Follow anyone, hear about every Denver date they announce."
    : signedOut ? ARTIST_COPY.followSignedOutPitch
    : following ? ARTIST_COPY.followPitchActive : ARTIST_COPY.followPitch;
  return (
    <div>
      <FollowButton name={name} following={following} signedOut={signedOut} state={state}/>
      <div style={{ fontFamily: "Inter, system-ui", fontSize: 11.5, color: "var(--fg-subtle)",
        marginTop: 8, lineHeight: 1.45 }}>
        {pitch}
      </div>
    </div>
  );
}

// ── History — prose. Honest about the window, source-agnostic. ──────────────
function HistoryLine({ artist, since }) {
  return (
    <p style={{ margin: "10px 0 0", fontFamily: "Inter, system-ui", fontSize: 13,
      lineHeight: 1.55, color: "var(--fg-muted)", textWrap: "pretty" }}>
      {window.historyLine(artist.history, since)}
    </p>
  );
}

// ── Section header — lifted from Event Detail v2 ────────────────────────────
function SectionHead({ title, count, id }) {
  return (
    <div id={id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <h2 style={{ margin: 0, fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 15,
        color: "var(--fg)", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>{title}</h2>
      <div style={{ flex: 1, height: 1, background: "var(--border)" }}/>
      {count != null && (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600,
          letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-subtle)" }}>{count}</span>
      )}
    </div>
  );
}

// ── Upcoming shows ──────────────────────────────────────────────────────────
function DateStamp({ iso, dim }) {
  const d = window.fmtDate(iso);
  return (
    <div style={{ width: 44, flexShrink: 0, textAlign: "center" }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
        letterSpacing: "0.1em", color: "var(--fg-subtle)" }}>{d.dow}</div>
      <div style={{ fontFamily: "Inter, system-ui", fontSize: 19, fontWeight: 800, lineHeight: 1.1,
        color: dim ? "var(--fg-muted)" : "var(--fg)", letterSpacing: "-0.02em" }}>{d.day}</div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
        letterSpacing: "0.1em", color: "var(--fg-subtle)" }}>{d.mon}</div>
    </div>
  );
}

function PriceChip({ price }) {
  if (price == null) {
    return <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600,
      letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fg-subtle)" }}>
      {ARTIST_COPY.priceUnknown}</span>;
  }
  return (
    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700,
      color: "var(--fg)", padding: "4px 8px", borderRadius: 6, background: "var(--surface-2)",
      border: "1px solid var(--border)" }}>${price}</span>
  );
}

function ShowRow({ show }) {
  return (
    <a href="#" className="ap-row" style={{ display: "flex", alignItems: "center", gap: 12,
      minHeight: 60, padding: "8px 8px", margin: "0 -8px", borderRadius: 8,
      textDecoration: "none", color: "inherit" }}>
      <DateStamp iso={show.iso}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 14,
          color: "var(--fg)", whiteSpace: "nowrap", overflow: "hidden",
          textOverflow: "ellipsis" }}>{show.venue}</div>
        <div style={{ fontFamily: "Inter, system-ui", fontSize: 11.5, color: "var(--fg-muted)",
          marginTop: 2 }}>{show.city}</div>
      </div>
      <PriceChip price={show.price}/>
    </a>
  );
}

// A run at one venue collapses into a single unit — five nights at the same
// room is ONE thing that happens, not five unrelated rows.
function RunGroup({ group }) {
  return (
    <div style={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface-1)",
      padding: 12, margin: "2px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 14, color: "var(--fg)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{group.venue}</div>
          <div style={{ fontFamily: "Inter, system-ui", fontSize: 11.5,
            color: "var(--fg-muted)", marginTop: 2 }}>{group.city}</div>
        </div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, fontWeight: 700,
          letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--signal)",
          padding: "4px 8px", borderRadius: 5, flexShrink: 0,
          background: "color-mix(in oklab, var(--signal) 12%, transparent)",
          border: "1px solid color-mix(in oklab, var(--signal) 40%, transparent)" }}>
          {ARTIST_COPY.residencyRun(group.shows.length)}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {group.shows.map((s, i) => {
          const d = window.fmtDate(s.iso);
          return (
            <a key={s.iso} href="#" className="ap-row" style={{ display: "flex", alignItems: "center",
              gap: 12, minHeight: 44, padding: "0 8px", margin: "0 -8px", borderRadius: 6,
              textDecoration: "none", color: "inherit",
              borderTop: i ? "1px solid var(--border)" : "none" }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, fontWeight: 700,
                letterSpacing: "0.06em", color: "var(--fg-muted)", width: 92, flexShrink: 0 }}>
                {d.dow} {d.mon} {d.day}</span>
              <span style={{ flex: 1 }}/>
              <PriceChip price={s.price}/>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function UpcomingShows({ artist, name }) {
  const items = window.groupShows(artist.shows);
  const [open, setOpen] = React.useState(false);
  const cap = window.SHOWS_VISIBLE;
  const overflow = items.length > cap;
  const shown = overflow && !open ? items.slice(0, cap) : items;
  return (
    <section aria-label={ARTIST_COPY.showsListAria(name)}>
      <SectionHead id="upcoming" title={ARTIST_COPY.upcomingTitle}
        count={ARTIST_COPY.upcomingCount(artist.shows.length)}/>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {shown.map((it, i) => it.kind === "run"
          ? <RunGroup key={"r" + i} group={it}/>
          : <React.Fragment key={it.iso}>
              {i > 0 && shown[i - 1].kind === "one" &&
                <div style={{ height: 1, background: "var(--border)", marginLeft: 56 }}/>}
              <ShowRow show={it}/>
            </React.Fragment>)}
      </div>
      {overflow && (
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} style={{
          all: "unset", cursor: "pointer", boxSizing: "border-box", marginTop: 10, width: "100%",
          minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: 10, border: "1px solid var(--border-strong)", color: "var(--fg-muted)",
          fontFamily: "Inter, system-ui", fontSize: 13, fontWeight: 700 }}>
          {open ? ARTIST_COPY.showFewer : ARTIST_COPY.showAll(artist.shows.length)}
        </button>
      )}
    </section>
  );
}

// Past shows: crawl data only. Deliberately thinner than Upcoming — date +
// venue, no price, no link-out, no setlists (#1170). It is evidence for the
// history line, not a second list to shop from, and it closes with the sentence
// that names the window so a list sitting there looking finished can never
// imply a complete record.
function PastShows({ artist, name, since }) {
  const past = artist.past || [];
  if (!past.length) return null;
  return (
    <section aria-label={ARTIST_COPY.pastListAria(name)}>
      <SectionHead title={ARTIST_COPY.pastTitle} count={ARTIST_COPY.upcomingCount(past.length)}/>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex",
        flexDirection: "column" }}>
        {past.map((s, i) => {
          const d = window.fmtDate(s.iso);
          return (
            <li key={s.iso + s.venue} style={{ display: "flex", alignItems: "center", gap: 12,
              minHeight: 38, borderTop: i ? "1px solid var(--border)" : "none" }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600,
                letterSpacing: "0.06em", color: "var(--fg-subtle)", width: 74, flexShrink: 0 }}>
                {d.mon} {d.day}</span>
              <span style={{ flex: 1, minWidth: 0, fontFamily: "Inter, system-ui", fontSize: 13,
                fontWeight: 600, color: "var(--fg-muted)", whiteSpace: "nowrap",
                overflow: "hidden", textOverflow: "ellipsis" }}>{s.venue}</span>
            </li>
          );
        })}
      </ul>
      <p style={{ margin: "12px 0 0", fontFamily: "Inter, system-ui", fontSize: 11.5,
        lineHeight: 1.5, color: "var(--fg-subtle)", textWrap: "pretty" }}>
        {ARTIST_COPY.pastNote(since || window.CRAWL_SINCE)}</p>
    </section>
  );
}

// ── Empty upcoming — the majority state, and the conversion moment ──────────
// Not a degraded list. The follow LEAVES the hero and lives here, so the page
// still has exactly one follow affordance and it sits inside the pitch.
// NATIVE FOLLOWING: `state` is the only addition, threaded to the inline
// FollowButton so the no-upcoming case gets locked and pending like everywhere
// else. emptyTitle/emptyBody already say what a "no dates announced" line and a
// pitch line would say, so neither is added here.
function EmptyUpcoming({ name, following, signedOut, state, inlineFollow = true }) {
  return (
    <section>
      <SectionHead id="upcoming" title={ARTIST_COPY.upcomingTitle}/>
      <div style={{ borderRadius: 14, border: "1px solid var(--border)",
        background: "var(--surface-1)", padding: 18 }}>
        <div style={{ fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 17,
          color: "var(--fg)", letterSpacing: "-0.02em" }}>{ARTIST_COPY.emptyTitle}</div>
        <p style={{ margin: inlineFollow ? "8px 0 16px" : "8px 0 0", fontFamily: "Inter, system-ui", fontSize: 13,
          lineHeight: 1.55, color: "var(--fg-muted)", textWrap: "pretty" }}>
          {following ? ARTIST_COPY.emptyBodyFollowing : ARTIST_COPY.emptyBody}</p>
        {inlineFollow && <FollowButton name={name} following={following} signedOut={signedOut} state={state}/>}
      </div>
    </section>
  );
}

// ── Loading — clock one: the artist fetch ───────────────────────────────────
function HeroSkeleton({ height }) {
  return (
    <div className="ap-skel" style={{ height, width: "100%", borderRadius: 0 }}/>
  );
}
function TextSkeleton({ w, h = 12, mt = 0 }) {
  return <div className="ap-skel" style={{ width: w, height: h, marginTop: mt }}/>;
}
function ShowsSkeleton({ rows = 3 }) {
  return (
    <div role="status" aria-busy="true" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden",
        clip: "rect(0 0 0 0)" }}>{ARTIST_COPY.loadingArtist}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 44 }}>
          <div className="ap-skel" style={{ width: 44, height: 40, borderRadius: 8 }}/>
          <div style={{ flex: 1 }}>
            <TextSkeleton w="62%" h={13}/>
            <TextSkeleton w="34%" h={10} mt={7}/>
          </div>
          <div className="ap-skel" style={{ width: 42, height: 22, borderRadius: 6 }}/>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, {
  ArtistPlate, BackChip, Crumb, StickyBar, FollowButton, FollowBlock, HistoryLine,
  SectionHead, ShowRow, RunGroup, UpcomingShows, PastShows, EmptyUpcoming, DateStamp,
  PriceChip, HeroSkeleton, TextSkeleton, ShowsSkeleton,
});

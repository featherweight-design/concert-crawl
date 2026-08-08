// artist-embed.jsx — the un-themeable iframe, and how we live with it.
//
// THE CONSTRAINT
// open.spotify.com/embed/artist/{id} takes a background colour and dimensions.
// Nothing else. Its type, controls and internal contrast are theirs, fixed, and
// will not inherit a single one of our tokens — across nine themes, six of them
// saturated, one of them the only light mode we ship.
//
// THE STAND-IN
// <EmbedStandIn> is a NEUTRAL, deliberately foreign rectangle at the exact
// embed dimensions. It is NOT a drawing of Spotify's player — it carries no
// Spotify chrome, colours or mark. Its palette is HARDCODED on purpose: that is
// the whole point of this file. It is the one rectangle on the page that does
// not read var(--*), because in production it can't.
//
// Swap it for the real <iframe src="https://open.spotify.com/embed/artist/{id}"
// loading="lazy"> at build time; every wrapper in this file is unchanged.

const EMBED_H = { compact: 152, tall: 352 };

// Foreign palette — fixed, theme-blind, by design. Approximates the contrast
// character of a third-party player we don't control.
const FOREIGN = {
  fg: "#F2F2F2", fgMuted: "#A6A6A6", art: "#4A4A52", ctl: "#E8E8E8", track: "#5A5A60",
};

function EmbedStandIn({ name, height = EMBED_H.compact, bg = "#1A1A1D", radius = 8, loading = false }) {
  const art = height >= 300 ? 120 : 84;
  return (
    <div
      role="img"
      aria-label={ARTIST_COPY.playerTitle(name)}
      style={{
        height, width: "100%", borderRadius: radius, background: bg, overflow: "hidden",
        display: "flex", alignItems: "center", gap: 14, padding: 14, boxSizing: "border-box",
        position: "relative", flexDirection: height >= 300 ? "column" : "row",
        justifyContent: height >= 300 ? "center" : "flex-start",
      }}>
      <div style={{ width: art, height: art, borderRadius: 4, background: FOREIGN.art, flexShrink: 0 }}/>
      <div style={{ flex: height >= 300 ? "none" : 1, minWidth: 0, width: height >= 300 ? "100%" : "auto",
        textAlign: height >= 300 ? "center" : "left" }}>
        <div style={{ fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 15, color: FOREIGN.fg,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{loading ? "" : name}</div>
        <div style={{ fontFamily: "Inter, system-ui", fontSize: 12, color: FOREIGN.fgMuted, marginTop: 3 }}>
          {loading ? "" : "Artist"}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14,
          justifyContent: height >= 300 ? "center" : "flex-start" }}>
          <div style={{ width: 30, height: 30, borderRadius: 15, background: FOREIGN.ctl, flexShrink: 0 }}/>
          <div style={{ flex: 1, maxWidth: 160, height: 3, borderRadius: 2, background: FOREIGN.track }}/>
        </div>
      </div>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)", borderRadius: radius }}/>
    </div>
  );
}

// Mono rail used by every direction — the label that turns "broken" into
// "third party". Same vocabulary as the status rails elsewhere in the app.
function EmbedRail({ children, right }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
        letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fg-subtle)" }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: "var(--border)" }}/>
      {right && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600,
        letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-subtle)" }}>{right}</span>}
    </div>
  );
}

// Skip link — the honest answer to a tab region we don't own. Visually hidden
// until focused; jumps focus PAST the iframe's uncontrolled tab stops.
//
// It only exists when there is something after the player to skip TO. In the
// no-shows state the player is the last block on the page, so the link would
// send focus BACKWARDS past a block already read — there, it isn't rendered.
function EmbedSkipLink({ targetId }) {
  const [f, setF] = React.useState(false);
  if (!targetId) return null;
  return (
    <a href={"#" + targetId} onFocus={() => setF(true)} onBlur={() => setF(false)}
      style={f ? { display: "inline-block", marginBottom: 8, padding: "8px 12px", minHeight: 44,
        boxSizing: "border-box", lineHeight: "28px", borderRadius: 8, background: "var(--surface-2)",
        color: "var(--fg)", border: "1px solid var(--focus)", outline: "2px solid var(--focus)",
        outlineOffset: 2, fontFamily: "Inter, system-ui", fontSize: 13, fontWeight: 600,
        textDecoration: "none" }
        : { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)",
            whiteSpace: "nowrap" }}>
      {ARTIST_COPY.playerSkip}
    </a>
  );
}

// ── A · SHELF — the embed as content inside a full card ─────────────────────
// Heaviest. A titled card with generous padding; the embed is treated as a
// figure inside our furniture. Costs ~56px of vertical chrome.
function EmbedShelf({ name, height, bg, skipTo }) {
  return (
    <section style={{ borderRadius: 14, background: "var(--surface-1)",
      border: "1px solid var(--border)", padding: 16 }}>
      <EmbedSkipLink targetId={skipTo}/>
      <div style={{ fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 15,
        color: "var(--fg)", marginBottom: 3 }}>{ARTIST_COPY.playerShelfTitle}</div>
      <div style={{ fontFamily: "Inter, system-ui", fontSize: 12, color: "var(--fg-muted)",
        marginBottom: 12 }}>{ARTIST_COPY.playerPreviewNote}</div>
      <EmbedStandIn name={name} height={height} bg={bg}/>
    </section>
  );
}

// ── B · MAT — RECOMMENDED ───────────────────────────────────────────────────
// We stop trying to make it ours. A mono rail names it as somebody else's
// player, and an 8px token-owned mat sits between the foreign rectangle and
// our page so the two colour systems never touch. The iframe's own background
// param is set to the computed --surface-1 hex, so the only seam is at the
// mat's inner edge — where we already drew a border on purpose.
function EmbedMat({ name, height, bg, matToken = "var(--surface-1)", skipTo }) {
  return (
    <section>
      <EmbedRail right={ARTIST_COPY.playerRailThirdParty}>{ARTIST_COPY.playerRail}</EmbedRail>
      <EmbedSkipLink targetId={skipTo}/>
      <div style={{ padding: 8, borderRadius: 12, background: matToken,
        border: "1px solid var(--border)" }}>
        <EmbedStandIn name={name} height={height} bg={bg}/>
      </div>
      <div style={{ fontFamily: "Inter, system-ui", fontSize: 11.5, color: "var(--fg-subtle)",
        marginTop: 8, lineHeight: 1.45 }}>{ARTIST_COPY.playerPreviewNote}</div>
    </section>
  );
}

// ── C · FLUSH — the losing bet ──────────────────────────────────────────────
// Match the bg param to --bg and butt the iframe straight against the page,
// no rail, no border. Reads clean in exactly the themes whose ink happens to
// resemble theirs, and reads like an unstyled div everywhere else — worst in
// Light. Kept in the package so the call is arguable, not asserted.
function EmbedFlush({ name, height, bg, skipTo }) {
  return (
    <section>
      <EmbedSkipLink targetId={skipTo}/>
      <EmbedStandIn name={name} height={height} bg={bg} radius={0}/>
    </section>
  );
}

// ── Loading — the second of the two clocks ──────────────────────────────────
// Reserves the exact final height so the shows list never moves when the
// iframe paints.
function EmbedLoading({ height = EMBED_H.compact, direction = "mat" }) {
  const inner = (
    <div role="status" aria-busy="true" style={{ height, borderRadius: 8, background: "var(--surface-2)",
      position: "relative", overflow: "hidden", display: "flex", alignItems: "center",
      justifyContent: "center" }}>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
        letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fg-subtle)" }}>
        {ARTIST_COPY.playerLoading}</span>
      <div className="ap-shimmer" style={{ position: "absolute", inset: 0 }}/>
    </div>
  );
  if (direction === "flush") return inner;
  return (
    <section>
      <EmbedRail right={ARTIST_COPY.playerRailThirdParty}>{ARTIST_COPY.playerRail}</EmbedRail>
      <div style={{ padding: 8, borderRadius: 12, background: "var(--surface-1)",
        border: "1px solid var(--border)" }}>{inner}</div>
      <div style={{ fontFamily: "Inter, system-ui", fontSize: 11.5, color: "var(--fg-subtle)",
        marginTop: 8 }}>{ARTIST_COPY.playerPreviewNote}</div>
    </section>
  );
}

// ── No player — the fallback's version of this slot ─────────────────────────
// Not an error, not a hole. A one-line rail + one honest sentence, occupying a
// fraction of the height. The page does not pretend a player is coming.
function EmbedAbsent() {
  return (
    <section>
      <EmbedRail>{ARTIST_COPY.playerNoneRail}</EmbedRail>
      <div style={{ fontFamily: "Inter, system-ui", fontSize: 13.5, fontWeight: 600,
        color: "var(--fg-muted)", lineHeight: 1.5 }}>
        {ARTIST_COPY.playerNone}{" "}
        <span style={{ fontWeight: 500, color: "var(--fg-subtle)" }}>{ARTIST_COPY.playerNoneSub}</span>
      </div>
    </section>
  );
}

// Router used by the page + Tweaks.
function ArtistEmbed({ name, spotifyId, direction = "mat", height = EMBED_H.compact,
  bg = "#1A1A1D", loading = false, skipTo }) {
  if (!spotifyId) return <EmbedAbsent/>;
  if (loading) return <EmbedLoading height={height} direction={direction}/>;
  if (direction === "shelf") return <EmbedShelf name={name} height={height} bg={bg} skipTo={skipTo}/>;
  if (direction === "flush") return <EmbedFlush name={name} height={height} bg={bg} skipTo={skipTo}/>;
  return <EmbedMat name={name} height={height} bg={bg} skipTo={skipTo}/>;
}

// ── The one value we DO get to send them ────────────────────────────────────
// The embed's ink is dark-mode ink, always. So we only match the bg param to
// our surface where our surface is dark. In Light we deliberately DON'T match:
// the player keeps a dark plate and reads as an intentional dark inset inside
// a light mat — like a photograph. A mat is not supposed to match the artwork.
const EMBED_LIGHT_PLATE = "#191A1F";
function embedPlate(themeKey, direction = "mat") {
  const t = (window.CC_THEMES || {})[themeKey];
  if (!t) return EMBED_LIGHT_PLATE;
  if (t.mode === "light") return EMBED_LIGHT_PLATE;
  return direction === "flush" ? t.tokens["bg"] : t.tokens["surface-1"];
}

Object.assign(window, {
  EMBED_H, EMBED_LIGHT_PLATE, embedPlate,
  ArtistEmbed, EmbedStandIn, EmbedMat, EmbedShelf, EmbedFlush,
  EmbedLoading, EmbedAbsent, EmbedRail, EmbedSkipLink,
});

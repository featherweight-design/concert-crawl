// imagery-slots.jsx — round 2. The shape system, after the live-UI review.
//
// THE CALL THAT DRIVES EVERYTHING HERE: wide slots stop being image slots.
// The live screenshots showed the pattern cleanly — every strong image slot in
// the product is square (artist page, 1:1) or portrait (following shelf, 3:4)
// and large; every weak one is wide (event-detail hero, browse hero), because a
// square source stretched across a wide band degrades into a colour wash and
// then needs a floating monogram tile to say who it is.
//
// So there are two image SHAPES and one FILL REGION:
//
//   PANEL  1:1        rows (40–56) · cards · every hero · artist page
//   CARD   3:4        the following shelf
//   FLEX   no ratio   the Spotify taste-pick card in DiscoveryShelf — see FlexArt
//
// The fill region is not a third shape. It is the one slot whose height is
// deliberately indefinite (`min-h-[116px] flex-1`, because pinning a ratio there
// broke the row in #763 r4), so it gets no ratio and no crop promise: the art is
// COMPOSED square and cover-filled into whatever the row gives it.
//
// A wide hero is no longer an image with type on top of it. It is a BAND: a 1:1
// panel, an ink field derived from the art behind it, and the type as a real
// column beside the panel. The band absorbs the title block that used to sit
// under the hero, which is what retires both the blur wash and the monogram.
//
// Sources per the locked priority (artwork → portrait → placeholder on event
// surfaces; portrait → placeholder on artist surfaces). Photographs get frame +
// `--image-tint` and nothing else — at panel size they are already right.
// Generated art is the shipped Phase 7.5 `IdentityArt` with the monogram off.
//
// Exports: Panel, ShelfCard, HeroBand, BandCard, RowTile, AvatarSlot, FlexArt,
//          SLOT_SPEC, useSlotSource, SHELF_CARD_WIDTH

// Stable handle on the shipped generated-art component, captured at load. A
// canvas that swaps `window.IdentityArt` for a slot shim would otherwise make
// Panel recurse into itself.
if (typeof window !== "undefined" && !window.__IA_BASE) window.__IA_BASE = window.IdentityArt;

const SL_UI = "Inter, system-ui, sans-serif";
const SL_MONO = "'JetBrains Mono', ui-monospace, monospace";

// Slot radius by class — one value per class, product-wide.
const SL_RADIUS = { row: 8, panel: 12, card: 14, avatar: 999 };
// Shipped constant — do not invent a new width here.
const SHELF_CARD_WIDTH = 168;

// Resolve a name through the LOCKED chain (artwork → portrait → generated on
// event surfaces; portrait → generated on artist surfaces). `dead` marks failed
// remotes: { artwork: bool, portrait: bool }.
//
// `SL_EVENTS` is a name-keyed view of EAI_EVENTS that the canvas builds from
// R_SHOWS; every surface reads the chain through this hook rather than
// reimplementing the lookup.
function useSlotSource(name, dead, surface = "event") {
  const entry = (window.SL_EVENTS || {})[name];
  const resolve = surface === "artist" ? window.resolveArtistImage : window.resolveEventImage;
  return resolve(entry, dead || {});
}

// The palette the ink field is derived from. Generated art hands us its own
// palette; a photograph can't be sampled client-side (no proxy, no CDN), so the
// field falls back to tokens and lets the panel carry the colour.
function sl_field(name, source) {
  if (source === "placeholder" && window.identityFor) {
    const id = window.identityFor(name, "artist");
    return { kind: "art", primary: id.palette.primary, paper: id.palette.bg };
  }
  return { kind: "token" };
}

// ── Panel · 1:1, every size ─────────────────────────────────────────────────
// The one image primitive. `size` is CSS px or "100%".
function Panel({ name, size = 56, radius, source, place, tone, art, ratio = "1 / 1", tag }) {
  const r = radius != null ? radius : size !== "100%" && size <= 64 ? SL_RADIUS.row : SL_RADIUS.panel;
  const inner =
    source === "portrait" ? <window.PortraitBase place={place} tone={tone}/> :
    source === "artwork"  ? <window.VenueArtBase kind={art} tone={tone}/> :
    <window.__IA_BASE name={name} kind="artist"
      scale={size !== "100%" && size <= 64 ? "micro" : "tile"} showInitials={false} grain={0.06}/>;
  return (
    <div style={{
      position: "relative", width: size, height: size === "100%" ? undefined : size,
      aspectRatio: size === "100%" ? ratio : undefined, flexShrink: 0,
      borderRadius: r, overflow: "hidden",
      boxShadow: "inset 0 0 0 1px color-mix(in oklch, var(--fg) 12%, transparent)",
    }}>
      {inner}
      {source !== "placeholder" && <>
        <div style={{ position: "absolute", inset: 0, background: "var(--image-tint)", pointerEvents: "none" }}/>
        {tag && <window.StandInTag/>}
      </>}
    </div>
  );
}

// ── HeroBand · replaces every wide full-bleed hero ──────────────────────────
// panel + ink field + type column. `size` = "mobile" | "desktop".
// The band carries the title block, so the page below it starts at content.
function HeroBand({ name, eyebrow, title, sub, size = "mobile", source, place, tone, art, back = true, children, chips }) {
  const desk = size === "desktop";
  const field = sl_field(name, source);
  const panel = desk ? 208 : 128;
  const bg = field.kind === "art"
    ? `linear-gradient(120deg, color-mix(in srgb, ${field.primary} 26%, var(--bg)) 0%, var(--bg) 62%)`
    : "linear-gradient(120deg, color-mix(in oklch, var(--surface-2) 92%, transparent) 0%, var(--bg) 66%)";
  return (
    <div style={{
      position: "relative", background: bg, borderBottom: "1px solid var(--border)",
      padding: desk ? "26px 34px 28px" : "16px 16px 18px", fontFamily: SL_UI,
    }}>
      {back && (
        <div style={{ marginBottom: desk ? 16 : 12, display: "flex", gap: 8 }}>
          <span style={{ width: 44, height: 44, borderRadius: 22, background: "var(--scrim)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--fg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3L5 8l5 5"/></svg>
          </span>
        </div>
      )}
      <div style={{ display: "flex", gap: desk ? 24 : 14, alignItems: "flex-start" }}>
        <Panel name={name} size={panel} source={source} place={place} tone={tone} art={art} tag/>
        <div style={{ minWidth: 0, flex: 1, paddingTop: desk ? 6 : 2 }}>
          {eyebrow && (
            <div style={{ fontFamily: SL_MONO, fontSize: desk ? 11 : 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--signal)" }}>{eyebrow}</div>
          )}
          <h1 style={{
            margin: eyebrow ? "8px 0 0" : 0, fontWeight: 900, letterSpacing: "-0.035em", color: "var(--fg)",
            fontSize: desk ? 44 : 26, lineHeight: 1.05, textWrap: "balance",
          }}>{title || name}</h1>
          {sub && <div style={{ marginTop: 8, fontFamily: SL_MONO, fontSize: desk ? 13 : 11.5, color: "var(--fg-muted)" }}>{sub}</div>}
          {chips && (
            <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {chips.map((c) => (
                <span key={c} style={{ fontFamily: SL_MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 7px", borderRadius: 5, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg-muted)" }}>{c}</span>
              ))}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

// ── BandCard · replaces HeroEventCard's 180px banner, same footprint ────────
function BandCard({ name, eyebrow, sub, source, place, tone, art, width }) {
  return (
    <div style={{
      width, display: "flex", gap: 14, alignItems: "center", padding: 14,
      background: "var(--surface-1)", border: "1px solid var(--border)",
      borderRadius: SL_RADIUS.card, fontFamily: SL_UI,
    }}>
      <Panel name={name} size={112} source={source} place={place} tone={tone} art={art} tag/>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontFamily: SL_MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--signal)" }}>{eyebrow}</div>
        <div style={{ marginTop: 6, fontWeight: 800, fontSize: 19, letterSpacing: "-0.02em", color: "var(--fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
        <div style={{ marginTop: 4, fontFamily: SL_MONO, fontSize: 11.5, color: "var(--fg-muted)" }}>{sub}</div>
      </div>
    </div>
  );
}

// ── ShelfCard · 3:4, the following shelf only ───────────────────────────────
// The one slot where a portrait crop is right: press portraits are shot for it,
// and the generated templates survive a 3:4 crop (they're geometric, not
// gradient washes).
function ShelfCard({ name, sub, meta, width = SHELF_CARD_WIDTH, source, place, tone, art }) {
  return (
    <div style={{
      width, borderRadius: SL_RADIUS.card, overflow: "hidden",
      background: "var(--surface-1)", border: "1px solid var(--border)", fontFamily: SL_UI, flexShrink: 0,
    }}>
      <div style={{ position: "relative" }}>
        <Panel name={name} size="100%" ratio="3 / 4" radius={0} source={source} place={place} tone={tone} art={art} tag/>
      </div>
      <div style={{ padding: "11px 12px 13px" }}>
        <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.01em", color: "var(--fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
        <div style={{ marginTop: 4, fontFamily: SL_MONO, fontSize: 10.5, color: "var(--fg-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>
        {meta && <div style={{ marginTop: 5, fontFamily: SL_MONO, fontSize: 10.5, color: "var(--fg-subtle)" }}>{meta}</div>}
      </div>
    </div>
  );
}

// ── RowTile / AvatarSlot ────────────────────────────────────────────────────
function RowTile({ name, size = 56, watching, source, place, tone, art }) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <Panel name={name} size={size} source={source} place={place} tone={tone} art={art}/>
      {watching && (
        <span role="img" aria-label="You're watching this show" style={{
          position: "absolute", top: -3, right: -3, width: 12, height: 12, borderRadius: 999,
          background: "var(--accent)", border: "2px solid var(--bg)",
        }}/>
      )}
    </div>
  );
}
function AvatarSlot({ name, size = 40, source, place, tone, art }) {
  return <Panel name={name} size={size} radius={SL_RADIUS.avatar} source={source} place={place} tone={tone} art={art}/>;
}

// ── FlexArt · the one slot with no ratio ────────────────────────────────────
// DiscoveryShelf's Spotify taste-pick card. Its image region is `flex-1` with a
// 116px floor, deliberately: pinning an aspect there broke the row once (#763
// r4), so this slot may NOT be handed 3:4 or 1:1. The rule instead:
//   · no aspect-ratio, no min/max crop promise — the row owns the height;
//   · the art is composed SQUARE and cover-filled, so it degrades by cropping
//     rather than by stretching (which is what wrecked the wide heroes);
//   · same hairline, same tint, same radius class as every other slot, so it
//     still reads as part of the set.
function FlexArt({ name, source, place, tone, art, minHeight = 116, radius = SL_RADIUS.card, tag }) {
  const inner =
    source === "portrait" ? <window.PortraitBase place={place} tone={tone}/> :
    source === "artwork"  ? <window.VenueArtBase kind={art} tone={tone}/> :
    <window.__IA_BASE name={name} kind="artist" scale="tile" showInitials={false} grain={0.06}/>;
  return (
    <div style={{
      position: "relative", flex: 1, minHeight, width: "100%", overflow: "hidden",
      borderRadius: radius,
      boxShadow: "inset 0 0 0 1px color-mix(in oklch, var(--fg) 12%, transparent)",
    }}>
      <div style={{ position: "absolute", inset: 0 }}>{inner}</div>
      {source !== "placeholder" && <>
        <div style={{ position: "absolute", inset: 0, background: "var(--image-tint)", pointerEvents: "none" }}/>
        {tag && <window.StandInTag/>}
      </>}
    </div>
  );
}

const SLOT_SPEC = [
  ["EventRow tile", "1:1 · 44–56", "row 8", "Panel. Watching tick on the art, no row width."],
  ["SmallEventRow tile", "1:1 · 40", "row 8", "Panel at micro scale."],
  ["Search / crew avatar", "1:1 · 40", "full", "Panel, circular mask. Only circular slot in the product."],
  ["Event card (HeroEventCard)", "1:1 · 112 + text", "card 14", "BandCard. Was a full-width 180px banner — ≈4:1 desktop, ≈2:1 mobile — not 16:9; that error came from the brief. Same footprint, no wide crop."],
  ["Event detail hero", "1:1 · 128 / 208 + band", "panel 12", "HeroBand. Absorbs the title block."],
  ["Browse hero", "1:1 · 128 + band", "panel 12", "HeroBand, tonight variant."],
  ["Artist page hero", "1:1 · 128 / 208 + band", "panel 12", "HeroBand. Desktop keeps the sticky rail panel."],
  ["Following shelf", "3:4 · 168 wide", "card 14", "ShelfCard. The only 3:4 in the product."],
  ["Taste-pick card (DiscoveryShelf)", "no ratio · ≥116 tall", "card 14", "FlexArt. The row owns the height (#763 r4); art is composed square and cover-filled."],
];

Object.assign(window, { Panel, HeroBand, BandCard, ShelfCard, RowTile, AvatarSlot, FlexArt,
  SLOT_SPEC, useSlotSource, sl_field, SL_RADIUS, SHELF_CARD_WIDTH });

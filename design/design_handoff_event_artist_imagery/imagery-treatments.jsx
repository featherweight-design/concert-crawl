// imagery-treatments.jsx — three candidate treatment LANGUAGES for a photo in a
// Concert Crawl image slot, plus the shared frame that carries scope-B
// unification (raw venue artwork gets the frame, not the pixels).
//
// All three are pure client-side CSS. There is no image proxy and no CDN, so
// nothing here may depend on server-side processing.
//
// PERFORMANCE DECISION (the brief asks us to flag cost): the venue recipe in
// design_handoff_venue_imagery duotones through an SVG `feComponentTransfer`
// filter and misregisters by painting the SAME image a second time. Both are
// fine on a handful of venue cards and both are wrong here — these slots appear
// 20+ times in a scrolling list. So:
//   · duotone is ONE CSS filter chain on the image element
//     (grayscale → contrast → sepia → hue-rotate → saturate), which is what the
//     compositor is fastest at and what survives every renderer we've hit.
//   · misregistration moves INTO THE SCREEN: the halftone prints in pop ink,
//     offset off-grid, as a plain background layer. The riso signature survives;
//     the doubled image layer does not. One image node, one decode, one paint.
//   · no `mix-blend-mode` anywhere. Blend layers inside the app's transformed
//     containers were measurably the most expensive thing in the mock.
//
// PER-INSTANCE COST: 1 filtered image + 3 flat background layers for the press
// languages; 1 filtered image + 2 for token ink.
//
// Exports: TREATMENTS, TreatedImage, ImageFrame, EAI_INKS

const EAI_INKS = {
  // A · the venue language: federal blue + fluorescent pink on bone.
  "press-blue": {
    id: "press-blue", label: "A · Press (venue inks)",
    paper: "#F2EBDD", ink: "#1B2A4A", pop: "#F0567A",
    duo: "grayscale(1) contrast(1.36) sepia(1) hue-rotate(174deg) saturate(2.7) brightness(0.9)",
    screen: 5, ghost: [1.5, 1], dots: [0.2, 0.15], grain: 0.3,
    blurb: "Federal blue + fluorescent pink on bone. The same two inks as the venue facades, so a venue page and an artist portrait are one print series.",
  },
  // B · same recipe, artist-side ink pair.
  "press-warm": {
    id: "press-warm", label: "B · Press (artist inks)",
    paper: "#F0E9DC", ink: "#241A3D", pop: "#FF6A24",
    duo: "grayscale(1) contrast(1.38) sepia(1) hue-rotate(-14deg) saturate(1.75) brightness(0.86)",
    screen: 7, ghost: [2, 1.5], dots: [0.24, 0.14], grain: 0.34,
    blurb: "Ink-violet + tangerine on warm bone, coarser screen. Recognisably the artist half of the same press — venues run cool, people run warm.",
  },
};

const EAI_GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23g)'/%3E%3C/svg%3E\")";

// Registry the canvas iterates. `raw` is today's behaviour, kept as the control.
const TREATMENTS = [
  { id: "raw", label: "Control · untreated", themeAware: false,
    blurb: "What ships today: the remote image, cover-cropped, with --image-tint over it. The control for every comparison." },
  EAI_INKS["press-blue"],
  EAI_INKS["press-warm"],
  { id: "token-ink", label: "C · Token ink", themeAware: true,
    blurb: "Not a print object. The photo is flattened and re-lit through theme tokens — a --surface plate under it, one --signal wash over it. Belongs to the app rather than to a press, and follows all nine themes." },
];

// ── TreatedImage ─────────────────────────────────────────────────────────────
// Wraps ANY source node (in production, an <img>). `treatment` selects the
// language; `paper` tells the token treatment which way to blend.
//   crop: object-position equivalent, applied to the child wrapper
function TreatedImage({
  treatment = "raw", children, paper = "dark", radius = 0, crop = "50% 50%",
  scale = 1, style, pop = true, dim = 0,
}) {
  const t = EAI_INKS[treatment];
  const box = {
    position: "absolute", inset: 0, transform: scale !== 1 ? `scale(${scale})` : undefined,
    transformOrigin: crop,
  };
  return (
    <div style={{
      position: "relative", width: "100%", height: "100%", overflow: "hidden",
      borderRadius: radius, isolation: "isolate",
      background: t ? t.paper : "var(--surface-2)", ...style,
    }}>
      {t ? (<>
        {/* 1 · the duotone — one filter chain on the image itself */}
        <div style={{ ...box, filter: t.duo }}>{children}</div>
        {/* 2 · the screen, printed in POP ink and offset off-grid — the misregister */}
        {pop && (
          <div style={{
            position: "absolute", inset: -t.screen, opacity: t.dots[0],
            backgroundImage: `radial-gradient(circle at 50% 50%, ${t.pop} 0 24%, transparent 28%)`,
            backgroundSize: `${t.screen}px ${t.screen}px`,
            backgroundPosition: `${t.ghost[0]}px ${t.ghost[1]}px`, pointerEvents: "none",
          }}/>
        )}
        {/* 3 · the ink screen */}
        <div style={{
          position: "absolute", inset: 0, opacity: t.dots[1],
          backgroundImage: `radial-gradient(circle at 50% 50%, ${t.ink} 0 26%, transparent 30%)`,
          backgroundSize: `${t.screen}px ${t.screen}px`, pointerEvents: "none",
        }}/>
        <div style={{
          position: "absolute", inset: 0, backgroundImage: EAI_GRAIN, backgroundSize: "150px 150px",
          opacity: t.grain, pointerEvents: "none",
        }}/>
        <div style={{
          position: "absolute", inset: 0, borderRadius: radius, pointerEvents: "none",
          boxShadow: `inset 0 0 0 1px ${t.ink}59`,
        }}/>
      </>) : treatment === "token-ink" ? (<>
        {/* token plate: the ink the photo is re-lit against */}
        <div style={{
          position: "absolute", inset: 0,
          background: paper === "light"
            ? "linear-gradient(168deg, var(--surface-2), color-mix(in oklch, var(--signal) 18%, var(--surface-1)))"
            : "linear-gradient(168deg, color-mix(in oklch, var(--signal) 26%, var(--surface-1)), var(--bg))",
        }}/>
        <div style={{
          ...box,
          filter: paper === "light"
            ? "grayscale(1) contrast(1.2) brightness(1.06)"
            : "grayscale(1) contrast(1.34) brightness(0.82)",
          opacity: paper === "light" ? 0.86 : 0.8,
        }}>{children}</div>
        {/* one coarse screen for family resemblance to the press languages */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.16, pointerEvents: "none",
          backgroundImage: "radial-gradient(circle at 50% 50%, var(--bg) 0 24%, transparent 28%)",
          backgroundSize: "6px 6px",
        }}/>
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "linear-gradient(180deg, color-mix(in oklch, var(--signal) 12%, transparent) 0%, transparent 40%, color-mix(in oklch, var(--bg) 74%, transparent) 100%)",
        }}/>
      </>) : (<>
        <div style={box}>{children}</div>
        <div style={{ position: "absolute", inset: 0, background: "var(--image-tint)", pointerEvents: "none" }}/>
      </>)}
      {dim > 0 && <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${dim})`, pointerEvents: "none" }}/>}
    </div>
  );
}

// ── ImageFrame ───────────────────────────────────────────────────────────────
// Scope-B unification: the pixels of scraped venue artwork stay untouched, so
// everything that CAN be made consistent is made consistent here — ratio, radius,
// an ink hairline, and a bottom scrim ramp so overlaid chrome always reads.
// One frame, every slot, every source. This is the part that makes a mixed list
// look like one product without touching 38% of images that are already fine.
const EAI_FRAME = {
  radius: { tile: 8, card: 12, hero: 0, avatar: 999 },
  hairline: "inset 0 0 0 1px color-mix(in oklch, var(--fg) 12%, transparent)",
};
function ImageFrame({ shape = "tile", ratio, children, style, scrim = false, label }) {
  const radius = EAI_FRAME.radius[shape] ?? 8;
  return (
    <div aria-label={label} style={{
      position: "relative", width: "100%", height: ratio ? undefined : "100%",
      aspectRatio: ratio, borderRadius: radius, overflow: "hidden",
      boxShadow: EAI_FRAME.hairline, ...style,
    }}>
      {children}
      {scrim && <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, height: "58%", pointerEvents: "none",
        background: "linear-gradient(transparent, color-mix(in oklch, var(--bg) 86%, transparent))",
      }}/>}
    </div>
  );
}

Object.assign(window, { TREATMENTS, EAI_INKS, TreatedImage, ImageFrame, EAI_FRAME });

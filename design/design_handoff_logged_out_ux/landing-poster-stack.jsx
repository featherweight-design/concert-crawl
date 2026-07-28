// landing-poster-stack.jsx — three animation modes for cycling through
// LandingPoster cards on the landing page hero.
//
// All three render the SAME poster (window.LandingPoster) and the SAME data
// (window.LP_EVENTS); only the motion changes. Exposed as a single
// <LandingPosterAnimation mode="stack|ticker|wall" /> component so tweaks
// can flip between them at runtime.
//
//   • "stack"  — pile of 3 cards. Top drifts up + fades; mid promotes to top.
//                Best when the animation IS the hero (one focal object).
//   • "ticker" — three cards in a row, panning horizontally to the left like
//                a flyer wall. The trailing card wraps to the front.
//   • "wall"   — vertical scrolling wall of 4-6 cards (two columns on the
//                wider sizes). Loops continuously. Feels like a feed.

// ──────────────────────────────────────────────────────────────────
// MODE 1 — STACK
//
// Renders FOUR cards (not three) so the pile reads as endless:
//   • Layers 0–2 are the three visible resting positions (top / mid / bottom).
//   • Layer 3 is a hidden "pre-bottom" that sits just below the pile at
//     opacity 0. When advance() fires, layer 0 drifts out, 1→0, 2→1, and
//     the hidden card slides up + fades in to take the bottom slot.
// Without the 4th card, the stack briefly becomes a 2-card pile during the
// transition, then snaps back to 3 — that pop is the bug we're fixing here.
// ──────────────────────────────────────────────────────────────────
function LPStack({ shows, width, height, intervalMs = 5200 }) {
  const [idx, setIdx] = React.useState(0);
  const [phase, setPhase] = React.useState("rest");

  const advance = React.useCallback(() => {
    if (phase !== "rest") return;
    setPhase("advancing");
    setTimeout(() => {
      setIdx(i => (i + 1) % shows.length);
      setPhase("rest");
    }, 900);
  }, [phase, shows.length]);

  React.useEffect(() => {
    if (shows.length < 2) return;
    const t = setTimeout(advance, intervalMs);
    return () => clearTimeout(t);
  }, [advance, idx, intervalMs, shows.length]);

  if (!shows.length) return null;

  // Four shows in flight: three visible + one hidden "on deck".
  const order = [
    shows[idx % shows.length],
    shows[(idx + 1) % shows.length],
    shows[(idx + 2) % shows.length],
    shows[(idx + 3) % shows.length],
  ];

  // Resting positions. Offsets scale with card width so the silhouette
  // reads the same at 232×320 (mobile) and 380×524 (desktop hero).
  const off = width * 0.04;
  const layers = [
    { x: 0,         y: 0,        r: -1.5, scale: 1,     opacity: 1 }, // top
    { x:  off,      y:  off*0.7, r:  3.5, scale: 0.985, opacity: 1 }, // mid
    { x: -off*0.8,  y:  off*1.4, r: -5,   scale: 0.97,  opacity: 1 }, // bottom
    // "on deck" — sits below-and-behind the bottom card, invisible at rest.
    { x:  off*0.4,  y:  off*2.4, r:  1.0, scale: 0.94,  opacity: 0 },
  ];

  // Stage padding accommodates rotation overshoot + the top card's lift
  // travel (it drifts up ~14% of the card's height before fading out).
  const padX = Math.max(28, Math.round(width * 0.14));
  const padY = Math.max(36, Math.round(width * 0.18));
  const stageW = width + padX * 2;
  const stageH = height + padY * 2;

  return (
    <div
      style={{
        width: stageW, height: stageH,
        position: "relative",
        perspective: 1400,
      }}
      onClick={advance}
      role="button"
      aria-label="Next poster"
    >
      {layers.map((layer, i) => {
        const isTop      = i === 0;
        const isMid      = i === 1;
        const isBottom   = i === 2;
        const isOnDeck   = i === 3;
        const show = order[i];

        let transform, opacity;
        if (phase === "advancing") {
          if (isTop) {
            // Drifts up + rotates further; opacity 1 → 0. Travel is
            // intentionally short (14% of height) so the lift never
            // pokes through the UI above the stack on tight layouts.
            transform = `translate(${layer.x - width * 0.06}px, ${layer.y - height * 0.14}px) rotate(${layer.r - 10}deg) scale(${layer.scale * 1.03})`;
            opacity = 0;
          } else if (isMid) {
            // Promotes to top resting position.
            transform = `translate(${layers[0].x}px, ${layers[0].y}px) rotate(${layers[0].r}deg) scale(${layers[0].scale})`;
            opacity = 1;
          } else if (isBottom) {
            // Promotes to mid resting position.
            transform = `translate(${layers[1].x}px, ${layers[1].y}px) rotate(${layers[1].r}deg) scale(${layers[1].scale})`;
            opacity = 1;
          } else {
            // On-deck slides up + rotates into the bottom slot, fading in.
            transform = `translate(${layers[2].x}px, ${layers[2].y}px) rotate(${layers[2].r}deg) scale(${layers[2].scale})`;
            opacity = 1;
          }
        } else {
          transform = `translate(${layer.x}px, ${layer.y}px) rotate(${layer.r}deg) scale(${layer.scale})`;
          opacity = layer.opacity;
        }

        return (
          <div
            key={`${idx}-${i}`}
            style={{
              position: "absolute",
              left: padX, top: padY,
              zIndex: 10 - i,
              transform,
              transformOrigin: "30% 100%",
              transition: phase === "advancing"
                ? "transform 0.85s cubic-bezier(0.32, 0.72, 0.28, 1), opacity 0.7s ease-out"
                : "transform 0.4s ease-out, opacity 0.4s ease-out",
              opacity,
              cursor: "pointer",
              willChange: "transform, opacity",
              filter: isOnDeck  ? "brightness(0.90)"
                   : isBottom   ? "brightness(0.92)"
                   : isMid      ? "brightness(0.96)"
                   : "none",
              // The on-deck card must never receive pointer events at rest —
              // it's invisible but technically present in the DOM.
              pointerEvents: isOnDeck && phase === "rest" ? "none" : "auto",
            }}
          >
            <window.LandingPoster show={show} width={width} height={height} />
          </div>
        );
      })}

      {/* Hint dots */}
      {shows.length > 1 && (
        <div style={{
          position: "absolute",
          left: "50%", bottom: Math.round(padY * 0.25),
          transform: "translateX(-50%)",
          display: "flex", gap: 6,
          zIndex: 20,
        }}>
          {shows.map((_, i) => (
            <div
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                if (i === idx % shows.length || phase !== "rest") return;
                setIdx(i);
              }}
              style={{
                width: i === idx % shows.length ? 16 : 6,
                height: 6,
                borderRadius: 3,
                background: i === idx % shows.length ? "var(--fg, #fff)" : "rgba(255,255,255,0.30)",
                cursor: "pointer",
                transition: "width 0.3s",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// MODE 2 — TICKER (horizontal pan)
// Posters slide left at a steady pace, like a flyer wall.  Three are
// visible at once; the leftmost recycles to the right end as it exits.
// ──────────────────────────────────────────────────────────────────
function LPTicker({ shows, width, height, durationMs = 6000 }) {
  const [tick, setTick] = React.useState(0);
  // Continuous animation — we don't drive position from state; we let CSS
  // animation handle the slide. tick is just to force re-key when the loop
  // wraps so we can rotate the data window.
  React.useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), durationMs);
    return () => clearInterval(t);
  }, [durationMs]);

  // Render an over-supply of cards (shows.length + 2) and rotate the
  // starting offset so the wrap is seamless. We translate the strip by
  // -width per duration, then snap and rebase.
  const cards = [];
  const N = Math.max(shows.length, 4);
  for (let i = 0; i < N + 1; i++) {
    cards.push(shows[(tick + i) % shows.length]);
  }

  const gap = Math.round(width * 0.06);
  const cardW = width;
  const stripW = (cardW + gap) * cards.length;

  const padY = Math.round(width * 0.10);
  const stageH = height + padY * 2;

  return (
    <div style={{
      width: "100%", height: stageH,
      overflow: "hidden",
      position: "relative",
      maskImage: "linear-gradient(90deg, transparent 0%, #000 8%, #000 92%, transparent 100%)",
      WebkitMaskImage: "linear-gradient(90deg, transparent 0%, #000 8%, #000 92%, transparent 100%)",
    }}>
      <div
        key={tick}                  // re-key snaps the strip back to start
        style={{
          position: "absolute",
          left: 0, top: padY,
          width: stripW,
          display: "flex",
          gap,
          animation: `lpTickerSlide ${durationMs}ms linear`,
        }}
      >
        {cards.map((show, i) => (
          <div
            key={`${tick}-${i}-${show.id}`}
            style={{
              flexShrink: 0,
              transform: `rotate(${i % 2 === 0 ? -1.6 : 1.6}deg)`,
            }}
          >
            <window.LandingPoster show={show} width={cardW} height={height} />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes lpTickerSlide {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-${cardW + gap}px); }
        }
      `}</style>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// MODE 3 — WALL (vertical scrolling)
// Single column of posters scrolling slowly upward. Loops seamlessly.
// Feels like a feed; works on mobile.
// ──────────────────────────────────────────────────────────────────
function LPWall({ shows, width, height, columnHeight, durationMs = 22000 }) {
  // Duplicate the deck so the bottom of the loop can slide in seamlessly
  // when the top reaches its negative full-height anchor.
  const deck = [...shows, ...shows];
  const gap = Math.round(width * 0.08);
  const tileH = height;
  const colH = columnHeight || (tileH + gap) * shows.length;

  return (
    <div style={{
      width, height: colH,
      overflow: "hidden",
      position: "relative",
      maskImage: "linear-gradient(180deg, transparent 0%, #000 8%, #000 92%, transparent 100%)",
      WebkitMaskImage: "linear-gradient(180deg, transparent 0%, #000 8%, #000 92%, transparent 100%)",
    }}>
      <div style={{
        position: "absolute", left: 0, top: 0,
        display: "flex", flexDirection: "column", gap,
        animation: `lpWallSlide ${durationMs}ms linear infinite`,
        willChange: "transform",
      }}>
        {deck.map((show, i) => (
          <div key={`${i}-${show.id}`} style={{
            transform: `rotate(${i % 2 === 0 ? -1.2 : 1.2}deg)`,
          }}>
            <window.LandingPoster show={show} width={width} height={tileH} />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes lpWallSlide {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-${(tileH + gap) * shows.length}px); }
        }
      `}</style>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Per-mount Fisher–Yates shuffle. The order of posters in the rotation is
// randomized on each page-load so the landing doesn't always lead with the
// same band; the poster art itself stays deterministic per artist (that's
// the Phase 7.5 contract — same artist always paints the same picture).
// ──────────────────────────────────────────────────────────────────
function lpShuffle(arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────
// Unified animation switcher
// ──────────────────────────────────────────────────────────────────
function LandingPosterAnimation({
  mode = "stack",
  shows = [],
  width = 320,
  height,
  intervalMs = 5200,
}) {
  const h = height || Math.round(width * 1.38);
  // Shuffle ONCE per mount so the visible order varies between page-loads
  // but doesn't keep rearranging itself while the user is on the page.
  const ordered = React.useMemo(() => lpShuffle(shows), [shows]);
  if (!ordered.length) return null;
  if (mode === "ticker") return <LPTicker shows={ordered} width={width} height={h} durationMs={intervalMs * 1.15} />;
  if (mode === "wall")   return <LPWall   shows={ordered} width={width} height={h} durationMs={intervalMs * 4} />;
  return <LPStack shows={ordered} width={width} height={h} intervalMs={intervalMs} />;
}

window.LandingPosterAnimation = LandingPosterAnimation;
window.LPStack = LPStack;
window.LPTicker = LPTicker;
window.LPWall = LPWall;

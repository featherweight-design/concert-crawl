// venue-treatment.jsx — Concert Crawl venue-image PHOTO TREATMENT recipe (system-defined half)
// ─────────────────────────────────────────────────────────────────────────────
// This file owns the SYSTEM half of the venue-imagery pipeline: the recipe that
// turns any facade photo into a Concert Crawl–styled base, plus the palette
// envelope. The ARTIST half (illustrated overlays) lives in venue-overlays.jsx.
//
// Treatment = 2-ink RISO SCREENPRINT DUOTONE. Chosen because Concert Crawl
// already speaks riso (gig-poster.jsx, shareable show cards). Federal-blue +
// fluorescent-pink inks on bone paper read as a printed object on ALL THREE
// theme backgrounds — the card carries its own paper, so the image is
// theme-INDEPENDENT (its palette is standalone, per the brief).
//
// The recipe is 5 real, executable steps (see RECIPE_STEPS + the SVG filters):
//   1. Desaturate    grayscale(1) contrast(1.12) brightness(1.02)
//   2. Duotone map   feComponentTransfer, luminance → [ink] … [paper]
//   3. Halftone      dot screen, mix-blend multiply (the printed texture)
//   4. Misregister   pink shadow-ghost offset 3px (the off-register edge)
//   5. Grain + paper feTurbulence noise + bone base (the pressed-paper feel)

// ── Brand mark — VERBATIM COPY of CCMark from browse-home.jsx ────────────────
// Source of truth: browse-home.jsx `function CCMark`. Never restyle; colors come
// from theme tokens (--bg / --accent / --signal). Copied so this handoff loads
// standalone. Used only by the theme-aware FALLBACK pattern (venue-overlays.jsx),
// never baked into the theme-independent image itself.
function CCMark({ size = 24 }) {
  const trail = [
    { x: 14, y: 76, r: 1.5 }, { x: 24, y: 70, r: 2 },
    { x: 34, y: 64, r: 2.5 }, { x: 42, y: 58, r: 3 },
    { x: 50, y: 50, r: 4 },   { x: 58, y: 42, r: 5 },
    { x: 66, y: 32, r: 6 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 96 96">
      <rect width="96" height="96" fill="var(--bg)" rx="16" />
      <circle cx="72" cy="24" r="20" fill="var(--accent)" opacity="0.22" />
      <circle cx="72" cy="24" r="12" fill="var(--accent)" opacity="0.42" />
      <circle cx="72" cy="24" r="7"  fill="var(--signal)" />
      {trail.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r}
          fill="var(--signal)" opacity={0.35 + i * 0.09} />
      ))}
    </svg>
  );
}

// ── PALETTE ENVELOPE (theme-independent) ─────────────────────────────────────
// Two inks + one paper. The image never uses theme tokens — it must read on
// Electric (#070A1A), Jade (#06201F) and Light (#FAFCFF) alike, so it prints on
// its own bone paper and is bordered. Acceptable ranges are documented in the
// README; these are the locked centres.
const INK = {
  paper:   "#F2EBDD", // bone — the unprinted knockout
  primary: "#1B2A4A", // federal blue — structure ink (the duotone dark)
  pop:     "#F0567A", // fluorescent pink — the misregister + one overlay pop
};
// Acceptable envelope (hue drift only; keep chroma/paper fixed):
const INK_ENVELOPE = [
  { name: "Bone (paper)",  hex: "#F2EBDD", role: "Knockout / highlights. Fixed — the card ground on every theme." },
  { name: "Midnight",      hex: "#141F38", role: "Primary ink, cool edge." },
  { name: "Federal Blue",  hex: "#1B2A4A", role: "Primary ink — locked centre." },
  { name: "Teal-shift",    hex: "#123A44", role: "Primary ink, warm-water edge." },
  { name: "Coral",         hex: "#F0567A", role: "Pop ink — locked centre." },
  { name: "Magenta-shift", hex: "#E23C8E", role: "Pop ink, cool edge." },
];

// One-time inject of the SVG filter defs + shared keyframes.
function ensureRisoDefs() {
  if (typeof document === "undefined" || document.getElementById("riso-defs")) return;
  const wrap = document.createElement("div");
  wrap.id = "riso-defs";
  wrap.setAttribute("aria-hidden", "true");
  wrap.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
  wrap.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Step 2 · duotone: grayscale luminance mapped onto ink→paper ramp -->
        <filter id="riso-duotone" color-interpolation-filters="sRGB">
          <feColorMatrix type="matrix"
            values="0.30 0.59 0.11 0 0  0.30 0.59 0.11 0 0  0.30 0.59 0.11 0 0  0 0 0 1 0"/>
          <feComponentTransfer>
            <feFuncR type="table" tableValues="0.105 0.949"/>
            <feFuncG type="table" tableValues="0.164 0.921"/>
            <feFuncB type="table" tableValues="0.290 0.866"/>
          </feComponentTransfer>
        </filter>
        <!-- Step 4 · pink shadow silhouette (darks → opaque pink, lights → clear) -->
        <filter id="riso-popghost" color-interpolation-filters="sRGB">
          <feColorMatrix type="matrix"
            values="0.30 0.59 0.11 0 0  0.30 0.59 0.11 0 0  0.30 0.59 0.11 0 0  0 0 0 1 0"/>
          <feComponentTransfer>
            <feFuncR type="table" tableValues="0.941 0.941"/>
            <feFuncG type="table" tableValues="0.337 0.337"/>
            <feFuncB type="table" tableValues="0.478 0.478"/>
            <feFuncA type="table" tableValues="0.9 0"/>
          </feComponentTransfer>
        </filter>
        <!-- Step 5 · paper grain -->
        <filter id="riso-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="n"/>
          <feColorMatrix in="n" type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0"/>
        </filter>
      </defs>
    </svg>`;
  document.body.appendChild(wrap);
  if (!document.getElementById("riso-kf")) {
    const s = document.createElement("style");
    s.id = "riso-kf";
    s.textContent =
      "@keyframes riso-none{to{opacity:1}}" +
      ".riso-halftone{background-image:radial-gradient(circle at 50% 50%," +
      "rgba(27,42,74,0.55) 0 26%,transparent 30%);background-size:5px 5px}";
    document.head.appendChild(s);
  }
}

const GRAIN_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23g)'/%3E%3C/svg%3E\")";

// ── RisoImage ────────────────────────────────────────────────────────────────
// Wraps a facade base (any grayscale-able SVG/DOM) and applies the full recipe.
// `steps` lets the recipe ladder reveal one layer at a time (1..5); default 5 =
// the finished treatment. `focal` (0..1) is the focal_x/focal_y from the venue
// table — object-position for downstream crops (demonstrated in SafeZone).
function RisoImage({ children, steps = 5, style, radius = 12, focal }) {
  ensureRisoDefs();
  const on = (n) => steps >= n;
  return (
    <div style={{
      position: "relative", width: "100%", height: "100%", overflow: "hidden",
      borderRadius: radius, background: INK.paper, isolation: "isolate", ...style,
    }}>
      {/* Steps 1+2 — the desaturated + duotone-mapped base */}
      <div style={{
        position: "absolute", inset: 0,
        filter: on(2) ? "grayscale(1) contrast(1.12) brightness(1.02) url(#riso-duotone)"
                      : "grayscale(1) contrast(1.12) brightness(1.02)",
      }}>{children}</div>

      {/* Step 4 — pink misregistration ghost, offset from the ink layer */}
      {on(4) && (
        <div style={{
          position: "absolute", inset: 0, transform: "translate(3px,2.5px)",
          mixBlendMode: "multiply", opacity: 0.85,
          filter: "grayscale(1) contrast(1.12) url(#riso-popghost)",
        }}>{children}</div>
      )}

      {/* Step 3 — halftone dot screen */}
      {on(3) && (
        <div className="riso-halftone" style={{
          position: "absolute", inset: 0, mixBlendMode: "multiply", opacity: 0.5,
        }} />
      )}

      {/* Step 5 — paper grain */}
      {on(5) && (
        <div style={{
          position: "absolute", inset: 0, backgroundImage: GRAIN_URI,
          backgroundSize: "150px 150px", mixBlendMode: "multiply", opacity: 0.5,
        }} />
      )}

      {/* Printed-edge inner border, present once ink is down */}
      {on(2) && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: radius, pointerEvents: "none",
          boxShadow: `inset 0 0 0 1px rgba(27,42,74,0.35)`,
        }} />
      )}
    </div>
  );
}

const RECIPE_STEPS = [
  { n: 1, name: "Desaturate",     spec: "grayscale(1) · contrast(1.12) · brightness(1.02)", why: "Flatten the photo to tone so ink can carry the color." },
  { n: 2, name: "Duotone map",    spec: "feComponentTransfer · luminance → [Federal Blue … Bone]", why: "Shadows print blue, highlights knock out to bare paper." },
  { n: 3, name: "Halftone screen",spec: "5px dot grid · mix-blend multiply · 0.5", why: "The printed dot texture — reads as ink on paper, not a JPEG." },
  { n: 4, name: "Misregistration",spec: "pink shadow-silhouette · offset 3px / 2.5px · multiply", why: "The off-register second ink pass — the riso signature." },
  { n: 5, name: "Grain + paper",  spec: "feTurbulence noise · multiply · 0.5 on bone ground", why: "Pressed-paper tooth. The object now feels physical." },
];

// ── FACADE BASES ─────────────────────────────────────────────────────────────
// Simple architectural stand-ins for the artist's real facade PHOTO. Drawn in
// grayscale-able tone so the SAME recipe transforms every one of them — proving
// it's a system, not a per-venue hack. Kept to rects / lines / simple polygons
// (architecture blocks), never illustration. Master frame is 3:2 (300×200 vb).
function FacadeBase({ kind }) {
  const sky = "#8a8f99", stone = "#5b5f68", dark = "#2f333b", lite = "#c7cad0";
  const svg = (children) => (
    <svg viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice"
      style={{ width: "100%", height: "100%", display: "block" }}>{children}</svg>
  );
  switch (kind) {
    case "bluebird": // theater · vertical blade marquee (the signature)
      return svg(<>
        <rect width="300" height="200" fill={sky}/>
        <rect x="0" y="70" width="300" height="130" fill={stone}/>
        <rect x="40" y="150" width="220" height="50" fill={dark}/>
        {/* horizontal marquee */}
        <rect x="46" y="120" width="208" height="34" fill={lite}/>
        <rect x="46" y="120" width="208" height="34" fill="none" stroke={dark} strokeWidth="3"/>
        {/* vertical blade sign — THE signature detail */}
        <rect x="128" y="8" width="44" height="126" fill={dark}/>
        <rect x="134" y="14" width="32" height="114" fill={lite}/>
        {[...Array(6)].map((_,i)=><circle key={i} cx="150" cy={28+i*18} r="5" fill={dark}/>)}
        {/* bulb rows on the blade edge */}
        {[...Array(7)].map((_,i)=><circle key={"l"+i} cx="130" cy={18+i*16} r="2.4" fill={sky}/>)}
        {[...Array(7)].map((_,i)=><circle key={"r"+i} cx="170" cy={18+i*16} r="2.4" fill={sky}/>)}
      </>);
    case "larimer": // brick front + battered side door (the signature)
      return svg(<>
        <rect width="300" height="200" fill={stone}/>
        {/* brick courses */}
        {[...Array(13)].map((_,r)=>[...Array(11)].map((_,c)=>
          <rect key={r+"-"+c} x={(c*28)-((r%2)*14)} y={r*16} width="26" height="14"
            fill={r%3?stone:dark} opacity="0.9"/>))}
        {/* door — the signature detail */}
        <rect x="118" y="96" width="64" height="104" fill={dark}/>
        <rect x="124" y="102" width="52" height="98" fill={lite}/>
        <rect x="146" y="150" width="8" height="8" fill={dark}/>
        {/* small side window */}
        <rect x="228" y="70" width="40" height="44" fill={dark}/>
        <rect x="233" y="75" width="30" height="34" fill={sky}/>
      </>);
    case "ophelia": // neon storefront (the signature)
      return svg(<>
        <rect width="300" height="200" fill={dark}/>
        <rect x="0" y="0" width="300" height="52" fill={stone}/>
        {/* storefront glass */}
        <rect x="24" y="96" width="112" height="94" fill={stone}/>
        <rect x="164" y="96" width="112" height="94" fill={stone}/>
        <rect x="24" y="96" width="112" height="94" fill="none" stroke={dark} strokeWidth="4"/>
        <rect x="164" y="96" width="112" height="94" fill="none" stroke={dark} strokeWidth="4"/>
        {/* neon sign — the signature detail (bright = highlights) */}
        <rect x="96" y="12" width="108" height="30" rx="15" fill="none" stroke={lite} strokeWidth="5"/>
        <rect x="112" y="20" width="76" height="14" rx="7" fill="none" stroke="#eef0f4" strokeWidth="3"/>
        <circle cx="150" cy="70" r="6" fill={lite}/>
      </>);
    case "redrocks": // natural geology — two monoliths framing the stage
      return svg(<>
        <rect width="300" height="200" fill="#b9bec7"/>
        <rect x="0" y="120" width="300" height="80" fill={stone}/>
        {/* left monolith */}
        <polygon points="0,200 0,26 70,4 104,200" fill={dark}/>
        <polygon points="12,200 12,40 66,22 92,200" fill={stone}/>
        {/* right monolith */}
        <polygon points="300,200 300,34 214,10 176,200" fill={dark}/>
        <polygon points="288,200 288,46 220,26 196,200" fill={stone}/>
        {/* stage between */}
        <rect x="112" y="150" width="76" height="50" fill={dark}/>
        <rect x="120" y="158" width="60" height="42" fill={lite} opacity="0.85"/>
      </>);
    case "warehouse": // signature-LESS box — the fallback stress test
    default:
      return svg(<>
        <rect width="300" height="200" fill={sky}/>
        <rect x="0" y="52" width="300" height="148" fill={stone}/>
        {/* corrugated roof line */}
        {[...Array(20)].map((_,i)=><rect key={i} x={i*16} y="44" width="8" height="10" fill={dark}/>)}
        {/* roll-up door — generic, no signage */}
        <rect x="96" y="104" width="108" height="96" fill={dark}/>
        {[...Array(7)].map((_,i)=><rect key={i} x="100" y={110+i*13} width="100" height="9" fill={stone}/>)}
      </>);
  }
}

Object.assign(window, { CCMark, INK, INK_ENVELOPE, RisoImage, RECIPE_STEPS, FacadeBase, ensureRisoDefs });

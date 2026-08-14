// imagery-sources.jsx — the three source states, as testable stand-ins.
//
// Production sources (locked priority, out of scope to reorder):
//   event surfaces  : events.imageUrl → headliner artists.photoUrl → placeholder
//   artist surfaces : artists.photoUrl → placeholder
//
// We have no real photographs in this project, and the treatments being judged
// are LUMINANCE operations — a flat striped placeholder would prove nothing. So
// both photo sources are geometric grayscale/tonal stand-ins (same approach as
// FacadeBase in design_handoff_venue_imagery): simple ellipses / rects /
// polygons that carry a real tonal range for the duotone to act on. Every one is
// labelled `stand-in` on the canvas. Filter values are final; inputs are not.
//
// PORTRAIT variants exist to stress the ONE failure we cannot detect: subject
// placement. `centred` / `high` / `low` / `offset` / `duo` cover what Spotify
// press portraits actually do.

const EAI_MONO = "'JetBrains Mono', ui-monospace, monospace";

// ── Portrait stand-in — square press photo (Spotify) ─────────────────────────
// Tonal ranges chosen like a studio shot: light sweep behind, mid-tone garment,
// dark hair mass. `place` moves the subject inside the square.
function PortraitBase({ place = "centred", tone = 0 }) {
  const P = {
    centred: { cx: 200, cy: 176, hr: 78, sh: 300 },
    high:    { cx: 200, cy: 124, hr: 70, sh: 250 },
    low:     { cx: 200, cy: 226, hr: 84, sh: 352 },
    offset:  { cx: 126, cy: 162, hr: 74, sh: 288 },
    duo:     { cx: 142, cy: 182, hr: 62, sh: 300 },
  }[place] || { cx: 200, cy: 176, hr: 78, sh: 300 };
  // three tonal keys so the same recipe visibly handles bright and moody inputs
  const K = [
    { sweep: ["#e9e9ec", "#9b9ba3"], skin: "#b9b2ad", hair: "#33313a", cloth: "#5d5b64" },
    { sweep: ["#6f6f78", "#2b2b33"], skin: "#8e8781", hair: "#1b1a20", cloth: "#3a3941" },
    { sweep: ["#d4d2cd", "#6d6a72"], skin: "#cfc7bf", hair: "#4a4650", cloth: "#7d7a83" },
  ][tone % 3];
  const gid = `pb-${place}-${tone}`;
  return (
    <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice"
      style={{ width: "100%", height: "100%", display: "block" }} aria-hidden="true">
      <defs>
        <radialGradient id={gid} cx="42%" cy="30%" r="78%">
          <stop offset="0%" stopColor={K.sweep[0]}/><stop offset="100%" stopColor={K.sweep[1]}/>
        </radialGradient>
      </defs>
      <rect width="400" height="400" fill={`url(#${gid})`}/>
      {place === "duo" && (<>
        <ellipse cx="278" cy={P.cy + 26} rx="66" ry="86" fill={K.cloth} opacity="0.9"/>
        <circle cx="278" cy={P.cy - 8} r="54" fill={K.skin} opacity="0.92"/>
        <ellipse cx="278" cy={P.cy - 34} rx="56" ry="42" fill={K.hair}/>
      </>)}
      {/* shoulders */}
      <ellipse cx={P.cx} cy={P.sh + 96} rx={P.hr * 2.3} ry={P.hr * 1.9} fill={K.cloth}/>
      {/* neck + head */}
      <rect x={P.cx - P.hr * 0.34} y={P.cy} width={P.hr * 0.68} height={P.hr * 1.3} fill={K.skin}/>
      <circle cx={P.cx} cy={P.cy} r={P.hr} fill={K.skin}/>
      {/* hair mass */}
      <ellipse cx={P.cx} cy={P.cy - P.hr * 0.42} rx={P.hr * 1.06} ry={P.hr * 0.86} fill={K.hair}/>
      <ellipse cx={P.cx - P.hr * 0.92} cy={P.cy + P.hr * 0.1} rx={P.hr * 0.3} ry={P.hr * 0.62} fill={K.hair} opacity="0.9"/>
      <ellipse cx={P.cx + P.hr * 0.92} cy={P.cy + P.hr * 0.1} rx={P.hr * 0.3} ry={P.hr * 0.62} fill={K.hair} opacity="0.9"/>
      {/* eye / brow tone marks — kept as flat ellipses, not illustration */}
      <ellipse cx={P.cx - P.hr * 0.36} cy={P.cy + P.hr * 0.04} rx={P.hr * 0.15} ry={P.hr * 0.08} fill={K.hair} opacity="0.75"/>
      <ellipse cx={P.cx + P.hr * 0.36} cy={P.cy + P.hr * 0.04} rx={P.hr * 0.15} ry={P.hr * 0.08} fill={K.hair} opacity="0.75"/>
      <ellipse cx={P.cx} cy={P.cy + P.hr * 0.52} rx={P.hr * 0.2} ry={P.hr * 0.07} fill={K.hair} opacity="0.45"/>
      {/* cast shadow under the jaw — gives the duotone a midtone to bite on */}
      <ellipse cx={P.cx} cy={P.cy + P.hr * 1.18} rx={P.hr * 0.8} ry={P.hr * 0.26} fill={K.hair} opacity="0.28"/>
    </svg>
  );
}

// ── Venue-scraped artwork stand-in ───────────────────────────────────────────
// Arbitrary aspect, arbitrary taste, hotlinked: a promoter's flyer or a stage
// shot. Deliberately saturated and un-Concert-Crawl — that's the whole point of
// the scope question. `kind`: flyer | stage | wide.
function VenueArtBase({ kind = "flyer", tone = 0 }) {
  const sets = [
    { a: "#E5394F", b: "#FFC53A", c: "#171225" },
    { a: "#2F58D8", b: "#43E0A8", c: "#0B1020" },
    { a: "#FF4FA3", b: "#FFE36B", c: "#221033" },
  ][tone % 3];
  const svg = (kids) => (
    <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice"
      style={{ width: "100%", height: "100%", display: "block" }} aria-hidden="true">{kids}</svg>
  );
  if (kind === "stage") {
    return svg(<>
      <rect width="400" height="400" fill={sets.c}/>
      <ellipse cx="200" cy="330" rx="240" ry="120" fill={sets.a} opacity="0.55"/>
      <rect x="0" y="286" width="400" height="114" fill="#0a0710" opacity="0.85"/>
      {[70, 140, 210, 280, 350].map((x, i) => (
        <polygon key={i} points={`${x},0 ${x + 34},0 ${x + 96},300 ${x - 28},300`} fill={sets.b} opacity="0.22"/>
      ))}
      {[110, 200, 290].map((x, i) => <rect key={i} x={x - 16} y="230" width="32" height="70" fill="#05030a"/>)}
    </>);
  }
  if (kind === "wide") {
    return svg(<>
      <rect width="400" height="400" fill={sets.b}/>
      <rect x="0" y="150" width="400" height="100" fill={sets.c}/>
      <circle cx="308" cy="96" r="66" fill={sets.a}/>
      {[...Array(9)].map((_, i) => <rect key={i} x="24" y={276 + i * 12} width={320 - i * 26} height="5" fill={sets.c} opacity="0.8"/>)}
    </>);
  }
  return svg(<>
    <rect width="400" height="400" fill={sets.c}/>
    <circle cx="130" cy="140" r="104" fill={sets.a}/>
    <rect x="176" y="196" width="196" height="150" fill={sets.b}/>
    {[...Array(7)].map((_, i) => <rect key={i} x="30" y={280 + i * 15} width="128" height="7" fill={sets.b} opacity="0.75"/>)}
    <rect x="176" y="60" width="196" height="14" fill={sets.a}/>
  </>);
}

// ── What each event actually HAS ─────────────────────────────────────────────
// Keyed to R_SHOWS ids from row-data.jsx. An event can hold BOTH a scraped
// artwork URL and a headliner portrait — which is the point: the locked chain is
// artwork → portrait → generated, so an artwork that 404s must fall to the
// PORTRAIT, not straight to the placeholder. Shipped `EventImage` already walks
// [imageUrl, artistPhotoUrl] then IdentityArt; R2's mock collapsed that to one
// hop and taught a regression. Fixed here.
//
//   artwork  : { art, tone } | null   — events.imageUrl
//   portrait : { place, tone } | null — headliner artists.photoUrl
//
// 3 of 8 hold artwork, and 2 of those hold a portrait behind it — so the middle
// state has somewhere to render.
const EAI_EVENTS = {
  holdfast:  { artwork: { art: "flyer", tone: 0 }, portrait: { place: "low", tone: 1 } },
  masego:    { artwork: null,                      portrait: { place: "centred", tone: 0 } },
  fourtet:   { artwork: null,                      portrait: null },
  hermanos:  { artwork: null,                      portrait: { place: "duo", tone: 2 } },
  fkj:       { artwork: { art: "stage", tone: 1 }, portrait: null },
  cassandra: { artwork: null,                      portrait: { place: "offset", tone: 1 } },
  geese:     { artwork: null,                      portrait: null },
  longname:  { artwork: { art: "wide", tone: 2 },  portrait: { place: "high", tone: 2 } },
};

// The resolver. `dead` marks which REMOTE sources have failed — at fetch time or
// after render began (signed Spotify URLs expire mid-session).
//   dead: { artwork: bool, portrait: bool }
// Returns props Panel spreads directly, plus the chain it walked so an artboard
// can label which hop it is showing.
function resolveEventImage(entry, deadArg) {
  const e = entry || {};
  const dead = deadArg || {};
  const chain = [];
  if (e.artwork) chain.push(dead.artwork ? "artwork ✗" : "artwork");
  if (e.portrait) chain.push(dead.portrait ? "portrait ✗" : "portrait");
  chain.push("generated");
  if (e.artwork && !dead.artwork) return { source: "artwork", ...e.artwork, chain };
  if (e.portrait && !dead.portrait) return { source: "portrait", ...e.portrait, chain };
  return { source: "placeholder", chain };
}

// Artist surfaces never borrow the event's artwork — locked, not re-proposed.
function resolveArtistImage(entry, deadArg) {
  const e = entry || {};
  const dead = deadArg || {};
  if (e.portrait && !dead.portrait) return { source: "portrait", ...e.portrait, chain: ["portrait", "generated"] };
  return { source: "placeholder", chain: e.portrait ? ["portrait ✗", "generated"] : ["generated"] };
}

// Compatibility map for the round-1 canvases, which predate the chain and only
// ask "what does this event show when nothing has failed?".
const EAI_SOURCE_MAP = Object.fromEntries(
  Object.entries(EAI_EVENTS).map(([id, e]) => [id, resolveEventImage(e)])
);
function eaiSourceFor(id) { return EAI_SOURCE_MAP[id] || { source: "placeholder" }; }

// Stand-in watermark. Small, mono, low contrast — present at ≥120px only so it
// never fights the treatment it is labelling.
function StandInTag({ text = "stand-in", show = true }) {
  if (!show) return null;
  return (
    <span style={{
      position: "absolute", left: 6, top: 6, zIndex: 4, padding: "2px 5px", borderRadius: 3,
      background: "rgba(8,6,14,0.5)", color: "rgba(255,255,255,0.72)",
      fontFamily: EAI_MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.12em",
      textTransform: "uppercase", pointerEvents: "none",
    }}>{text}</span>
  );
}

Object.assign(window, { PortraitBase, VenueArtBase, EAI_EVENTS, EAI_SOURCE_MAP, eaiSourceFor,
  resolveEventImage, resolveArtistImage, StandInTag, EAI_MONO });

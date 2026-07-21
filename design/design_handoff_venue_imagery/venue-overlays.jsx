// venue-overlays.jsx — the ARTIST half: illustrated overlay language, sample
// venues, safe-zone composition, the theme-aware fallback pattern, alt-text
// voice, and the customer-facing copy map.
// Depends on venue-treatment.jsx (INK, RisoImage, FacadeBase, CCMark).

const { INK, RisoImage, FacadeBase, CCMark } = window;
const OV_MONO = "'JetBrains Mono', ui-monospace, monospace";
const OV_UI = "Inter, system-ui, sans-serif";

// ── SAFE ZONE ────────────────────────────────────────────────────────────────
// The signature detail + the hero overlay MUST sit inside this central box so
// they survive every downstream crop (square venue card, wide hero, 4:3 event
// fallback, 1.91:1 share card). Values are % of the 3:2 master.
const SAFE = { left: 20, right: 20, top: 16, bottom: 18 }; // → central 60% × 66%
const CROPS = [
  { key: "square", label: "Venue card · 1:1",  ratio: 1 / 1,   note: "venues-index" },
  { key: "hero",   label: "Detail hero · 21:9", ratio: 21 / 9, note: "venues/[slug]" },
  { key: "event",  label: "Event fallback · 4:3", ratio: 4 / 3, note: "event-card" },
  { key: "share",  label: "Share card · 1.91:1", ratio: 1.91,  note: "share bg" },
];

// ═════════════════════════════════════════════════════════════════════════════
// OVERLAY LANGUAGE — 8 hand-drawn specimen marks. In production the artist draws
// these per venue; here they are simple-geometry stand-ins carrying the SPEC
// (weight, ink usage, motion off). Colors are the theme-independent ink palette.
// ═════════════════════════════════════════════════════════════════════════════

// 1 · Marquee wordmark — the hero mark. Hand-lettered venue name; knockout band.
function OvWordmark({ text = "BLUEBIRD", x = "50%", y = "26%", rotate = -3, size = 30, band = true }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) rotate(${rotate}deg)`, textAlign: "center" }}>
      {band && <div style={{ position: "absolute", inset: "-8px -14px", background: INK.paper, borderRadius: 4, boxShadow: `3px 3px 0 ${INK.pop}` }}/>}
      <div style={{ position: "relative", fontFamily: OV_UI, fontWeight: 900, fontStyle: "italic", fontSize: size, lineHeight: 0.9, letterSpacing: "-0.03em", color: INK.primary, whiteSpace: "nowrap" }}>{text}</div>
    </div>
  );
}

// 2 · Underline flourish — a single hand swoop under the mark.
function OvFlourish({ x = "50%", y = "40%", w = 150, ink = INK.pop }) {
  return (
    <svg style={{ position: "absolute", left: x, top: y, transform: "translateX(-50%)" }} width={w} height="20" viewBox="0 0 150 20" fill="none">
      <path d="M4 12C40 4 70 16 110 8c14-3 26-4 34-2" stroke={ink} strokeWidth="4" strokeLinecap="round"/>
    </svg>
  );
}

// 3 · Corner burst — radiating lines; draws the eye to the signature detail.
function OvBurst({ x = "82%", y = "24%", r = 26, ink = INK.pop }) {
  return (
    <svg style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)" }} width={r*2} height={r*2} viewBox="0 0 52 52">
      {[...Array(12)].map((_,i)=>{const a=i*30*Math.PI/180;return <line key={i} x1={26+8*Math.cos(a)} y1={26+8*Math.sin(a)} x2={26+24*Math.cos(a)} y2={26+24*Math.sin(a)} stroke={ink} strokeWidth="2.4" strokeLinecap="round"/>;})}
    </svg>
  );
}

// 4 · Dotted trail — echoes the CCMark cluster path; leads toward a detail.
function OvTrail({ x = "16%", y = "70%", ink = INK.primary }) {
  const dots = [{x:0,y:24,r:2},{x:12,y:19,r:2.5},{x:24,y:13,r:3},{x:36,y:6,r:3.6}];
  return (
    <svg style={{ position: "absolute", left: x, top: y }} width="46" height="32" viewBox="0 0 46 32">
      {dots.map((d,i)=><circle key={i} cx={d.x+3} cy={d.y} r={d.r} fill={ink} opacity={0.5+i*0.14}/>)}
    </svg>
  );
}

// 5 · Spot medallion — a stamped circle holding one signature glyph + mono label.
function OvMedallion({ x = "80%", y = "72%", label = "EST. 1994", ink = INK.primary }) {
  return (
    <svg style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)" }} width="76" height="76" viewBox="0 0 76 76">
      <circle cx="38" cy="38" r="35" fill="none" stroke={ink} strokeWidth="2.5"/>
      <circle cx="38" cy="38" r="29" fill="none" stroke={ink} strokeWidth="1" strokeDasharray="2 3"/>
      <path d="M38 22l4 9 10 1-7.5 6.5 2.5 9.5L38 42l-9 5 2.5-9.5L24 32l10-1z" fill={ink}/>
      <text x="38" y="62" textAnchor="middle" fontFamily={OV_MONO} fontSize="6.5" fontWeight="700" fill={ink} letterSpacing="1">{label}</text>
    </svg>
  );
}

// 6 · Ticket-stub tag — small torn stub with a mono line; reuses the stub motif.
function OvStub({ x = "50%", y = "84%", text = "TONIGHT", ink = INK.primary }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%) rotate(-2deg)", display: "flex", alignItems: "stretch", background: INK.paper, border: `2px solid ${ink}`, borderRadius: 3, overflow: "hidden", boxShadow: `2px 2px 0 ${INK.pop}` }}>
      <div style={{ width: 10, borderRight: `2px dashed ${ink}`, background: `repeating-linear-gradient(180deg,${ink} 0 3px,transparent 3px 7px)`, backgroundSize: "100% 7px", opacity: 0.5 }}/>
      <div style={{ padding: "5px 12px", fontFamily: OV_MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", color: ink }}>{text}</div>
    </div>
  );
}

// 7 · Halftone blob — organic pop wash sitting BEHIND the wordmark.
function OvBlob({ x = "50%", y = "26%", w = 190, ink = INK.pop }) {
  return (
    <svg style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", mixBlendMode: "multiply", opacity: 0.5 }} width={w} height={w*0.5} viewBox="0 0 190 95">
      <path d="M22 44C14 20 52 6 96 10c46 4 82 6 78 40-3 26-44 40-92 36C40 82 30 68 22 44z" fill={ink}/>
    </svg>
  );
}

// 8 · Hand arrow — points at the signature detail.
function OvArrow({ x = "30%", y = "56%", rotate = 0, ink = INK.primary }) {
  return (
    <svg style={{ position: "absolute", left: x, top: y, transform: `rotate(${rotate}deg)` }} width="60" height="34" viewBox="0 0 60 34" fill="none">
      <path d="M4 24C18 8 34 6 52 12" stroke={ink} strokeWidth="3.4" strokeLinecap="round"/>
      <path d="M52 12l-11-3M52 12l-4 10" stroke={ink} strokeWidth="3.4" strokeLinecap="round"/>
    </svg>
  );
}

const OVERLAY_SPECS = [
  { c: OvWordmark,  name: "1 · Marquee wordmark", role: "HERO. Hand-lettered venue name, italic heavy, on a paper knockout band with a pop-ink drop. One per venue, in the safe zone.", ink: "primary on paper + pop shadow" },
  { c: OvBlob,      name: "7 · Halftone blob",    role: "Pop wash behind the wordmark. Multiply-blended so it reads as a second ink pass, never a sticker.", ink: "pop @ 0.5 multiply" },
  { c: OvFlourish,  name: "2 · Underline swoop",  role: "Supporting. A single hand stroke under the mark. Direction follows the roofline.", ink: "pop or primary" },
  { c: OvBurst,     name: "3 · Corner burst",     role: "Attention. Points the eye at the signature detail. Use at most once.", ink: "pop" },
  { c: OvTrail,     name: "4 · Cluster trail",    role: "Brand tie. The CCMark dot-path, leading toward the detail. Quiet.", ink: "primary, graduated" },
  { c: OvMedallion, name: "5 · Spot medallion",   role: "Metadata. Stamped circle for a fact (est. year, capacity). One glyph + mono ring.", ink: "primary" },
  { c: OvStub,      name: "6 · Ticket stub tag",  role: "Status. The reused stub motif for a live label (TONIGHT, SOLD OUT).", ink: "primary + pop drop" },
  { c: OvArrow,     name: "8 · Hand arrow",       role: "Rare. Directs to an off-centre detail when composition can't. Use sparingly.", ink: "primary" },
];

// ── SAMPLE VENUES ────────────────────────────────────────────────────────────
// Facade base + treatment + a restrained overlay set (hero + ≤2 supporting),
// all anchored in the safe zone. Overlay choices are per-venue signature.
const VENUES = {
  bluebird: { facade: "bluebird", overlays: (
    <><OvBlob x="50%" y="27%" w={196}/><OvWordmark text="BLUEBIRD" x="50%" y="27%" rotate={-3} size={30}/><OvStub x="50%" y="83%" text="EST. COLFAX"/></>) },
  larimer:  { facade: "larimer", overlays: (
    <><OvWordmark text="LARIMER" x="50%" y="30%" rotate={2} size={27} band={false}/><OvFlourish x="50%" y="42%" w={150}/><OvArrow x="30%" y="52%" rotate={8}/></>) },
  ophelia:  { facade: "ophelia", overlays: (
    <><OvBurst x="50%" y="26%" r={30}/><OvWordmark text="OPHELIA'S" x="50%" y="45%" rotate={-2} size={26}/><OvMedallion x="80%" y="74%" label="ELECTRIC BROTHEL"/></>) },
  redrocks: { facade: "redrocks", overlays: (
    <><OvWordmark text="RED ROCKS" x="50%" y="72%" rotate={-1} size={26}/><OvTrail x="16%" y="30%"/><OvStub x="50%" y="86%" text="RESIDENCY · 3 NIGHTS"/></>) },
  substation:{ facade: "warehouse", signatureless: true, overlays: (
    // signature-LESS: no hero photo mark. System typography treatment only.
    <SignaturelessTreatment name="THE SUBSTATION" sub="BRIGHTON BLVD · WAREHOUSE"/>) },
};

// Signature-less in-image treatment — when the facade has no distinct detail,
// the system sets the name as a bold typographic block instead of a bespoke
// hand mark (this is the IN-IMAGE fallback, distinct from the no-image card).
function SignaturelessTreatment({ name, sub }) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
      <div style={{ position: "absolute", left: "12%", right: "12%", top: "40%", height: 3, background: INK.pop, mixBlendMode: "multiply" }}/>
      <div style={{ fontFamily: OV_UI, fontWeight: 900, fontSize: 30, letterSpacing: "-0.03em", color: INK.paper, textShadow: `0 2px 0 ${INK.primary}`, WebkitTextStroke: `1px ${INK.primary}` }}>{name}</div>
      <div style={{ fontFamily: OV_MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", color: INK.paper, background: INK.primary, padding: "3px 8px", borderRadius: 2 }}>{sub}</div>
    </div>
  );
}

function SampleVenue({ vkey, w = 340, h = Math.round((w * 2) / 3), radius = 12 }) {
  const v = VENUES[vkey];
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      <RisoImage radius={radius}><FacadeBase kind={v.facade}/></RisoImage>
      <div style={{ position: "absolute", inset: 0 }}>{v.overlays}</div>
    </div>
  );
}

// ── THEME-AWARE FALLBACK PATTERN ─────────────────────────────────────────────
// For venues with NO bespoke image yet. This is the only piece that is
// theme-aware (all colors via var(--*)). System dot-cluster pattern + big
// venue monogram + name typography. WCAG AA: name is --fg on --surface-2.
function FallbackCard({ name = "The Meadowlark", area = "SANTA FE DR", w = 340, h = Math.round((w * 2) / 3), radius = 12 }) {
  const initial = (name.replace(/^the\s+/i, "")[0] || "?").toUpperCase();
  const dotBg = "radial-gradient(circle at 50% 50%, var(--border-strong) 0 1.6px, transparent 2px)";
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: radius, overflow: "hidden", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: dotBg, backgroundSize: "14px 14px", opacity: 0.5 }}/>
      <div style={{ position: "absolute", top: 14, left: 14 }}><CCMark size={22}/></div>
      <div style={{ position: "absolute", top: 16, right: 14, fontFamily: OV_MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: "var(--fg-subtle)" }}>NO PORTRAIT YET</div>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: OV_UI, fontWeight: 900, fontSize: h * 0.5, lineHeight: 1, color: "var(--fg)", opacity: 0.10 }}>{initial}</div>
      <div style={{ position: "absolute", left: 16, right: 16, bottom: 14 }}>
        <div style={{ fontFamily: OV_UI, fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em", color: "var(--fg)" }}>{name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <div style={{ fontFamily: OV_MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: "var(--signal)" }}>{area}</div>
          <div style={{ fontFamily: OV_MONO, fontSize: 10, color: "var(--fg-muted)" }}>· portrait's in the mail</div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// COPY MAP — lift verbatim into apps/web/src/components/consumer/definitions/copy.ts
// Voice: Sour Patch — specific, warm, a little cheek; never brochure-y. Alt text
// is WCAG A (SC 1.1.1): one sentence, describes the signature detail, no "image
// of / photo of". altTemplate is the pattern; per-venue strings follow it.
// ═════════════════════════════════════════════════════════════════════════════
const VENUE_IMAGERY_COPY = {
  // pattern: "{Name} — {the signature detail, described like a local would}."
  altTemplate: (name, signature) => `${name} — ${signature}.`,
  alt: {
    bluebird:   "The Bluebird Theater — its blue blade marquee lit up over Colfax.",
    larimer:    "Larimer Lounge — brick front and the side door the line always wraps around.",
    ophelia:    "Ophelia's — pink neon buzzing over the old storefront glass.",
    redrocks:   "Red Rocks — two red sandstone monoliths standing over the open stage.",
    substation: "The Substation — a warehouse room off Brighton Blvd, no marquee, just the roll-up door.",
  },
  fallback: {
    // shown ON the no-image card
    eyebrow: "NO PORTRAIT YET",
    tail:    "portrait's in the mail",
    // alt text for the fallback card (still WCAG A — name carries meaning)
    alt: (name) => `${name} — no portrait yet.`,
  },
};

Object.assign(window, {
  SAFE, CROPS, OVERLAY_SPECS,
  OvWordmark, OvFlourish, OvBurst, OvTrail, OvMedallion, OvStub, OvBlob, OvArrow,
  VENUES, SampleVenue, SignaturelessTreatment, FallbackCard, VENUE_IMAGERY_COPY,
});

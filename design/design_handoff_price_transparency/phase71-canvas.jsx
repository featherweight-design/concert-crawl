// phase71-canvas.jsx — Phase 7.1 · Trust Canvas
// Adds resale + community treatments to the Phase 7 system.
//
// What's on canvas:
//   1. TrustMark + SourceLink reference (TrustMark dominates, SourceLink demoted)
//   2. Resale states — face known / face obstructed / verified at venue
//   3. Community states — anonymous+stale / attributed+verified-by-user / verification stale
//   4. Browse chips — trust tells at chip density

const E71 = window.PHASE7_EVENTS;
const TOK71 = window.CC_THEMES.electric.tokens;

// ── Variant data — synthesized from base events to demo verification ──
// Verified at venue (admin/automated check)
const E71_VERIFIED_RESALE = {
  ...E71.bladee,
  artist: "Bladee",
  price: {
    ...E71.bladee.price,
    verification: {
      by: { label: "checked at venue", kind: "auto" },
      at: "2026-04-28T08:30:00Z",  // ~2.5h ago
    },
  },
};
// Verification gone stale (>7d)
const E71_VERIFIED_STALE = {
  ...E71.caroline,
  artist: "Caroline Polachek",
  price: {
    ...E71.caroline.price,
    observedAt: "2026-04-12T22:00:00Z",  // ~16d ago
    verification: {
      by: { handle: "@amelia", url: "/u/amelia", kind: "user" },
      at: "2026-04-13T15:00:00Z",  // ~15d ago — verification went stale
    },
  },
};
function tVars71(tokens) {
  const v = {};
  for (const [k, val] of Object.entries(tokens)) v[`--${k}`] = val;
  return v;
}

// ── Mini detail card — just enough chrome to show the price block ──
function MiniDetail71({ event, tone }) {
  if (!event) return null;
  const { artist, title, venueShort, date, price } = event;
  const hash = artist.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = [280, 200, 340, 160, 30, 220, 310, 180, 50, 260][hash % 10];
  return (
    <div style={{
      ...tVars71(TOK71),
      width: 360, borderRadius: 14, overflow: "hidden",
      background: "var(--bg)", border: "1px solid var(--border)",
      color: "var(--fg)", fontFamily: "Inter, system-ui",
    }}>
      <div style={{
        height: 96,
        background: `linear-gradient(135deg, oklch(0.35 0.08 ${hue}), oklch(0.22 0.06 ${hue + 40}))`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{
          fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 38,
          color: `oklch(0.78 0.12 ${hue})`, opacity: 0.6, letterSpacing: "-0.03em",
        }}>{artist.charAt(0)}</span>
      </div>
      <div style={{ padding: "16px 16px 18px" }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: "var(--fg-subtle)", letterSpacing: "0.08em", textTransform: "uppercase",
          marginBottom: 4,
        }}>{date} · {venueShort}</div>
        <div style={{
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 22,
          color: "var(--fg)", letterSpacing: "-0.025em", lineHeight: 1.1,
        }}>{title || artist}</div>
        <window.PriceBlockC price={price} tone={tone}/>
        <button style={{
          all: "unset", cursor: "pointer", display: "block", marginTop: 14,
          width: "100%", textAlign: "center",
          padding: "12px 16px", borderRadius: 10,
          background: "var(--signal)", color: "var(--bg)",
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13,
          letterSpacing: "-0.005em",
        }}>Get tickets</button>
      </div>
    </div>
  );
}

// ── Browse row — single chip in card context ──
function BrowseRow71({ event, tone }) {
  if (!event) return null;
  const { artist, venueShort, date, price } = event;
  const hash = artist.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = [280, 200, 340, 160, 30, 220, 310, 180, 50, 260][hash % 10];
  return (
    <div style={{
      ...tVars71(TOK71),
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 14px", borderRadius: 10,
      background: "var(--bg)", border: "1px solid var(--border)",
      color: "var(--fg)", fontFamily: "Inter, system-ui",
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 8, flexShrink: 0,
        background: `linear-gradient(135deg, oklch(0.35 0.08 ${hue}), oklch(0.22 0.06 ${hue + 40}))`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{
          fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 18,
          color: `oklch(0.78 0.12 ${hue})`, opacity: 0.6,
        }}>{artist.charAt(0)}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 14,
          color: "var(--fg)", letterSpacing: "-0.015em",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{artist}</div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: "var(--fg-subtle)", marginTop: 2, letterSpacing: "0.02em",
        }}>{date} · {venueShort}</div>
      </div>
      <window.PriceChip price={price} tone={tone}/>
    </div>
  );
}

// ── SourceLink reference card ──
function SourceLinkRef71({ tone }) {
  const samples = [
    { label: "Primary",   price: { source: "Mission Ballroom", sourceUrl: "#", sourceKind: "primary" } },
    { label: "Resale",    price: { source: "SeatGeek", sourceUrl: "#", sourceKind: "resale" } },
    { label: "Community · attributed", price: { sourceKind: "community", submitter: { handle: "@hugh", url: "/u/hugh" } } },
    { label: "Community · anonymous",  price: { sourceKind: "community", submitter: null } },
  ];
  return (
    <div style={{
      ...tVars71(TOK71),
      width: 520, padding: 22, borderRadius: 12,
      background: "var(--bg)", border: "1px solid var(--border)",
      color: "var(--fg)", fontFamily: "Inter, system-ui",
    }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
        color: "var(--fg-subtle)", letterSpacing: "0.06em", textTransform: "uppercase",
        marginBottom: 16,
      }}>SourceLink · per-kind chrome</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {samples.map((s, i) => (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "180px 1fr", gap: 16, alignItems: "center",
          }}>
            <div style={{
              fontFamily: "Inter, system-ui", fontSize: 12, fontWeight: 600,
              color: "var(--fg-muted)", letterSpacing: "-0.005em",
            }}>{s.label}</div>
            <div><window.SourceLink price={s.price} tone={tone}/></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── TrustMark reference ──
function TrustMarkRef71() {
  return (
    <div style={{
      ...tVars71(TOK71),
      width: 520, padding: 22, borderRadius: 12,
      background: "var(--bg)", border: "1px solid var(--border)",
      color: "var(--fg)", fontFamily: "Inter, system-ui",
    }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
        color: "var(--fg-subtle)", letterSpacing: "0.06em", textTransform: "uppercase",
        marginBottom: 16,
      }}>TrustMark · inline pill next to the headline price</div>
      <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          fontFamily: "Inter, system-ui", fontSize: 24, fontWeight: 700,
          color: "var(--fg)", letterSpacing: "-0.02em",
        }}>
          $120
          <window.TrustMark kind="resale"/>
        </div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          fontFamily: "Inter, system-ui", fontSize: 24, fontWeight: 700,
          color: "var(--fg)", letterSpacing: "-0.02em",
        }}>
          $45
          <window.TrustMark kind="community"/>
        </div>
      </div>
      <div style={{
        marginTop: 18, padding: "10px 12px", borderRadius: 8,
        background: "var(--surface-1)", border: "1px solid var(--border)",
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
        color: "var(--fg-muted)", letterSpacing: "0.02em", lineHeight: 1.55,
      }}>
        <div>Resale uses <code style={{ color: "var(--warning)" }}>--warning</code> @ 14% bg.</div>
        <div>Community uses <code style={{ color: "var(--fg-muted)" }}>--fg-muted</code> @ 12% bg.</div>
        <div>Same shape. Reviewer learns one mark, two meanings.</div>
      </div>
    </div>
  );
}

// ── Annotation card ──
function AnnotationCard71({ title, body }) {
  return (
    <div style={{
      ...tVars71(TOK71),
      width: 360, padding: 18, borderRadius: 12,
      background: "var(--surface-1)", border: "1px dashed var(--border-strong)",
      color: "var(--fg)", fontFamily: "Inter, system-ui",
    }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
        color: "var(--fg-subtle)", letterSpacing: "0.08em", textTransform: "uppercase",
        marginBottom: 6,
      }}>Annotation</div>
      <div style={{
        fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13,
        color: "var(--fg)", letterSpacing: "-0.01em", marginBottom: 6,
      }}>{title}</div>
      <div style={{
        fontFamily: "Inter, system-ui", fontSize: 12,
        color: "var(--fg-muted)", lineHeight: 1.5, letterSpacing: "-0.005em",
      }}>{body}</div>
    </div>
  );
}

// ============================================================
// CANVAS
// ============================================================
function Phase71Canvas() {
  const [tone, setTone] = React.useState(window.__phase71_tone || "snark");
  React.useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === "__phase71_tone") setTone(e.data.tone);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const DCSection = window.DCSection;
  const DCArtboard = window.DCArtboard;
  const DesignCanvas = window.DesignCanvas;

  return (
    <DesignCanvas>
      <DCSection id="ref" title="Reference" subtitle="Trust treatment for resale + community prices.">
        <DCArtboard id="ref-trust" label="TrustMark · inline pill" width={520} height={260}>
          <TrustMarkRef71/>
        </DCArtboard>
        <DCArtboard id="ref-source" label="SourceLink · per-kind" width={520} height={300}>
          <SourceLinkRef71 tone={tone}/>
        </DCArtboard>
      </DCSection>

      <DCSection id="resale" title="Resale (SeatGeek)">
        <DCArtboard id="resale-known" label="Face value known" width={360} height={500}>
          <MiniDetail71 event={E71.bladee} tone={tone}/>
        </DCArtboard>
        <DCArtboard id="resale-known-note" label="Why this works" width={360} height={500}>
          <AnnotationCard71
            title="Face $45 → Resale $120"
            body={
              <>
                TrustMark sits up top so the eye lands on “resale” before the number. The sentence
                shows face value with the markup tinted <code>--warning</code>.
                <br/><br/>
                Footer is now <em>just</em> the receipt: <code>SeatGeek ↗</code>, no “Resale via”
                prefix — TrustMark already says that. Cleaner hierarchy.
              </>
            }
          />
        </DCArtboard>
        <DCArtboard id="resale-unknown" label="Face value obstructed" width={360} height={500}>
          <MiniDetail71 event={E71.floMilli} tone={tone}/>
        </DCArtboard>
        <DCArtboard id="resale-unknown-note" label="Why this works" width={360} height={500}>
          <AnnotationCard71
            title="We couldn't pull a face value"
            body={
              <>
                Reality: face values get withheld constantly — presales, fanclub windows, hidden
                listings, scrape blocks. Sellouts before we log are rare.
                <br/><br/>
                Copy now reads <em>“Face value not published — couldn't pull one from the primary
                listing.”</em> Honest about the obstruction without overclaiming the cause.
                <br/><br/>
                No markup pill, no over-face delta, no fabricated face.
              </>
            }
          />
        </DCArtboard>
        <DCArtboard id="resale-verified" label="Verified at venue" width={360} height={500}>
          <MiniDetail71 event={E71_VERIFIED_RESALE} tone={tone}/>
        </DCArtboard>
        <DCArtboard id="resale-verified-note" label="Why this works" width={360} height={500}>
          <AnnotationCard71
            title="Verified · checked at venue · 2h ago"
            body={
              <>
                When automation cross-references the venue and the resale price matches, surface a
                <code> VerifiedStamp</code>. Checkmark glyph + label, in <code>--success</code>.
                <br/><br/>
                For automated checks, the attribution reads as a <em>method</em> (“checked at
                venue”) rather than a person. Same component, different <code>by.kind</code>.
              </>
            }
          />
        </DCArtboard>
      </DCSection>

      <DCSection id="community" title="Community submission">
        <DCArtboard id="community-anon" label="Anonymous · stale · unverified" width={360} height={500}>
          <MiniDetail71 event={E71.mannequin} tone={tone}/>
        </DCArtboard>
        <DCArtboard id="community-anon-note" label="Why this works" width={360} height={500}>
          <AnnotationCard71
            title="Old, anonymous, unverified — still useful"
            body={
              <>
                StaleStamp escalates to <em>“as of … — could be stale”</em> at &gt;24h with the
                warning dot. SourceLink renders <em>“anonymous fan”</em> in italics.
                <br/><br/>
                Sentence keeps the <em>“not yet verified”</em> caveat. The price still shows —
                a stale fan number beats <code>???</code> — but every chrome element is honest
                about its weakness.
              </>
            }
          />
        </DCArtboard>
        <DCArtboard id="community-verified" label="Attributed · verified by user" width={360} height={500}>
          <MiniDetail71 event={E71.caroline} tone={tone}/>
        </DCArtboard>
        <DCArtboard id="community-verified-note" label="Why this works" width={360} height={500}>
          <AnnotationCard71
            title="@hugh submitted, @amelia verified"
            body={
              <>
                Two pieces of credit: <code>SourceLink</code> shows <em>@hugh</em> (the submitter),
                <code> VerifiedStamp</code> shows <em>“Verified by @amelia · 20h ago.”</em> Both
                names link to profiles — accountability for both contributions.
                <br/><br/>
                The sentence drops its “not yet verified” caveat once verification arrives —
                they'd contradict each other.
              </>
            }
          />
        </DCArtboard>
        <DCArtboard id="community-stale-verify" label="Verification gone stale" width={360} height={500}>
          <MiniDetail71 event={E71_VERIFIED_STALE} tone={tone}/>
        </DCArtboard>
        <DCArtboard id="community-stale-verify-note" label="Why this works" width={360} height={500}>
          <AnnotationCard71
            title="Even verifications expire"
            body={
              <>
                <code>VerifiedStamp</code> uses a 7-day staleness threshold (longer than the 24h
                observation threshold — verification is a stronger statement, but not eternal).
                <br/><br/>
                After 7d the stamp shifts to <code>--warning</code> and the copy escalates:
                <em> “Verified by @amelia · 15d ago — could be stale.”</em>
                <br/><br/>
                The user knows the price was once vouched-for, and that the vouching needs renewal.
              </>
            }
          />
        </DCArtboard>
      </DCSection>

      <DCSection id="browse" title="Browse chip — trust tells (R / C)">
        <DCArtboard id="browse-mixed" label="Mixed feed" width={520} height={400}>
          <div style={{
            ...tVars71(TOK71),
            display: "flex", flexDirection: "column", gap: 8,
            padding: 16, borderRadius: 12,
            background: "var(--bg-elevated)", border: "1px solid var(--border)",
          }}>
            <BrowseRow71 event={E71.electricCallboy} tone={tone}/>
            <BrowseRow71 event={E71.amyl} tone={tone}/>
            <BrowseRow71 event={E71.bladee} tone={tone}/>
            <BrowseRow71 event={E71.floMilli} tone={tone}/>
            <BrowseRow71 event={E71.caroline} tone={tone}/>
            <BrowseRow71 event={E71.mannequin} tone={tone}/>
          </div>
        </DCArtboard>
        <DCArtboard id="browse-note" label="Why this works" width={360} height={400}>
          <AnnotationCard71
            title="A single uppercase letter is enough"
            body={
              <>
                At chip density (12px price, fits in a card row), a tiny <code>R</code> or <code>C</code>
                pill is a tell, not a feature. Same colors as the detail TrustMark.
                <br/><br/>
                A first-time user sees <code>$120 R</code>, taps in, and the detail page tells the whole story.
                <br/><br/>
                Primary prices stay clean — no badge, no chrome.
              </>
            }
          />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

// ── Tiny tone toggle (no full Tweaks panel for this canvas) ──
function Phase71ToneToggle() {
  const [tone, setTone] = React.useState("snark");
  React.useEffect(() => {
    window.__phase71_tone = tone;
    window.postMessage({ type: "__phase71_tone", tone }, "*");
  }, [tone]);
  const opts = ["dry", "deadpan", "snark"];
  return (
    <div style={{
      position: "fixed", bottom: 16, right: 16, zIndex: 100,
      display: "flex", gap: 4, padding: 4, borderRadius: 10,
      background: "#1a1a1a", border: "1px solid #333",
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      {opts.map(o => (
        <button key={o} onClick={() => setTone(o)} style={{
          all: "unset", cursor: "pointer",
          padding: "6px 12px", borderRadius: 6,
          fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase",
          color: tone === o ? "#fff" : "#888",
          background: tone === o ? "#333" : "transparent",
        }}>{o}</button>
      ))}
    </div>
  );
}

window.Phase71Canvas = Phase71Canvas;
window.Phase71ToneToggle = Phase71ToneToggle;

// oas-direction-bc.jsx — DIRECTION 2 (round trip) · DIRECTION 3 (drop it)
//                        + the grid error-state options
//
// Both directions drawn at the same fidelity as A so the ruling is a
// comparison, not a preamble.

const { NFArt, Mono, NFPrimary, NFGhost, NFFollow, ArtistPick, PickGrid, NFTabBar,
  GlyphCheck, GlyphSearch, GlyphChevron, GlyphLock, NoDatesLine,
  Screen, ScreenShell, nfLocked, NF_ARTISTS } = window;
const { OAS_PICKED, OAS_COPY, oasQuery, OASField, OASRow, OASMessage,
  OASStepChrome, OASStepHead, OASRail, OASDeskCard, OASDeskRail, OASPickedStrip } = window;

// ═══ DIRECTION 2 · the round trip ══════════════════════════════
// Leave to /search, come back with a visible affordance and the picks intact.
// The strip has to live on a SHARED route, which is most of the cost — and the
// deeper cost is underneath it: /search's rows carry NFFollow, which writes
// immediately, while the step batches one write at commit. Following three
// artists on /search mid-onboarding means three follows already exist before
// the step's "Follow 4 artists →" ever fires. Two commit models, one selection.

function ReturnStrip({ n = 4, desktop = false }) {
  return (
    <div role="status" style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: desktop ? "11px 16px" : "10px 14px", borderRadius: 11,
      background: "color-mix(in oklab, var(--signal) 10%, var(--surface-1))",
      border: "1px solid var(--signal)" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Mono size={9} color="var(--signal)">{OAS_COPY.returnStrip} · step 7 of 8</Mono>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)", marginTop: 4, letterSpacing: "-0.01em",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {n} {n === 1 ? "artist" : "artists"} picked, still held
        </div>
      </div>
      <button style={{ all: "unset", cursor: "pointer", flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6,
        minHeight: 38, padding: "0 13px", borderRadius: 9, background: "var(--signal)", color: "var(--fg-on-accent)",
        fontSize: 12.5, fontWeight: 800, letterSpacing: "-0.01em" }}>
        Back to setup<GlyphChevron size={12}/>
      </button>
    </div>
  );
}

// /search during onboarding. The shared route, with the strip pinned above the
// field. Everything else is the shipped search screen.
function RoundTripSearch({ narrow = false, query = "man", tier = "premium", withStrip = true }) {
  const locked = nfLocked(tier);
  const hits = oasQuery(query);
  return (
    <Screen>
      <div style={{ padding: narrow ? "54px 14px 10px" : "58px 16px 10px", background: "var(--bg)", flexShrink: 0,
        display: "flex", flexDirection: "column", gap: 11 }}>
        {withStrip && <ReturnStrip n={OAS_PICKED.length}/>}
        <OASField query={query} onBack={false}/>
      </div>
      <ScreenShell pad="0 0 8px" gap={0}>
        <div style={{ padding: "8px 16px 9px" }}><Mono size={9.5}>Artists · {hits.length}</Mono></div>
        {hits.map(a => (
          <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderTop: "1px solid var(--border)" }}>
            <NFArt name={a.name} size={narrow ? 48 : 52} radius={8}/>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.015em",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "var(--fg-subtle)", letterSpacing: "0.06em",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.next || <NoDatesLine/>}</div>
            </div>
            {/* This button writes NOW. The step's rail writes at commit. */}
            <NFFollow state={locked ? "locked" : "idle"} size="sm" iconOnly={narrow}/>
          </div>
        ))}
        <div style={{ margin: "16px 16px 0", padding: "12px 13px", borderRadius: 10, background: "var(--surface-1)", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.45, textWrap: "pretty" }}>
            These <strong style={{ color: "var(--fg)", fontWeight: 700 }}>Follow</strong> buttons commit immediately — the step's rail doesn't.
            Reconciling that is a product decision, not a layout one.
          </div>
        </div>
      </ScreenShell>
      <NFTabBar active={1}/>
    </Screen>
  );
}

// Coming back. The step re-mounts with the picks restored and says so once —
// the one thing the live control never does.
function RoundTripReturn({ narrow = false, picked = [...OAS_PICKED, "Mandy, Indiana"] }) {
  const list = NF_ARTISTS.slice(0, 10);
  return (
    <OASStepChrome narrow={narrow} rail={<OASRail narrow={narrow} n={picked.length}/>}>
      <OASStepHead narrow={narrow}/>
      <div style={{ padding: narrow ? "0 16px 10px" : "0 20px 10px", flexShrink: 0 }}>
        <div role="status" style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", borderRadius: 10,
          background: "color-mix(in oklab, var(--signal) 10%, var(--surface-1))", border: "1px solid var(--signal)" }}>
          <span style={{ color: "var(--signal)", flexShrink: 0 }}><GlyphCheck size={14} w={2.6}/></span>
          <span style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.4, textWrap: "pretty" }}>
            <strong style={{ color: "var(--fg)", fontWeight: 700 }}>Mandy, Indiana</strong> added from search. Your other picks are still here.
          </span>
        </div>
      </div>
      <ScreenShell pad={narrow ? "0 16px 14px" : "0 20px 14px"} gap={10}>
        <PickGrid cols={2}>
          {list.map(a => <ArtistPick key={a.name} artist={a} selected={picked.includes(a.name)}/>)}
        </PickGrid>
      </ScreenShell>
    </OASStepChrome>
  );
}

function RoundTripSearchDesktop({ query = "man" }) {
  const hits = oasQuery(query);
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)", fontFamily: "Inter, system-ui", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 60, flexShrink: 0, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 26px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}><window.CCMark size={26}/><window.NFWordmark/></div>
        <Mono size={10.5} color="var(--fg-muted)" ls="0.14em">SEARCH</Mono>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "22px 30px 40px" }}>
          <div style={{ maxWidth: 620, marginBottom: 16 }}><ReturnStrip n={OAS_PICKED.length} desktop/></div>
          <div style={{ maxWidth: 560, marginBottom: 22 }}><OASField query={query} onBack={false}/></div>
          <div style={{ marginBottom: 10 }}><Mono size={10}>Artists · {hits.length}</Mono></div>
          <div style={{ borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden", maxWidth: 720 }}>
            {hits.map((a, i) => (
              <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 16, padding: "13px 16px", borderTop: i ? "1px solid var(--border)" : "none" }}>
                <NFArt name={a.name} size={56} radius={8}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.02em" }}>{a.name}</div>
                  <div style={{ marginTop: 5, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--fg-subtle)", letterSpacing: "0.06em" }}>{a.next || <NoDatesLine/>}</div>
                </div>
                <NFFollow state="idle" size="md"/>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══ DIRECTION 3 · drop it ═════════════════════════════════════
// The sub-line under the rail already says "you can follow anyone from search
// later", the step is skippable, and every artist in the grid is followable by
// construction. Cheapest possible answer — and it makes the error state the
// whole remaining question, because the trigger is currently the only thing
// that state offers.
function StepNoTrigger({ narrow = false, picked = OAS_PICKED, tier = "premium" }) {
  const list = NF_ARTISTS.slice(0, 10);
  return (
    <OASStepChrome narrow={narrow} rail={<OASRail narrow={narrow} n={picked.length} tier={tier}/>}>
      <OASStepHead narrow={narrow}/>
      <ScreenShell pad={narrow ? "0 16px 14px" : "0 20px 14px"} gap={10}>
        <PickGrid cols={2}>
          {list.map(a => <ArtistPick key={a.name} artist={a} selected={picked.includes(a.name)}/>)}
        </PickGrid>
        <div style={{ padding: "12px 2px 0", textAlign: "center" }}>
          <div style={{ fontSize: 12.5, color: "var(--fg-subtle)", lineHeight: 1.45, textWrap: "pretty" }}>
            That's everyone playing Denver in your genres. Anyone else — search once you're in.
          </div>
        </div>
      </ScreenShell>
    </OASStepChrome>
  );
}

// ═══ The grid error state · three offers ═══════════════════════
// Today: the search trigger is the ONLY thing in it. If direction 3 wins, this
// state needs a different offer; if 1 or 2 wins, it still needs a retry,
// because "search for them by name" is a poor answer to "we couldn't load ten
// suggestions".
//   E1 · retry primary, skip secondary          — works under all three directions
//   E2 · retry primary, search secondary        — works under 1 and 2 only
//   E3 · search only                            — the live behaviour, for reference
function GridError({ narrow = false, option = "E1", picked = [] }) {
  const retry = <NFPrimary>Try again</NFPrimary>;
  const offers = {
    E1: { action: retry, secondary: <NFGhost>Skip this step</NFGhost> },
    E2: { action: retry, secondary: <NFGhost><span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><GlyphSearch size={13}/>Search by name</span></NFGhost> },
    E3: { action: <NFGhost><span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><GlyphSearch size={13}/>{OAS_COPY.trigger}</span></NFGhost>, secondary: null },
  }[option];
  return (
    <OASStepChrome narrow={narrow} rail={<OASRail narrow={narrow} n={picked.length}/>}>
      <OASStepHead narrow={narrow}/>
      <ScreenShell pad={narrow ? "0 16px 14px" : "0 20px 14px"} gap={0}>
        <div style={{ flex: 1, minHeight: 0, borderRadius: 14, border: "1px dashed var(--border-strong)", display: "flex" }}>
          <OASMessage compact status={OAS_COPY.errStatus} head={OAS_COPY.errHead}
            body={option === "E3"
              ? "Nothing to pick from right now."
              : OAS_COPY.errBody}
            action={offers.action} secondary={offers.secondary}/>
        </div>
      </ScreenShell>
    </OASStepChrome>
  );
}

function GridErrorDesktop({ option = "E1" }) {
  const offers = {
    E1: { action: <NFPrimary full={false}>Try again</NFPrimary>, secondary: <NFGhost full={false}>Skip this step</NFGhost> },
    E2: { action: <NFPrimary full={false}>Try again</NFPrimary>, secondary: <NFGhost full={false}><span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><GlyphSearch size={13}/>Search by name</span></NFGhost> },
  }[option] || {};
  return (
    <OASDeskCard footer={<OASDeskRail n={0} label="Nothing picked yet · this step is skippable."/>}>
      <div style={{ padding: "20px 26px 14px", flexShrink: 0 }}>
        <Mono size={10} color="var(--signal)">Step 7 of 8 · playing denver</Mono>
        <h1 style={{ margin: "9px 0 0", fontSize: 30, fontWeight: 900, letterSpacing: "-0.03em", color: "var(--fg)" }}>Know any of these?</h1>
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: "0 26px 20px", display: "flex" }}>
        <div style={{ flex: 1, minHeight: 240, borderRadius: 14, border: "1px dashed var(--border-strong)",
          display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 30 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Mono size={10} ls="0.18em" color="var(--accent)">{OAS_COPY.errStatus}</Mono>
            <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em", color: "var(--fg)", marginTop: 12 }}>{OAS_COPY.errHead}</div>
            <div style={{ fontSize: 14, color: "var(--fg-muted)", marginTop: 10, maxWidth: 380, lineHeight: 1.5, textWrap: "pretty" }}>{OAS_COPY.errBody}</div>
            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>{offers.action}{offers.secondary}</div>
          </div>
        </div>
      </div>
    </OASDeskCard>
  );
}

Object.assign(window, {
  ReturnStrip, RoundTripSearch, RoundTripReturn, RoundTripSearchDesktop,
  StepNoTrigger, GridError, GridErrorDesktop,
});

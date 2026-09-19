// oas-direction-a.jsx — DIRECTION 1 · search inside the tour
//
// Two sub-variants, because "a panel over the step" and "a mode of the step"
// look similar in a brief and behave nothing alike:
//
//   A1 · IN-PLACE  — the step swaps mode. The header block (eyebrow, headline,
//        lede) collapses into a search field; the grid region becomes results.
//        Progress dots and the commit rail are UNTOUCHED and LIVE — a row
//        tapped in search increments the same counter the tiles feed.
//        RECOMMENDED.
//
//   A2 · SHEET     — a bottom sheet over the step, scrim behind. Reads as a
//        separate surface, which is the honest description of what it is: the
//        sheet needs its own commit ("Done · N selected") while the step's
//        real commit sits live-looking and unreachable behind the scrim.
//
// Both merge selection into the same set. The difference is how many commit
// affordances are on screen at once, and whether the mechanic survives the
// move to desktop (A1 does; A2 becomes a modal).

const { NFArt, Mono, NFPrimary, NFGhost, ArtistPick, PickGrid, NFDots,
  GlyphCheck, GlyphSearch, GlyphChevron, GlyphLock,
  Screen, ScreenShell, Sheet, Scrim, nfLocked, NF_ARTISTS } = window;
const { OAS_PICKED, OAS_COPY, oasQuery, OASField, OASRow, OASSkeletonRow,
  OASPickedStrip, OASMessage, OASStepChrome, OASStepHead, OASRail,
  OASDeskCard, OASDeskRail } = window;

// ── A1 · in-place ──────────────────────────────────────────────
// state: rest | typing | results | none
function SearchInPlace({ narrow = false, state = "results", query = "man", picked = OAS_PICKED, tier = "premium" }) {
  const locked = nfLocked(tier);
  const hits = oasQuery(query);
  const q = state === "rest" ? "" : query;
  return (
    <OASStepChrome narrow={narrow} rail={<OASRail narrow={narrow} n={picked.length} tier={tier}/>}>
      {/* The header block's slot, now holding the field. Same vertical box, so
          nothing below it moves when the mode flips. */}
      <div style={{ padding: narrow ? "18px 16px 12px" : "20px 20px 12px", flexShrink: 0 }}>
        <OASField query={q} state={state === "rest" ? "rest" : "typed"}/>
        <div style={{ marginTop: 11, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <Mono size={9.5} color="var(--fg-subtle)">
            {state === "rest" ? "Still on step 7 · nothing committed yet"
              : state === "typing" ? OAS_COPY.searching
              : state === "none" ? "No matches"
              : `${hits.length} ${hits.length === 1 ? "artist" : "artists"}`}
          </Mono>
          {state !== "rest" && <Mono size={9.5} color="var(--fg-subtle)">Denver index</Mono>}
        </div>
      </div>

      {state === "rest" && (
        <ScreenShell pad={0} gap={0}>
          <OASMessage head={OAS_COPY.restHead} body={OAS_COPY.restBody}/>
        </ScreenShell>
      )}

      {state === "typing" && (
        <ScreenShell pad={0} gap={0}>
          {[0, 1, 2, 3].map(i => <OASSkeletonRow key={i} i={i}/>)}
        </ScreenShell>
      )}

      {state === "results" && (
        <ScreenShell pad={0} gap={0}>
          {hits.map(a => <OASRow key={a.name} artist={a} selected={picked.includes(a.name)} locked={locked}/>)}
          <div style={{ padding: "16px 16px 10px", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.45, textWrap: "pretty" }}>
              <strong style={{ color: "var(--fg)", fontWeight: 700 }}>Manchester Orchestra</strong> has nothing on the books and is still
              followable — that's the case following exists for. Artists who've never played Denver aren't in the index at all.
            </div>
          </div>
        </ScreenShell>
      )}

      {state === "none" && (
        <ScreenShell pad={0} gap={0}>
          <OASMessage status={null} head={OAS_COPY.noneHead} body={OAS_COPY.noneBody}
            action={<NFGhost>{OAS_COPY.noneAction}</NFGhost>}/>
        </ScreenShell>
      )}

      <OASPickedStrip names={picked}/>
    </OASStepChrome>
  );
}

// The grid state the swap comes FROM — the shipped step with the trigger
// redrawn as a real control rather than a dashed link. Same footprint, so the
// before/after sit next to each other honestly.
function StepWithTrigger({ narrow = false, picked = OAS_PICKED, tier = "premium", variant = "solid" }) {
  const list = NF_ARTISTS.slice(0, 10);
  return (
    <OASStepChrome narrow={narrow} rail={<OASRail narrow={narrow} n={picked.length} tier={tier}/>}>
      <OASStepHead narrow={narrow}/>
      <ScreenShell pad={narrow ? "0 16px 14px" : "0 20px 14px"} gap={10}>
        <PickGrid cols={2}>
          {list.map(a => <ArtistPick key={a.name} artist={a} selected={picked.includes(a.name)}/>)}
        </PickGrid>
        {variant === "shipped" ? (
          <button style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            minHeight: 44, borderRadius: 10, border: "1px dashed var(--border-strong)", color: "var(--fg-muted)",
            fontSize: 13, fontWeight: 700, marginTop: 2 }}>
            <GlyphSearch size={13}/>{OAS_COPY.trigger}
          </button>
        ) : (
          // The revised trigger: a filled field-shaped control, not a dashed
          // link. It looks like the thing it opens, which is the cheapest way
          // to say "this stays inside the step" before you tap it.
          <div role="button" tabIndex={0} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 9, minHeight: 46,
            padding: "0 13px", borderRadius: 11, background: "var(--surface-1)", border: "1px solid var(--border-strong)", marginTop: 2 }}>
            <span style={{ color: "var(--fg-subtle)", flexShrink: 0 }}><GlyphSearch size={15}/></span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 600, color: "var(--fg-muted)", letterSpacing: "-0.01em" }}>
              Someone else in mind?
            </span>
            <span style={{ color: "var(--fg-subtle)", flexShrink: 0 }}><GlyphChevron size={14}/></span>
          </div>
        )}
      </ScreenShell>
    </OASStepChrome>
  );
}

// ── A2 · sheet ─────────────────────────────────────────────────
function SearchSheetBody({ state = "results", query = "man", picked = OAS_PICKED, tier = "premium" }) {
  const locked = nfLocked(tier);
  const hits = oasQuery(query);
  return (
    <Sheet height="86%" pad={0}>
      <div style={{ padding: "18px 20px 0", flexShrink: 0 }}>
        <div style={{ width: 38, height: 4, borderRadius: 4, background: "var(--border-strong)", margin: "-8px auto 14px" }}/>
        <OASField query={state === "rest" ? "" : query} state={state === "rest" ? "rest" : "typed"} onBack={false}/>
        <div style={{ margin: "11px 0 6px" }}>
          <Mono size={9.5}>{state === "rest" ? "Denver index" : state === "none" ? "No matches" : `${hits.length} artists`}</Mono>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {state === "rest" && <OASMessage compact head={OAS_COPY.restHead} body={OAS_COPY.restBody}/>}
        {state === "none" && <OASMessage compact head={OAS_COPY.noneHead} body={OAS_COPY.noneBody}/>}
        {state === "results" && hits.map(a => <OASRow key={a.name} artist={a} selected={picked.includes(a.name)} locked={locked} dense/>)}
      </div>
      {/* The cost of the sheet, in one element: a SECOND commit affordance,
          sitting directly above the step's real one. */}
      <div style={{ padding: "13px 20px 24px", borderTop: "1px solid var(--border)", flexShrink: 0,
        display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: "var(--fg-subtle)" }}>{picked.length} selected</div>
        <NFPrimary full={false} dense>Done</NFPrimary>
      </div>
    </Sheet>
  );
}

// ── Desktop ────────────────────────────────────────────────────
// A1 on desktop is the SAME mechanic: the card's header block becomes a field,
// the pick grid becomes a result list, the footer rail stays live. Nothing new
// is invented for the wide tree, which is the second argument for it.
function SearchInPlaceDesktop({ state = "results", query = "man", picked = OAS_PICKED }) {
  const hits = oasQuery(query);
  return (
    <OASDeskCard footer={<OASDeskRail n={picked.length}/>}>
      <div style={{ padding: "20px 26px 12px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0, maxWidth: 460 }}>
            <OASField query={state === "rest" ? "" : query} state={state === "rest" ? "rest" : "typed"}/>
          </div>
          <div style={{ flex: 1 }}/>
          <Mono size={9.5} color="var(--fg-subtle)">Still on step 7 · nothing committed</Mono>
        </div>
        <div style={{ marginTop: 13 }}>
          <Mono size={10}>{state === "rest" ? "Denver index" : state === "none" ? "No matches" : `${hits.length} artists`}</Mono>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {state === "rest" && <OASMessage head={OAS_COPY.restHead} body={OAS_COPY.restBody}/>}
        {state === "none" && <OASMessage head={OAS_COPY.noneHead} body={OAS_COPY.noneBody} action={<NFGhost>{OAS_COPY.noneAction}</NFGhost>}/>}
        {state === "results" && hits.map(a => <OASRow key={a.name} artist={a} selected={picked.includes(a.name)}/>)}
      </div>
      <OASPickedStrip names={picked} pad="11px 26px"/>
    </OASDeskCard>
  );
}

// Desktop step 7 as it should be — the corrected baseline. The shipped
// FollowStepDesktop has NO search control at all (mobile-only today) and
// renders NFDots total=6 index=4 with a "Step 5 of 6" eyebrow.
function StepWithTriggerDesktop({ picked = OAS_PICKED }) {
  return (
    <OASDeskCard footer={<OASDeskRail n={picked.length}/>}>
      <div style={{ padding: "20px 26px 14px", flexShrink: 0, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 26 }}>
        <div style={{ minWidth: 0 }}>
          <Mono size={10} color="var(--signal)">Step 7 of 8 · playing denver</Mono>
          <h1 style={{ margin: "9px 0 0", fontSize: 30, fontWeight: 900, letterSpacing: "-0.03em", color: "var(--fg)" }}>Know any of these?</h1>
          <p style={{ margin: "9px 0 0", fontSize: 14.5, color: "var(--fg-muted)", lineHeight: 1.5, maxWidth: 520, textWrap: "pretty" }}>
            Punk, indie rock and shoegaze acts with Denver dates on the books. Tap to add — you can pick as many as you like.
          </p>
        </div>
        {/* On desktop the trigger is a field in the header, not a row under
            the grid: the grid is five columns and a full-width dashed strip
            beneath it would read as a sixth, empty row. */}
        <div role="button" tabIndex={0} style={{ cursor: "pointer", width: 232, flexShrink: 0, display: "flex", alignItems: "center", gap: 9,
          minHeight: 44, padding: "0 13px", borderRadius: 11, background: "var(--surface-1)", border: "1px solid var(--border-strong)" }}>
          <span style={{ color: "var(--fg-subtle)", flexShrink: 0 }}><GlyphSearch size={15}/></span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: "var(--fg-muted)" }}>Someone else?</span>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 26px 18px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12 }}>
          {NF_ARTISTS.map(a => <ArtistPick key={a.name} artist={a} selected={picked.includes(a.name)}/>)}
        </div>
      </div>
    </OASDeskCard>
  );
}

// A2 on desktop has nowhere to be a sheet, so it becomes a centred modal over
// the card — a second surface class invented for one control. Drawn so the
// cost is visible, not argued.
function SearchModalDesktop({ picked = OAS_PICKED, query = "man" }) {
  const hits = oasQuery(query);
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0 }}><StepWithTriggerDesktop picked={picked}/></div>
      <div style={{ position: "absolute", inset: 0, background: "var(--scrim)", backdropFilter: "blur(1.5px)" }}/>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ width: 520, maxHeight: "78%", borderRadius: 16, background: "var(--bg-elevated)", border: "1px solid var(--border-strong)",
          boxShadow: "var(--shadow-strong, 0 32px 80px rgba(0,0,0,0.45))", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "18px 20px 12px", flexShrink: 0 }}>
            <OASField query={query} onBack={false}/>
            <div style={{ marginTop: 11 }}><Mono size={9.5}>{hits.length} artists</Mono></div>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            {hits.map(a => <OASRow key={a.name} artist={a} selected={picked.includes(a.name)} dense/>)}
          </div>
          <div style={{ padding: "13px 20px 18px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <div style={{ flex: 1, fontSize: 12.5, color: "var(--fg-subtle)" }}>{picked.length} selected</div>
            <NFPrimary full={false} dense>Done</NFPrimary>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  SearchInPlace, StepWithTrigger, SearchSheetBody,
  SearchInPlaceDesktop, StepWithTriggerDesktop, SearchModalDesktop,
});

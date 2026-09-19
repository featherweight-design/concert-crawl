// oas-canvas.jsx — R1 canvas.
// In a file rather than an inline babel block: Babel standalone evaluates
// inline blocks before it finishes fetching src blocks.

const { ThemeProvider } = window;
const { DesignCanvas, DCSection, DCArtboard } = window;
const { IOSDevice } = window;
const { NFNote, NotePaper, Mono, Scrim, NFPrimary, NFGhost } = window;
const { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakSelect } = window;
const { SearchInPlace, StepWithTrigger, SearchSheetBody, SearchInPlaceDesktop,
  StepWithTriggerDesktop, SearchModalDesktop } = window;
const { RoundTripSearch, RoundTripReturn, RoundTripSearchDesktop,
  StepNoTrigger, GridError, GridErrorDesktop } = window;

const PW = 402, PH = 874, NW = 320, NH = 800, DW = 1280, DH = 880;

function Phone({ theme = "electric", w = PW, h = PH, children }) {
  return (
    <ThemeProvider theme={theme}>
      <IOSDevice width={w} height={h} dark={theme !== "light"}>
        <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>{children}</div>
      </IOSDevice>
    </ThemeProvider>
  );
}
function PhoneOverlay({ theme = "electric", behind, children, w = PW, h = PH }) {
  return (
    <ThemeProvider theme={theme}>
      <IOSDevice width={w} height={h} dark={theme !== "light"}>
        <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0 }}>{behind}</div>
          <Scrim/>{children}
        </div>
      </IOSDevice>
    </ThemeProvider>
  );
}
function Desk({ theme = "electric", children }) {
  return (
    <ThemeProvider theme={theme} style={{ width: "100%", height: "100%" }}>
      <div style={{ width: "100%", height: "100%", overflow: "hidden", borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)" }}>{children}</div>
    </ThemeProvider>
  );
}

// ── Live artboard, driven by Tweaks ────────────────────────────
function LiveTweaks({ v, setTweak }) {
  return (
    <TweaksPanel title="Step 7 · search">
      <TweakSection label="Direction">
        <TweakSelect label="Surface" value={v.surface} options={["A1 · in-place", "A2 · sheet", "B · round trip", "C · no trigger", "Error state"]} onChange={x => setTweak("surface", x)}/>
      </TweakSection>
      <TweakSection label="State">
        <TweakSelect label="Search state" value={v.state} options={["rest", "typing", "results", "none"]} onChange={x => setTweak("state", x)}/>
        <TweakSelect label="Error offer" value={v.errOption} options={["E1", "E2", "E3"]} onChange={x => setTweak("errOption", x)}/>
      </TweakSection>
      <TweakSection label="Context">
        <TweakRadio label="Tier" value={v.tier} options={["premium", "free"]} onChange={x => setTweak("tier", x)}/>
        <TweakRadio label="Width" value={v.width} options={["402", "320"]} onChange={x => setTweak("width", x)}/>
      </TweakSection>
    </TweaksPanel>
  );
}

function LivePhone({ v }) {
  const narrow = v.width === "320";
  const w = narrow ? NW : PW, h = narrow ? NH : PH;
  const common = { narrow, tier: v.tier };
  if (v.surface === "A2 · sheet") {
    return <PhoneOverlay w={w} h={h} behind={<StepWithTrigger {...common}/>}><SearchSheetBody state={v.state === "typing" ? "results" : v.state} tier={v.tier}/></PhoneOverlay>;
  }
  const body = v.surface === "A1 · in-place" ? <SearchInPlace {...common} state={v.state}/>
    : v.surface === "B · round trip" ? <RoundTripSearch {...common}/>
    : v.surface === "C · no trigger" ? <StepNoTrigger {...common}/>
    : <GridError narrow={narrow} option={v.errOption}/>;
  return <Phone w={w} h={h}>{body}</Phone>;
}

function App() {
  const [v, setTweak] = useTweaks({ surface: "A1 · in-place", state: "results", errOption: "E1", tier: "premium", width: "402" });
  return (
    <>
      <DesignCanvas>

        <DCSection id="live" title="Onboarding · the artist-search escape hatch"
          subtitle="⚠️ ALL COPY IS PLACEHOLDER — every user-facing string is a structural stand-in that sizes the layout and proves the state machine; it needs a pass from the copy-writer before build. · Scope is ONE control: “Search for someone specific”, the dashed button under the suggestion grid on step 7 of 8 (nf-cold-start.jsx · FollowStepArtists). Today it is a plain link to /search: it walks the visitor out of the tour, the progress strip, the Skip rail and the commit CTA all disappear, /search has no idea anyone was mid-onboarding, and the only route back is the browser’s back button. The selection survives in sessionStorage and nothing on screen says so. · Three directions are drawn here at comparable fidelity. RECOMMENDATION: direction 1, in-place — the step swaps mode instead of opening a surface. §1 argues it, §2 draws the alternative inside direction 1, §3 and §4 are directions 2 and 3, §5 is the error-state ruling. Nothing about the grid, the tiles, the rail or the step copy is reopened. · Flip direction · state · tier · width in the Tweaks panel.">
          <DCArtboard id="live-phone" label="Responds to Tweaks" width={v.width === "320" ? NW : PW} height={v.width === "320" ? NH : PH}><LivePhone v={v}/></DCArtboard>
          <DCArtboard id="live-rec" label="The recommendation" width={340} height={PH}>
            <NotePaper><div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <NFNote tone="warn" title="Copy is placeholder — route to the copy-writer" items={[
                "Every user-facing string here is a STRUCTURAL stand-in. Headlines, the rest/no-results/error bodies, the field placeholder, the return-strip line and the button labels all need a pass.",
                "Two things are design decisions, not copy: the vocabulary (picks are SELECTED during the step, FOLLOWED only at commit — never 'saved') and the promise that nothing is written until the rail fires. Keep those; rewrite everything around them.",
              ]}/>
              <NFNote tone="note" title="Recommendation · direction 1, in-place (A1)" items={[
                "The defect isn't that the control leaves — it's that it leaves a COMMITTING flow with an uncommitted selection. Keeping the search inside the step is the only answer that doesn't have to invent a way back.",
                "In-place over a sheet: the sheet leaves the step's real CTA ('Follow 4 artists →') live-looking and unreachable behind a scrim, so it has to grow its own commit ('Done'). Two commit affordances on screen, one of them fake.",
                "In-place is also the only variant that survives the move to desktop unchanged. The tour renders both trees at once; a sheet has nowhere to be a sheet at 1280 and becomes a modal — a new surface class invented for one control. Drawn in §2 so the cost is visible.",
                "It fixes the sessionStorage silence for free: the picked strip pins under the results, so leaving the grid never looks like losing it, and a row tapped in search visibly joins the same set.",
                "It also answers the error state without a second mechanic — see §5.",
              ]}/>
              <NFNote tone="note" title="Two live defects fixed in passing" items={[
                "The step-7 eyebrow reads 'Step 5 of 6' while NFDots renders 8 dots. The dots are right; the string was never updated when the flow went to eight. Corrected to 'Step 7 of 8' on every artboard here.",
                "FollowStepDesktop (nf-desktop.jsx) passes NFDots total={6} index={4} — the same miscount — AND has no search control at all: the escape hatch is mobile-only today. §2 ships the corrected desktop baseline.",
              ]}/>
              <NFNote tone="warn" title="Open for product" items={[
                "Free / Supporter: the step lets you select and paywalls the commit ('Your picks are held while you upgrade'). Search inherits that unchanged — a locked row still selects. Confirm that's right: it means a free user can build a 12-artist selection they can't commit.",
                "Direction 2 exposes a genuine conflict rather than a layout problem: /search's rows carry NFFollow, which WRITES IMMEDIATELY, while the step batches one write at commit. Following on /search mid-onboarding creates follows before the rail ever fires. That needs a product answer if 2 is chosen.",
              ]}/>
            </div></NotePaper>
          </DCArtboard>
        </DCSection>

        <DCSection id="a1" title="1 · Direction 1 · search in-place — RECOMMENDED"
          subtitle="Not a panel over the step: a MODE of the step. The header block (eyebrow, headline, lede) collapses into a search field in the same vertical box, and the grid region becomes results — so nothing below moves. The progress dots and the commit rail are untouched and LIVE: a row tapped in search increments the same counter the tiles feed, and the rail still reads “Follow 5 artists →”. There is one flow, one commit, and no navigation to undo.">
          <DCArtboard id="a1-before" label="Before · the shipped trigger (dashed link)" width={PW} height={PH}><Phone><StepWithTrigger variant="shipped"/></Phone></DCArtboard>
          <DCArtboard id="a1-trigger" label="After · trigger as a field" width={PW} height={PH}><Phone><StepWithTrigger/></Phone></DCArtboard>
          <DCArtboard id="a1-rest" label="Opened · nothing typed" width={PW} height={PH}><Phone><SearchInPlace state="rest"/></Phone></DCArtboard>
          <DCArtboard id="a1-typing" label="Typing" width={PW} height={PH}><Phone><SearchInPlace state="typing"/></Phone></DCArtboard>
          <DCArtboard id="a1-results" label="Results · one already picked" width={PW} height={PH}><Phone><SearchInPlace state="results"/></Phone></DCArtboard>
          <DCArtboard id="a1-none" label="No results" width={PW} height={PH}><Phone><SearchInPlace state="none" query="zzzz"/></Phone></DCArtboard>
          <DCArtboard id="a1-free" label="Results · Free (commit paywalled)" width={PW} height={PH}><Phone><SearchInPlace state="results" tier="free"/></Phone></DCArtboard>
          <DCArtboard id="a1-320" label="Results · 320" width={NW} height={NH}><Phone w={NW} h={NH}><SearchInPlace narrow state="results"/></Phone></DCArtboard>
          <DCArtboard id="a1-notes" label="Notes" width={330} height={PH}>
            <NotePaper><div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <NFNote tone="note" title="Why the row is a checkbox, not a Follow button" items={[
                "/search's artist row carries NFFollow, which writes on tap. Inside the tour nothing is written until the rail commits, so a result has to speak the GRID's language: the whole row is the checkbox, exactly as the tile is.",
                "That grammar already exists — BulkFollowSheet uses it. Reusing it means the gesture is learned once and works in three places, and the merge with the grid selection is structural rather than explained.",
                "26px check square, 44px+ row target, selection is glyph + border + fill, never colour alone.",
              ]}/>
              <NFNote tone="note" title="The picked strip" items={[
                "The single thing the live control gets most wrong: the selection survives in sessionStorage and NOTHING on screen says so. The strip pins the picks under the results — it is the cheapest possible fix and it belongs to the step, not to search.",
                "Caps at six faces + the count. It is read-only; tapping a face is not an unfollow (unpicking happens on the tile or the row).",
              ]}/>
              <NFNote tone="note" title="States" items={[
                "REST is not an empty state — it's a prompt, with the field focused and the index explained in one line. No recent-searches list: there is no history to recall this early.",
                "TYPING renders skeleton rows rather than a spinner, so the result count doesn't jump the layout when it lands.",
                "NO RESULTS keeps 'back to suggestions' as the only action. It never offers /search — that would reintroduce the exit this whole pass exists to close.",
                "Every result is followable BY CONSTRUCTION: artists are a projection off event billing strings, so the index only holds artists a crawl found on a Denver bill. 'Played before, nothing upcoming' is real, common, and the clearest case for following — it carries a meta line, not a disabled state.",
              ]}/>
              <NFNote title="A11y" items={[
                "Rows are role=checkbox + aria-checked inside a labelled group, same contract as the tiles.",
                "Mode swap moves focus to the field and announces 'Searching artists, step 7 of 8' — the step never silently changes under a screen reader.",
                "Back returns focus to the trigger, not to the top of the grid.",
                "The result count is role=status so it announces as the query narrows; the rail's count is in the button text, so it's announced too.",
              ]}/>
            </div></NotePaper>
          </DCArtboard>
        </DCSection>

        <DCSection id="a2" title="2 · Direction 1, the other way · a sheet over the step"
          subtitle="Same results, same merge, different container — and the difference is not cosmetic. The sheet is a separate surface, so it needs its own commit (“Done · 5 selected”) while the step’s real commit sits live-looking and unreachable behind the scrim. At 1280 it has nowhere to be a sheet and becomes a centred modal: a surface class invented for one control, in a flow that has none anywhere else. Both costs are drawn rather than argued.">
          <DCArtboard id="a2-sheet" label="Sheet · results" width={PW} height={PH}><PhoneOverlay behind={<StepWithTrigger/>}><SearchSheetBody state="results"/></PhoneOverlay></DCArtboard>
          <DCArtboard id="a2-rest" label="Sheet · nothing typed" width={PW} height={PH}><PhoneOverlay behind={<StepWithTrigger/>}><SearchSheetBody state="rest"/></PhoneOverlay></DCArtboard>
          <DCArtboard id="a2-none" label="Sheet · no results" width={PW} height={PH}><PhoneOverlay behind={<StepWithTrigger/>}><SearchSheetBody state="none" query="zzzz"/></PhoneOverlay></DCArtboard>
          <DCArtboard id="a2-desk-base" label="Desktop baseline · corrected step 7" width={DW} height={DH}><Desk><StepWithTriggerDesktop/></Desk></DCArtboard>
          <DCArtboard id="a2-desk-inplace" label="Desktop · A1 in-place (same mechanic)" width={DW} height={DH}><Desk><SearchInPlaceDesktop/></Desk></DCArtboard>
          <DCArtboard id="a2-desk-inplace-none" label="Desktop · A1 no results" width={DW} height={DH}><Desk><SearchInPlaceDesktop state="none" query="zzzz"/></Desk></DCArtboard>
          <DCArtboard id="a2-desk-modal" label="Desktop · A2 becomes a modal (the cost)" width={DW} height={DH}><Desk><SearchModalDesktop/></Desk></DCArtboard>
          <DCArtboard id="a2-notes" label="Notes" width={330} height={PH}>
            <NotePaper><div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <NFNote tone="note" title="Read the two commit affordances" items={[
                "On the sheet artboards, look at the bottom 120px: 'Done' sits directly above 'Follow 4 artists →'. Both are live-looking, one is behind a scrim, and neither is obviously the real one.",
                "The fix inside the sheet direction is to dim or hide the step's rail — but a step whose CTA disappears when you search is exactly the disorientation the brief is about, just moved six pixels.",
              ]}/>
              <NFNote tone="note" title="Desktop is where it decides" items={[
                "The tour renders both trees at once, so a mechanic that needs a second form on desktop isn't one mechanic. A1 is the same swap at both widths — header becomes field, grid becomes list, rail stays.",
                "The desktop baseline artboard is also the corrected step 7: the shipped FollowStepDesktop has NO search control and renders 6 dots with a 'Step 5 of 6' eyebrow.",
                "On desktop the trigger sits in the header as a field, not as a strip under the grid — under a five-column grid a full-width dashed row reads as a sixth, empty row.",
              ]}/>
              <NFNote tone="warn" title="If the sheet wins anyway" items={[
                "Then the desktop modal in this section is the spec, and 'Done' must be the only commit visible: the step rail dims to 40% and is aria-hidden while the sheet is open.",
                "And the sheet needs a drag-to-dismiss that does NOT discard selection — a sheet users can flick away is a selection they can flick away.",
              ]}/>
            </div></NotePaper>
          </DCArtboard>
        </DCSection>

        <DCSection id="b" title="3 · Direction 2 · the round trip"
          subtitle="Leave to /search and come back with a visible “back to setup” affordance and the selection intact. The strip is easy to draw and lands on a SHARED route, which is the visible cost. The invisible one is underneath it: /search’s rows carry NFFollow, which writes on tap, while the step batches one write at commit. Following three artists on /search mid-onboarding means three follows exist before the rail ever fires — two commit models over one selection. That is a product decision, not a layout one.">
          <DCArtboard id="b-search" label="/search with the return strip" width={PW} height={PH}><Phone><RoundTripSearch/></Phone></DCArtboard>
          <DCArtboard id="b-search-plain" label="/search normally (no strip) — for comparison" width={PW} height={PH}><Phone><RoundTripSearch withStrip={false}/></Phone></DCArtboard>
          <DCArtboard id="b-return" label="Back on step 7 · picks intact, one added" width={PW} height={PH}><Phone><RoundTripReturn/></Phone></DCArtboard>
          <DCArtboard id="b-320" label="/search · 320" width={NW} height={NH}><Phone w={NW} h={NH}><RoundTripSearch narrow/></Phone></DCArtboard>
          <DCArtboard id="b-desk" label="/search · desktop" width={DW} height={DH}><Desk><RoundTripSearchDesktop/></Desk></DCArtboard>
          <DCArtboard id="b-notes" label="Notes" width={330} height={PH}>
            <NotePaper><div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <NFNote tone="note" title="What the strip has to be" items={[
                "role=status, --signal bordered, pinned above the search field and sticky — a strip that scrolls away is a way back you can lose.",
                "It carries the count ('4 artists picked, still held'), because the sessionStorage silence is the actual complaint and the strip is the only place on this route that can answer it.",
                "It must render on /search and NOWHERE else, which means /search gains an onboarding-aware mode for one caller. Compare the two /search artboards: the plain one is the route as it ships today.",
              ]}/>
              <NFNote tone="warn" title="The conflict this direction exposes" items={[
                "Two commit models. The step batches one write at the rail; /search's Follow buttons write immediately. Choose one before this ships: either /search's buttons enter a 'select' mode during onboarding (which is direction 1 with extra navigation), or the step's batch is abandoned and every tap writes (which changes the rail's whole promise and the Free-tier 'picks are held' line).",
                "Browser back is still reachable and still bypasses the strip — the strip makes a good path visible, it does not remove the bad one.",
                "Deep links and refresh on /search mid-tour have to keep the onboarding context alive, or the strip vanishes and we're back where we started.",
              ]}/>
              <NFNote title="If direction 2 is chosen anyway" items={[
                "It is the only direction that gives the visitor the FULL search surface (shows as well as artists), which is a real argument if product wants the tour to teach /search.",
                "Then the return artboard's confirmation line is required, not optional: coming back silently is the same defect in the other direction.",
              ]}/>
            </div></NotePaper>
          </DCArtboard>
        </DCSection>

        <DCSection id="c" title="4 · Direction 3 · drop it"
          subtitle="The sub-line under the rail already says “You can follow anyone from search later”, the step is skippable, every artist in the grid is followable by construction, and the flow is eight steps long. The honest case for cutting: one fewer control, zero new surface, and the tour stops offering an exit it can’t support. The honest case against: the grid is genre-filtered, so the visitor who came in wanting to follow one specific band is told to wait — and the error state loses the only thing it currently offers.">
          <DCArtboard id="c-step" label="Step 7 · no trigger" width={PW} height={PH}><Phone><StepNoTrigger/></Phone></DCArtboard>
          <DCArtboard id="c-320" label="No trigger · 320" width={NW} height={NH}><Phone w={NW} h={NH}><StepNoTrigger narrow/></Phone></DCArtboard>
          <DCArtboard id="c-free" label="No trigger · Free" width={PW} height={PH}><Phone><StepNoTrigger tier="free"/></Phone></DCArtboard>
          <DCArtboard id="c-notes" label="Notes" width={330} height={PH}>
            <NotePaper><div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <NFNote tone="note" title="What replaces it" items={[
                "A closing line under the grid, not a control: 'That's everyone playing Denver in your genres. Anyone else — search once you're in.' It says the same thing the trigger promised without pretending to be a door.",
                "Muted, centred, no border. It must not read as a disabled button.",
              ]}/>
              <NFNote tone="note" title="The real cost" items={[
                "The suggestion query is genre-filtered. A visitor whose band isn't in their picked genres — or who picked no genres and got the generic top-follower list — has no route to them inside the tour at all.",
                "That's survivable (the step is skippable and the artist page exists after sign-in) but it makes step 7 a lottery for exactly the user most motivated to follow someone.",
                "And it hands the error state a hole: see §5.",
              ]}/>
              <NFNote tone="warn" title="Ranked" items={[
                "3 is better than the status quo — an exit that strands people is worse than no exit. It is worse than 1, which costs one mode on a step that already exists.",
                "If eight steps is the real objection, the fix is cutting a STEP, not this control. Say the word and we'll draw that instead.",
              ]}/>
            </div></NotePaper>
          </DCArtboard>
        </DCSection>

        <DCSection id="err" title="5 · The grid error state — three offers, ruling deferred to R2"
          subtitle="“That list didn't load.” Today the search trigger is the only thing in it, which is a weak answer even when the trigger stays: “search for them by name” is not a reply to “we couldn't load ten suggestions” — the visitor doesn't have a name in mind, that's why they're on a suggestion grid. All three offers use the Hybrid empty-state anatomy (mono status word · short headline · one informative line · a real action) and the locked error word SIGNAL LOST.">
          <DCArtboard id="err-e1" label="E1 · retry + skip (works under all 3 directions)" width={PW} height={PH}><Phone><GridError option="E1"/></Phone></DCArtboard>
          <DCArtboard id="err-e2" label="E2 · retry + search (needs direction 1 or 2)" width={PW} height={PH}><Phone><GridError option="E2"/></Phone></DCArtboard>
          <DCArtboard id="err-e3" label="E3 · search only (the live behaviour)" width={PW} height={PH}><Phone><GridError option="E3"/></Phone></DCArtboard>
          <DCArtboard id="err-320" label="E1 · 320" width={NW} height={NH}><Phone w={NW} h={NH}><GridError narrow option="E1"/></Phone></DCArtboard>
          <DCArtboard id="err-desk-e1" label="E1 · desktop" width={DW} height={DH}><Desk><GridErrorDesktop option="E1"/></Desk></DCArtboard>
          <DCArtboard id="err-desk-e2" label="E2 · desktop" width={DW} height={DH}><Desk><GridErrorDesktop option="E2"/></Desk></DCArtboard>
          <DCArtboard id="err-notes" label="Notes" width={330} height={PH}>
            <NotePaper><div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <NFNote tone="note" title="Where each lands" items={[
                "E1 — retry primary, 'Skip this step' secondary. The only offer that is correct under ALL THREE directions, because retry is the answer to a load failure and skip is the honest escape from a step that was never required.",
                "E2 — retry primary, 'Search by name' secondary. Right if direction 1 wins: search is in-step, so it's a real second option rather than an exit. Wrong under direction 3 (the control doesn't exist) and shaky under 2 (it sends a visitor who just hit an error onto a different route).",
                "E3 — the live behaviour, drawn for reference. No retry at all: a transient network blip becomes a dead end with one door, and that door leads out of the tour.",
              ]}/>
              <NFNote tone="note" title="If direction 1 is adopted (the recommendation)" items={[
                "E2 is available, but E1 is still the lean: the primary action for a failed load is to load it again, and offering search alongside retry reads as 'we don't think it'll work'. Keep search reachable via the header trigger, which is present in this state anyway — it doesn't need to be repeated in the error body.",
                "That is the R2 call. Both are drawn at both widths so it can be made by looking.",
              ]}/>
              <NFNote tone="note" title="Copy + voice" items={[
                "'That list didn't load.' / 'Ours, not yours. Try it again — or skip, nothing here is required.' Playful + clear, and it takes the blame, which matches the founder voice the tour opens with.",
                "SIGNAL LOST is the locked error status word from the Hybrid empty state. Do not coin a new one.",
              ]}/>
              <NFNote title="A11y" items={[
                "The error block is role=alert and takes focus on appear — a grid that silently becomes an error is the worst version of this.",
                "The rail stays rendered and reads 'Continue without following →' at zero picks, so a keyboard user can always leave forward, not only via retry.",
                "Retry is a real button with a pending state; it never becomes a spinner-only control.",
              ]}/>
            </div></NotePaper>
          </DCArtboard>
        </DCSection>

      </DesignCanvas>
      <LiveTweaks v={v} setTweak={setTweak}/>
    </>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<App/>);

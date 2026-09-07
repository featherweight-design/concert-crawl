// follow-canvas.jsx — before/after canvas.
// Left column of every pair is R2 (shipped today), right is R3 (this pass).

const { DesignCanvas, DCSection, DCArtboard, ThemeProvider, useThemeState, ThemeSwitcher } = window;

function Stage({ theme, children, pad = 0, width }) {
  return (
    <ThemeProvider theme={theme} style={{ background: "var(--bg)", width: width || "100%", height: "100%", padding: pad, overflow: "hidden" }}>
      {children}
    </ThemeProvider>
  );
}

function App() {
  const [theme, setTheme] = useThemeState("electric", "cc-theme");
  const T = (kids, opts = {}) => <Stage theme={theme} {...opts}>{kids}</Stage>;
  return (
    <>
      <DesignCanvas>
        <DCSection id="s-bill" title="1 · Event detail — the bill"
          subtitle="Two artists, three filled slabs. R3 keeps the rows quiet at 28 and folds “Follow all” into the header, where it reads as a shortcut for the rows rather than the section's primary action.">
          <DCArtboard id="bill-before" label="BEFORE · R2" width={422} height={330}>
            {T(<div style={{ padding: 16 }}><BillBlock legacy/></div>)}
          </DCArtboard>
          <DCArtboard id="bill-after" label="AFTER · R3" width={422} height={330}>
            {T(<div style={{ padding: 16 }}><BillBlock/></div>)}
          </DCArtboard>
          <DCArtboard id="bill-free" label="AFTER · Free (locked as one unit)" width={422} height={330}>
            {T(<div style={{ padding: 16 }}><BillBlock tier="free"/></div>)}
          </DCArtboard>
          <DCArtboard id="bill-note" label="Note" width={356} height={330}>
            {T(<Note>The gate is still <strong style={{ color: "var(--fg)" }}>one unit</strong>: below Premium the header shortcut and every row lock together, so a 4-act bill is one paywall and one tap. Quiet weight does not change that — a locked row is the same 28px pill with a lock glyph and <code>--fg-muted</code> text.</Note>)}
          </DCArtboard>
        </DCSection>

        <DCSection id="s-search" title="2 · Search results"
          subtitle="The filled pill was wider than the name block it sat beside and fought the ARTIST PAGE chip. Quiet at 28 lets chip and button form one right-hand cluster.">
          <DCArtboard id="search-before" label="BEFORE · R2 · 390" width={390} height={330}>
            {T(<SearchResults legacy/>)}
          </DCArtboard>
          <DCArtboard id="search-after" label="AFTER · R3 · 390" width={390} height={330}>
            {T(<SearchResults/>)}
          </DCArtboard>
          <DCArtboard id="search-320" label="AFTER · 320 · icon-only" width={320} height={330}>
            {T(<SearchResults narrow/>)}
          </DCArtboard>
          <DCArtboard id="search-note" label="Note" width={356} height={330}>
            {T(<Note>Under 360 the label drops and the button becomes a 28px square with an <code>aria-label</code> — the row itself is still a full-width target to the artist page, so the small square is the <em>secondary</em> action on a row that already has a big one.</Note>)}
          </DCArtboard>
        </DCSection>

        <DCSection id="s-artist" title="3 · Artist page — the one loud one"
          subtitle="This is the surface the page exists for and the only follow on screen, so it keeps the filled --signal pill. It loses height only: 48 → 44.">
          <DCArtboard id="artist-before" label="BEFORE · R2 · 48px" width={390} height={620}>
            {T(<ArtistHero legacy/>)}
          </DCArtboard>
          <DCArtboard id="artist-after" label="AFTER · R3 · 44px" width={390} height={620}>
            {T(<ArtistHero/>)}
          </DCArtboard>
          <DCArtboard id="artist-following" label="AFTER · following" width={390} height={620}>
            {T(<ArtistHero state="following"/>)}
          </DCArtboard>
          <DCArtboard id="artist-locked" label="AFTER · Free (locked)" width={390} height={620}>
            {T(<ArtistHero state="locked"/>)}
          </DCArtboard>
          <DCArtboard id="artist-note" label="Note" width={356} height={620}>
            {T(<Note>One filled Follow per screen, maximum. That rule is what makes the artist page's button read as primary again — in R2 it was the fourth cyan slab a user met, so it carried no more weight than a row.<br/><br/>The pitch line underneath is unchanged and still does the explaining.</Note>)}
          </DCArtboard>
        </DCSection>

        <DCSection id="s-sticky" title="4 · Sticky sub-header &amp; shelves">
          <DCArtboard id="sticky-before" label="BEFORE · R2 · 44px in a 56px bar" width={390} height={110}>
            {T(<StickyFollowBar legacy/>)}
          </DCArtboard>
          <DCArtboard id="sticky-after" label="AFTER · R3 · 28px" width={390} height={110}>
            {T(<StickyFollowBar/>)}
          </DCArtboard>
          <DCArtboard id="shelf-before" label="BEFORE · badge 30" width={390} height={280}>
            {T(<ShelfStrip legacy/>)}
          </DCArtboard>
          <DCArtboard id="shelf-after" label="AFTER · badge 26" width={390} height={280}>
            {T(<ShelfStrip/>)}
          </DCArtboard>
        </DCSection>

        <DCSection id="s-desktop" title="5 · Desktop"
          subtitle="Rows get one notch back (32) — the pointer target isn't the constraint and the rail is wider. The rail CTA stays filled, 44, full-rail-width.">
          <DCArtboard id="dt-search-before" label="BEFORE · desktop search rows" width={620} height={230}>
            {T(<DesktopSearchRow legacy/>)}
          </DCArtboard>
          <DCArtboard id="dt-search-after" label="AFTER · desktop search rows" width={620} height={230}>
            {T(<DesktopSearchRow/>)}
          </DCArtboard>
          <DCArtboard id="dt-rail-before" label="BEFORE · detail rail" width={320} height={470}>
            {T(<DesktopRail legacy/>)}
          </DCArtboard>
          <DCArtboard id="dt-rail-after" label="AFTER · detail rail" width={320} height={470}>
            {T(<DesktopRail/>)}
          </DCArtboard>
        </DCSection>

        <DCSection id="s-system" title="6 · The spec"
          subtitle="Two axes now: size (badge · row · rowWide · primary) and tone (quiet · loud). Four states are unchanged.">
          <DCArtboard id="sys-states"  label="States × tone" width={400} height={540}>
            {T(<StateGallery/>)}
          </DCArtboard>
          <DCArtboard id="sys-hit"  label="Hit area — unchanged at 44" width={470} height={540}>
            {T(<HitProof/>)}
          </DCArtboard>
          <DCArtboard id="sys-table"  label="Size ramp" width={400} height={540}>
            {T(<SizeTable/>)}
          </DCArtboard>
          <DCArtboard id="sys-note"  label="Rules" width={356} height={540}>
            {T(<Note>
              <strong style={{ color: "var(--fg)" }}>1 ·</strong> One filled Follow per screen. It belongs to the artist page hero.<br/><br/>
              <strong style={{ color: "var(--fg)" }}>2 ·</strong> Everywhere else is quiet: outline, <code>--fg</code> text, <code>--border-strong</code>.<br/><br/>
              <strong style={{ color: "var(--fg)" }}>3 ·</strong> Following stays <code>--signal</code>-tinted at any tone — it's a state, and losing the colour would lose the read.<br/><br/>
              <strong style={{ color: "var(--fg)" }}>4 ·</strong> Visual height may shrink; the 44px target may not.<br/><br/>
              <strong style={{ color: "var(--fg)" }}>5 ·</strong> <code>--accent</code> is still Watching. Following never borrows it.
            </Note>)}
          </DCArtboard>
        </DCSection>
      </DesignCanvas>
      <ThemeSwitcher value={theme} onChange={setTheme}/>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);

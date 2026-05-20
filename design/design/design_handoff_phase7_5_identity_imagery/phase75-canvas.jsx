// phase75-canvas.jsx — Phase 7.5 · Identity Imagery canvas
// Composes mock surfaces + 12+12 gallery + template matrix + collision check.
// Tweaks: template subset, palette source, initials overlay, grain, theme.

const TWK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "electric",
  "showInitials": true,
  "grain": 0.10,
  "templateOverride": "auto",
  "paletteSource": "per-entity",
  "rotateOverride": "auto"
}/*EDITMODE-END*/;

function buildArtProps(t) {
  const p = { grain: Number(t.grain) };
  if (t.showInitials != null) p.showInitials = !!t.showInitials;
  if (t.templateOverride && t.templateOverride !== "auto") p.templateOverride = t.templateOverride;
  if (t.rotateOverride && t.rotateOverride !== "auto") p.rotateOverride = Number(t.rotateOverride);
  // paletteSource handled per-entity (we just leave palette inferred from name).
  return p;
}

function CanvasCard({ title, subtitle, children, width = "auto" }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 10,
      width,
    }}>
      <div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14,
          color: "rgba(40,30,20,0.9)" }}>{title}</div>
        {subtitle && (
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12,
            color: "rgba(60,50,40,0.6)", marginTop: 2 }}>{subtitle}</div>
        )}
      </div>
      {children}
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWK_DEFAULTS);
  const artProps = buildArtProps(t);
  const themeKey = t.theme;

  return (
    <DesignCanvas>
      {/* ── Section 1: Hero surfaces ─────────────────────────── */}
      <DCSection id="hero" title="Hero surfaces"
        subtitle="The art replaces the single-letter monogram on Event Detail + Venue Profile.">
        <DCArtboard id="evt-mobile" label="Event Detail · mobile" width={375} height={620}>
          <ThemeProvider theme={themeKey}>
            <MobileEventDetailHero artist="Wednesday" supporting="Hotline TNT"
              venue="Mission Ballroom" date="Tue, May 12"
              artProps={artProps} />
          </ThemeProvider>
        </DCArtboard>

        <DCArtboard id="evt-desktop" label="Event Detail · desktop" width={920} height={560}>
          <ThemeProvider theme={themeKey} style={{ padding: 20 }}>
            <DesktopEventDetailHero artist="Bright Eyes" supporting="Lucy Dacus"
              venue="Red Rocks Amphitheatre" date="Wed, May 6"
              artProps={artProps} />
          </ThemeProvider>
        </DCArtboard>

        <DCArtboard id="venue-mobile" label="Venue Profile · mobile" width={375} height={500}>
          <ThemeProvider theme={themeKey}>
            <MobileVenueHero venue="Mission Ballroom" city="Denver, CO"
              capacity="3,950 cap" outdoors="Indoor"
              artProps={artProps} />
          </ThemeProvider>
        </DCArtboard>

        <DCArtboard id="venue-mobile-2" label="Venue Profile · Red Rocks" width={375} height={500}>
          <ThemeProvider theme={themeKey}>
            <MobileVenueHero venue="Red Rocks Amphitheatre" city="Morrison, CO"
              capacity="9,525 cap" outdoors="Outdoor"
              artProps={artProps} />
          </ThemeProvider>
        </DCArtboard>
      </DCSection>

      {/* ── Section 2: Tile / list surfaces ───────────────────── */}
      <DCSection id="tiles" title="List + tile surfaces"
        subtitle="Same hash → same image at every scale. Initials drop out below hero.">
        <DCArtboard id="browse-tiles" label="Browse list (tiles)" width={400} height={420}>
          <ThemeProvider theme={themeKey} style={{ padding: 16, background: "var(--bg)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <BrowseListTile title="Wednesday" supporting="with Hotline TNT" venue="Mission" date="Tue · 8:00 PM" price="$30" artProps={artProps} />
              <BrowseListTile title="Bright Eyes" supporting="with Lucy Dacus" venue="Red Rocks" date="Wed · 7:00 PM" price="$40–$75" artProps={artProps} />
              <BrowseListTile title="Mannequin Pussy" supporting="with Soul Glo" venue="Bluebird" date="Thu · 8:30 PM" price="$28" artProps={artProps} />
              <BrowseListTile title="David Guetta" supporting="" venue="Red Rocks" date="Tue · 8:00 PM" price="$65–$120" artProps={artProps} />
            </div>
          </ThemeProvider>
        </DCArtboard>

        <DCArtboard id="search-rows" label="Search results" width={400} height={420}>
          <ThemeProvider theme={themeKey} style={{ padding: 16, background: "var(--bg)" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <SearchResultRow title="David Guetta" meta="Tue, May 5 · Red Rocks" kind="artist" artProps={artProps} />
              <SearchResultRow title="Mission Ballroom" meta="Denver, CO · 3,950 cap" kind="venue" artProps={artProps} />
              <SearchResultRow title="Wednesday" meta="Tue, May 12 · Mission" kind="artist" artProps={artProps} />
              <SearchResultRow title="Gothic Theatre" meta="Englewood, CO · 1,100 cap" kind="venue" artProps={artProps} />
              <SearchResultRow title="Geese" meta="Sat, May 9 · Ogden" kind="artist" artProps={artProps} />
            </div>
          </ThemeProvider>
        </DCArtboard>

        <DCArtboard id="watching-list" label="Watching list (future)" width={400} height={300}>
          <ThemeProvider theme={themeKey} style={{ padding: 16, background: "var(--bg)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <WatchingListItem title="Mannequin Pussy" meta="Thu, May 7 · Bluebird" delta="−$4" artProps={artProps} />
              <WatchingListItem title="Wednesday" meta="Tue, May 12 · Mission" delta="−$2" artProps={artProps} />
              <WatchingListItem title="Geese" meta="Sat, May 9 · Ogden" delta="even" artProps={artProps} />
            </div>
          </ThemeProvider>
        </DCArtboard>
      </DCSection>

      {/* ── Section 3: Distribution gallery ───────────────────── */}
      <DCSection id="artist-gallery" title="12 artists"
        subtitle="Sanity-check distinctness. Same name + namespace → same art on every reload.">
        <DCArtboard id="artists-hero" label="Artists · hero scale" width={920} height={620}>
          <ThemeProvider theme={themeKey} style={{ padding: 20, background: "var(--bg)" }}>
            <GalleryGrid items={ARTISTS_12} kind="artist" columns={4} cardW={200} cardH={200}
              artProps={artProps} />
          </ThemeProvider>
        </DCArtboard>

        <DCArtboard id="artists-tile" label="Artists · 88px tile strip" width={920} height={140}>
          <ThemeProvider theme={themeKey} style={{ padding: 16, background: "var(--bg)" }}>
            <TileStrip items={ARTISTS_12} kind="artist" artProps={artProps} />
          </ThemeProvider>
        </DCArtboard>
      </DCSection>

      <DCSection id="venue-gallery" title="12 venues"
        subtitle="Venues lean Blueprint where the hash lands there; otherwise share the pool.">
        <DCArtboard id="venues-hero" label="Venues · hero scale" width={920} height={620}>
          <ThemeProvider theme={themeKey} style={{ padding: 20, background: "var(--bg)" }}>
            <GalleryGrid items={VENUES_12} kind="venue" columns={4} cardW={200} cardH={200}
              artProps={artProps} />
          </ThemeProvider>
        </DCArtboard>

        <DCArtboard id="venues-tile" label="Venues · 88px tile strip" width={920} height={140}>
          <ThemeProvider theme={themeKey} style={{ padding: 16, background: "var(--bg)" }}>
            <TileStrip items={VENUES_12} kind="venue" artProps={artProps} />
          </ThemeProvider>
        </DCArtboard>
      </DCSection>

      {/* ── Section 4: Engine QA ──────────────────────────────── */}
      <DCSection id="engine" title="Engine QA"
        subtitle="Templates × palettes matrix, palette swatches, namespace/collision check.">
        <DCArtboard id="matrix-artist" label="Artist templates × palettes" width={780} height={560}>
          <ThemeProvider theme={themeKey} style={{ padding: 20, background: "var(--bg)" }}>
            <TemplateMatrix kind="artist" />
          </ThemeProvider>
        </DCArtboard>

        <DCArtboard id="matrix-venue" label="Venue templates × palettes" width={780} height={560}>
          <ThemeProvider theme={themeKey} style={{ padding: 20, background: "var(--bg)" }}>
            <TemplateMatrix kind="venue" />
          </ThemeProvider>
        </DCArtboard>

        <DCArtboard id="palettes" label="Palette swatches" width={620} height={420}>
          <ThemeProvider theme={themeKey} style={{ padding: 20, background: "var(--bg)" }}>
            <PaletteSwatches />
          </ThemeProvider>
        </DCArtboard>

        <DCArtboard id="collisions" label="Namespace + nearby-name check" width={500} height={380}>
          <ThemeProvider theme={themeKey} style={{ padding: 20, background: "var(--bg)" }}>
            <CollisionCheck artProps={artProps} />
          </ThemeProvider>
        </DCArtboard>
      </DCSection>

      <TweaksPanel>
        <TweakSection label="Theme (chrome only — art is theme-independent)" />
        <TweakRadio label="Theme" value={t.theme}
          options={["electric", "jade", "light"]}
          onChange={(v) => setTweak("theme", v)} />

        <TweakSection label="Identity art" />
        <TweakToggle label="Show initials at hero" value={!!t.showInitials}
          onChange={(v) => setTweak("showInitials", v)} />
        <TweakSlider label="Grain" value={Number(t.grain)} min={0} max={0.4} step={0.02}
          onChange={(v) => setTweak("grain", v)} />
        <TweakSelect label="Force template" value={t.templateOverride}
          options={["auto", "mesh", "stripes", "concentric", "halftone", "blueprint"]}
          onChange={(v) => setTweak("templateOverride", v)} />
        <TweakSelect label="Force rotation" value={String(t.rotateOverride)}
          options={["auto", "0", "1", "2", "3"]}
          onChange={(v) => setTweak("rotateOverride", v)} />
      </TweaksPanel>
    </DesignCanvas>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

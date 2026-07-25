// artist-page.jsx — the route, assembled. Mobile + desktop, behavioural parity.
//
// ORDER IS STATE-DEPENDENT, deliberately:
//   has shows  → name · history · follow · player · upcoming · previously
//   no shows   → name · history · UPCOMING(empty, follow inside) · previously · player
// The empty state is the strongest conversion moment on the page, so it never
// gets pushed below a third-party rectangle. Exactly one live follow
// affordance exists at any time — see `showFollow` on StickyBar.
//
// The skip link only exists when the player has something after it to skip TO.
// With no shows the player is last, so a "skip to shows" link would send focus
// BACKWARDS past a block already read; there it isn't rendered at all.

const AP_HERO_H = { wide: 200, narrow: 150 };
const AP_NARROW_BP = 360;   // < this is the "narrow" layout. 320 is its floor.

function ArtistPageMobile({
  artist, following = false, signedOut = false, loading = "none",  // none | artist | embed
  direction = "mat", embedHeight, narrow = false, scrolled = false, deviceChrome = true, embedBg,
}) {
  const name = artist.name;
  const heroH = narrow ? AP_HERO_H.narrow : AP_HERO_H.wide;
  const eh = embedHeight || window.EMBED_H.compact;
  const pad = narrow ? 14 : 18;
  const hasShows = artist.shows.length > 0;
  const loadingArtist = loading === "artist";

  const Player = (
    <div style={{ marginTop: 22 }}>
      <window.ArtistEmbed name={name} spotifyId={artist.spotifyId} direction={direction}
        height={eh} loading={loading === "embed"} bg={embedBg}
        skipTo={hasShows ? "upcoming" : null}/>
    </div>
  );
  const Shows = (
    <div style={{ marginTop: 24 }}>
      {hasShows
        ? <window.UpcomingShows artist={artist} name={name}/>
        : <window.EmptyUpcoming name={name} following={following} signedOut={signedOut}/>}
    </div>
  );
  const Past = artist.past && artist.past.length
    ? <div style={{ marginTop: 26 }}><window.PastShows artist={artist} name={name}/></div>
    : null;

  return (
    <div className="ap-page" style={{
      position: "relative", width: "100%", height: "100%", overflow: "hidden",
      background: "var(--bg)", color: "var(--fg)", fontFamily: "Inter, system-ui" }}>
      {scrolled && <window.StickyBar name={name} following={following} compact={!deviceChrome}
        showFollow={hasShows}/>}
      <main aria-label={ARTIST_COPY.pageAria(name)}>
        <div style={{ position: "relative" }}>
          {loadingArtist
            ? <window.HeroSkeleton height={heroH}/>
            : <window.ArtistPlate name={name} photo={artist.photo} height={heroH}/>}
          <window.BackChip top={deviceChrome ? 56 : 14}/>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 80,
            background: "linear-gradient(transparent, var(--bg))", pointerEvents: "none" }}/>
        </div>

        <div style={{ position: "relative", padding: `0 ${pad}px 48px`, marginTop: -26 }}>
          {loadingArtist ? (
            <>
              <window.TextSkeleton w="72%" h={30}/>
              <window.TextSkeleton w="94%" h={11} mt={16}/>
              <window.TextSkeleton w="66%" h={11} mt={8}/>
              <div className="ap-skel" style={{ height: 48, borderRadius: 10, marginTop: 20 }}/>
              <div style={{ marginTop: 30 }}><window.ShowsSkeleton rows={3}/></div>
            </>
          ) : (
            <>
              <h1 style={{ margin: 0, fontFamily: "Inter, system-ui", fontWeight: 900,
                fontSize: narrow ? 27 : 31, lineHeight: 1.08, letterSpacing: "-0.035em",
                color: "var(--fg)", textWrap: "balance" }}>{name}</h1>
              <window.HistoryLine artist={artist}/>
              {hasShows && (
                <div style={{ marginTop: 18 }}>
                  <window.FollowBlock name={name} following={following} signedOut={signedOut}/>
                </div>
              )}
              {hasShows ? <>{Player}{Shows}{Past}</> : <>{Shows}{Past}{Player}</>}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Desktop ─────────────────────────────────────────────────────────────────
// Same components, same states, same order rule. The left rail (plate + follow)
// is position:sticky, so the follow is on screen for the whole scroll — that IS
// the desktop answer to "where does follow go on scroll", and it's why desktop
// has no sub-header. The empty block therefore doesn't carry its own button.
function ArtistPageDesktop({
  artist, following = false, signedOut = false, loading = "none",
  direction = "mat", embedHeight, embedBg, scrollTop = 0,
}) {
  const name = artist.name;
  const hasShows = artist.shows.length > 0;
  const eh = embedHeight || window.EMBED_H.compact;
  const loadingArtist = loading === "artist";
  const scroller = React.useCallback((el) => {
    if (el && scrollTop) el.scrollTop = scrollTop;
  }, [scrollTop]);

  const Player = (
    <div style={{ marginTop: 26 }}>
      <window.ArtistEmbed name={name} spotifyId={artist.spotifyId} direction={direction}
        height={eh} loading={loading === "embed"} bg={embedBg}
        skipTo={hasShows ? "upcoming" : null}/>
    </div>
  );
  const Shows = (
    <div style={{ marginTop: 30 }}>
      {hasShows
        ? <window.UpcomingShows artist={artist} name={name}/>
        : <window.EmptyUpcoming name={name} following={following} signedOut={signedOut}
            inlineFollow={false}/>}
    </div>
  );
  const Past = artist.past && artist.past.length
    ? <div style={{ marginTop: 34 }}><window.PastShows artist={artist} name={name}/></div>
    : null;

  return (
    <div ref={scroller} className="ap-page" style={{
      width: "100%", height: "100%", overflowY: "auto", background: "var(--bg)",
      color: "var(--fg)", fontFamily: "Inter, system-ui" }}>
      <main aria-label={ARTIST_COPY.pageAria(name)}
        style={{ maxWidth: 940, margin: "0 auto", padding: "34px 40px 60px" }}>
        <window.Crumb name={name}/>
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 40,
          alignItems: "start" }}>
          <div style={{ position: "sticky", top: 24 }}>
            <div style={{ borderRadius: 14, overflow: "hidden", height: 320 }}>
              {loadingArtist
                ? <window.HeroSkeleton height={320}/>
                : <window.ArtistPlate name={artist.name} photo={artist.photo} height={320}/>}
            </div>
            <div style={{ marginTop: 16 }}>
              {loadingArtist
                ? <div className="ap-skel" style={{ height: 48, borderRadius: 10 }}/>
                : <window.FollowBlock name={name} following={following} signedOut={signedOut}/>}
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            {loadingArtist ? (
              <>
                <window.TextSkeleton w="60%" h={40}/>
                <window.TextSkeleton w="92%" h={12} mt={18}/>
                <window.TextSkeleton w="58%" h={12} mt={8}/>
                <div style={{ marginTop: 34 }}><window.ShowsSkeleton rows={4}/></div>
              </>
            ) : (
              <>
                <h1 style={{ margin: 0, fontFamily: "Inter, system-ui", fontWeight: 900,
                  fontSize: 42, lineHeight: 1.04, letterSpacing: "-0.04em", color: "var(--fg)",
                  textWrap: "balance" }}>{name}</h1>
                <div style={{ maxWidth: 560 }}><window.HistoryLine artist={artist}/></div>
                {hasShows ? <>{Player}{Shows}{Past}</> : <>{Shows}{Past}{Player}</>}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

Object.assign(window, { ArtistPageMobile, ArtistPageDesktop, AP_HERO_H, AP_NARROW_BP });

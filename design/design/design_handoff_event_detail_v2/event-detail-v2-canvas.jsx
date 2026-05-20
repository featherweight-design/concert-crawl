// Event Detail v2 — design canvas (final)
// Single chosen layout: Modular cards.
// Sections: hero artboard (the screen itself), Watch button states,
// price-state matrix.

// Small helper for the chip-variants artboard — surfaces a PriceChip alongside
// a description, so the reviewer can see the per-tier treatment in one row.
function ChipRow({ label, sublabel, price }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{
        width: 90, flexShrink: 0,
        display: "flex", justifyContent: "flex-start",
      }}>
        {price && window.PriceChip
          ? <window.PriceChip price={price}/>
          : <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
              color: "var(--fg-subtle)", letterSpacing: "0.04em",
            }}>—</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13,
          color: "var(--fg)", letterSpacing: "-0.005em",
        }}>{label}</span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: "var(--fg-subtle)", letterSpacing: "0.04em",
        }}>{sublabel}</span>
      </div>
    </div>
  );
}

function EventDetailV2Canvas({ theme = "electric" }) {
  const eventBase = window.EV2_EVENT;
  const states = window.EV2_PRICE_BY_STATE || {};

  const stateRow = [
    { id: "primary",   label: "Primary (rare)",   sublabel: "Structured venue data — rare under the May-2026 strategy. Kept in the matrix for engineering coverage.",       get: states.default },
    { id: "community", label: "Community",        sublabel: "Default fan submission, no box-office origin. Azure pill, fan handle attribution.",                          get: states.community },
    { id: "resale",    label: "Resale (no box office)", sublabel: "Only resale data available. Warning pill, markup-vs-face when known. Falls below box office when both exist.", get: states.resale },
    { id: "verified",  label: "Verified",         sublabel: "Community + peer verification. Footer stamp credits the verifier.",                                            get: states.verified },
    { id: "stale",     label: "Stale (>24h)",     sublabel: "Last observation >24h ago. Warning dot on timestamp; works across any tier.",                                  get: states.stale },
    { id: "soldout",   label: "Sold out (community-reported)", sublabel: "Sold-out is itself a community claim now. SOLD OUT pill on price + 'Reported sold out by @amelia · 3 confirmed' attribution.", get: states.soldout },
    { id: "none",      label: "No price yet",     sublabel: "Community-handoff card. Submit-a-price as the focal action; Visit Venue Website as the CTA fallback.",        get: states.none },
  ];

  // Phase 7.2 — box-office tier sub-states. Each pulls its own venue/date/etc
  // from the underlying event so the attribution line ("Bought at {Venue} box
  // office") matches the show on the screen, not whatever the base event is.
  // Per May-13 spec revision: only BOUGHT submissions earn gold tier. SAW
  // submissions — even in-person at the box office — are community tier with
  // a box-office origin context line.
  const ev = window.PHASE7_EVENTS || {};
  const goldRow = [
    { id: "bo-bought",  label: "Bought in person", sublabel: "Gold tier. Card gets the gold frame; attribution reads 'Bought at … by @hugh'. Alternate sources (TM, resale) stacked below — fan has the option to pay for convenience.",  src: ev.bigThief },
    { id: "bo-phone",   label: "Bought by phone",  sublabel: "Still gold tier (a ticket was purchased). Attribution suffixes '· by phone'. Same card treatment.",                                                                  src: ev.ldr },
  ];
  const communityBoxOriginRow = [
    { id: "bo-saw",     label: "Saw at venue (community)", sublabel: "Passive observation — no purchase. Community tier (azure card), but the box-office origin is named: 'Saw at Gothic box office · in person'.",  src: ev.julien },
    { id: "bo-called",  label: "Called the venue (community)", sublabel: "Phone observation — no purchase. Lowest-effort box-office signal. Community card with 'Called the Mission box office · by phone' context.",  src: ev.cigarettes },
  ];

  // Theme tokens applied to the watch-state stage backgrounds so they
  // pick up the active theme without an extra ThemeProvider wrapper.
  const themeStyle = window.CC_THEMES
    ? Object.fromEntries(Object.entries(window.CC_THEMES[theme].tokens).map(([k,v]) => [`--${k}`, v]))
    : {};

  return (
    <window.DesignCanvas>
      <window.DCSection
        id="screen"
        title="Event Detail v2 — Modular cards"
        subtitle="Final design. Modular surfaces: spacious price card, dedicated setlist card, Watch CTA + watching count under the title. Heart removed (May-13) — Watch CTA carries the subscribe intent. Confirmed Beta-bound."
      >
        <window.DCArtboard id="screen-default" label="Screen · default (393×852 viewport)" width={480} height={1020}>
          <window.EV2_VariantFrame
            Variant={window.EventDetail}
            event={eventBase}
            theme={theme}
            label="Mobile · 393×852"
            sublabel="Default state on Electric Callboy at Mission Ballroom — vendor-tier price card (primary, rare under May-26 strategy), watching count under the title, no save heart."
          />
        </window.DCArtboard>
      </window.DCSection>

      <window.DCSection
        id="full-scroll"
        title="Full screen scroll · mobile"
        subtitle="The entire content stack from hero to related shows, rendered without the iOS frame's internal scroll so every block is visible at once. Useful for spacing checks across the modular cards."
      >
        <window.DCArtboard id="full-scroll-mobile" label="Full content · 393 wide" width={460} height={2160}>
          <div style={{
            ...themeStyle,
            width: 393, margin: "0 auto",
            background: "var(--bg)", color: "var(--fg)",
            display: "flex", flexDirection: "column",
            minHeight: "100%",
            boxShadow: "0 0 0 1px var(--border)",
            borderRadius: 12, overflow: "hidden",
          }}>
            <window.EventDetail event={eventBase} chrome="none"/>
          </div>
        </window.DCArtboard>
      </window.DCSection>

      <window.DCSection
        id="desktop"
        title="Desktop · top bar + centered column"
        subtitle="Desktop adaptation: full-bleed hero, sticky concertcrawl. top bar, centered 880-wide content column on a 1440 viewport (~30% margin on each side). Per Hugh's May-13 feedback: the staging page renders this content LEFT-aligned at wide widths — fixed here with `margin: 0 auto`. Same modular components as mobile; layout is the only adaptation. 2-col info grid + 3-up related shows take advantage of the wider canvas."
      >
        <window.DCArtboard id="desktop-default" label="Desktop · 1440 viewport, vendor (primary) tier" width={1480} height={1880}>
          <div style={{
            ...themeStyle,
            width: 1440, margin: "0 auto",
            background: "var(--bg)", color: "var(--fg)",
            boxShadow: "0 0 0 1px var(--border)",
            borderRadius: 12, overflow: "hidden",
          }}>
            <window.EventDetailDesktop event={eventBase}/>
          </div>
        </window.DCArtboard>
        <window.DCArtboard id="desktop-boxoffice" label="Desktop · box-office tier (Big Thief at Mission)" width={1480} height={1880}>
          <div style={{
            ...themeStyle,
            width: 1440, margin: "0 auto",
            background: "var(--bg)", color: "var(--fg)",
            boxShadow: "0 0 0 1px var(--border)",
            borderRadius: 12, overflow: "hidden",
          }}>
            <window.EventDetailDesktop event={(() => {
              const src = ev.bigThief || {};
              return {
                ...eventBase,
                artist: src.artist, title: src.title,
                venue: src.venue, venueShort: src.venueShort,
                date: src.date, doors: src.doors, showTime: src.showTime,
                genre: src.genre, ages: src.ages,
                description: src.description,
                price: src.price,
              };
            })()}/>
          </div>
        </window.DCArtboard>
      </window.DCSection>

      <window.DCSection
        id="trust-hierarchy"
        title="Trust hierarchy · quick reference"
        subtitle="From most to least authoritative. Same pill shape, distinct color. Box office is new top tier as of May 13 — it's the most honest number a fan can pay (face value, no fees, sourced at the venue)."
      >
        <window.DCArtboard id="hierarchy" label="Tier marks side by side" width={640} height={220}>
          <div style={{
            ...themeStyle, padding: 28, height: "100%", boxSizing: "border-box",
            display: "flex", flexDirection: "column", justifyContent: "center", gap: 14,
            background: "var(--bg)", color: "var(--fg)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <window.TrustMark kind="boxoffice"/>
              <span style={{ fontFamily: "Inter, system-ui", fontSize: 13, color: "var(--fg-muted)" }}>
                <b style={{ color: "var(--fg)" }}>Box office.</b>{" "}
                Face value, no fees. A fan BOUGHT a ticket from the venue. Always wins the headline slot when fresh.
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <window.TrustMark kind="community"/>
              <span style={{ fontFamily: "Inter, system-ui", fontSize: 13, color: "var(--fg-muted)" }}>
                <b style={{ color: "var(--fg)" }}>Community.</b>{" "}
                Any other fan submission — including box-office observations without purchase. Two confirms moves it out of pending.
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <window.TrustMark kind="resale"/>
              <span style={{ fontFamily: "Inter, system-ui", fontSize: 13, color: "var(--fg-muted)" }}>
                <b style={{ color: "var(--fg)" }}>Resale.</b>{" "}
                Secondary market. Coral pill — distinct hue family from gold so the two never read as variants of each other.
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <window.TrustMark kind="primary"/>
              <span style={{ fontFamily: "Inter, system-ui", fontSize: 13, color: "var(--fg-muted)" }}>
                <b style={{ color: "var(--fg)" }}>Vendor.</b>{" "}
                Scraped structured data from the venue or ticketing site — rare under the May-2026 strategy. Muted neutral so it doesn't compete with community/box-office submissions.
              </span>
            </div>
          </div>
        </window.DCArtboard>
        <window.DCArtboard id="chip-variants" label="On browse cards · PriceChip" width={520} height={200}>
          <div style={{
            ...themeStyle, padding: 28, height: "100%", boxSizing: "border-box",
            display: "flex", flexDirection: "column", justifyContent: "center", gap: 16,
            background: "var(--bg)", color: "var(--fg)",
          }}>
            <ChipRow label="Box office" sublabel="Gold star → the price IS the signal"
                     price={states.boBought && states.boBought()}/>
            <ChipRow label="Community" sublabel="C letter · fan-reported"
                     price={states.community && states.community()}/>
            <ChipRow label="Resale" sublabel="R letter · secondary market (coral)"
                     price={states.resale && states.resale()}/>
            <ChipRow label="Vendor (primary)" sublabel="no tell · scraped venue data"
                     price={states.default && states.default()}/>
          </div>
        </window.DCArtboard>
      </window.DCSection>

      <window.DCSection
        id="box-office-tier"
        title="Box-office tier (gold) · purchased submissions"
        subtitle="Only BOUGHT submissions earn the gold tier. A fan bought a ticket from the venue — face value, no fees, the most honest number on the card. In-person and by-phone variants share the gold-framed card; the attribution verb names the act."
      >
        {goldRow.map(b => {
          const src = b.src || {};
          const ev = {
            ...eventBase,
            artist: src.artist || eventBase.artist,
            title: src.title || eventBase.title,
            venue: src.venue || eventBase.venue,
            venueShort: src.venueShort || eventBase.venueShort,
            neighborhood: src.neighborhood || eventBase.neighborhood,
            date: src.date || eventBase.date,
            doors: src.doors || eventBase.doors,
            showTime: src.showTime || eventBase.showTime,
            genre: src.genre || eventBase.genre,
            ages: src.ages || eventBase.ages,
            description: src.description || eventBase.description,
            price: src.price || null,
          };
          return (
            <window.DCArtboard key={b.id} id={b.id} label={b.label} width={480} height={1020}>
              <window.EV2_VariantFrame
                Variant={window.EventDetail}
                event={ev}
                theme={theme}
                label={b.label}
                sublabel={b.sublabel}
              />
            </window.DCArtboard>
          );
        })}
      </window.DCSection>

      <window.DCSection
        id="community-box-origin"
        title="Community tier · box-office origin"
        subtitle="SAW submissions — even at the box office, even in person — are community tier, not gold. A fan didn't buy a ticket, they just observed a number. The community card surfaces the box-office origin as context ('Saw at Mission box office · in person' / 'Called the Mission box office · by phone') so the source isn't lost, but the trust hierarchy stays honest: only purchases prove a price."
      >
        {communityBoxOriginRow.map(b => {
          const src = b.src || {};
          const ev = {
            ...eventBase,
            artist: src.artist || eventBase.artist,
            title: src.title || eventBase.title,
            venue: src.venue || eventBase.venue,
            venueShort: src.venueShort || eventBase.venueShort,
            neighborhood: src.neighborhood || eventBase.neighborhood,
            date: src.date || eventBase.date,
            doors: src.doors || eventBase.doors,
            showTime: src.showTime || eventBase.showTime,
            genre: src.genre || eventBase.genre,
            ages: src.ages || eventBase.ages,
            description: src.description || eventBase.description,
            price: src.price || null,
          };
          return (
            <window.DCArtboard key={b.id} id={b.id} label={b.label} width={480} height={1020}>
              <window.EV2_VariantFrame
                Variant={window.EventDetail}
                event={ev}
                theme={theme}
                label={b.label}
                sublabel={b.sublabel}
              />
            </window.DCArtboard>
          );
        })}
      </window.DCSection>

      <window.DCSection
        id="watch-states"
        title="Watch button · states"
        subtitle="Reduced-weight outline button under the title. Active reveals a check; tapping it again opens an inline 'Stop watching' confirm — reversible, no modal."
      >
        <window.DCArtboard id="watch-inactive" label="Inactive (default)" width={420} height={120}>
          <div style={{
            ...themeStyle, padding: 24, height: "100%",
            display: "flex", alignItems: "center",
            background: "var(--bg)", color: "var(--fg)",
          }}>
            <window.WatchShowButton initialActive={false} count={14}/>
          </div>
        </window.DCArtboard>
        <window.DCArtboard id="watch-active" label="Active (watching)" width={420} height={120}>
          <div style={{
            ...themeStyle, padding: 24, height: "100%",
            display: "flex", alignItems: "center",
            background: "var(--bg)", color: "var(--fg)",
          }}>
            <window.WatchShowButton initialActive={true} count={14}/>
          </div>
        </window.DCArtboard>
        <window.DCArtboard id="watch-confirm" label="Stop watching · inline confirm" width={420} height={120}>
          <div style={{
            ...themeStyle, padding: 24, height: "100%",
            display: "flex", alignItems: "center",
            background: "var(--bg)", color: "var(--fg)",
          }}>
            <window.WatchConfirmDemo/>
          </div>
        </window.DCArtboard>
      </window.DCSection>

      <window.DCSection
        id="cta-variants"
        title="Get Tickets CTA · copy variants"
        subtitle="The primary button always renders. When we have a direct deep-link from the ticketing source it reads 'Get Tickets'; when we don't, it falls back to the venue website and reads 'Visit Venue Website'. Both variants share the same 48px × full-width slot — no layout shift when copy swaps. Sold out is the only state that changes the button shape (separate `SoldOutCTA`)."
      >
        <window.DCArtboard id="cta-direct" label="Direct · Get Tickets ↗" width={420} height={140}>
          <div style={{
            ...themeStyle, padding: 24, height: "100%", boxSizing: "border-box",
            display: "flex", alignItems: "center",
            background: "var(--bg)", color: "var(--fg)",
          }}>
            <div style={{ width: "100%" }}>
              <window.PrimaryCTA variant="direct" href="#"/>
            </div>
          </div>
        </window.DCArtboard>
        <window.DCArtboard id="cta-venue" label="Fallback · Visit Venue Website ↗" width={420} height={140}>
          <div style={{
            ...themeStyle, padding: 24, height: "100%", boxSizing: "border-box",
            display: "flex", alignItems: "center",
            background: "var(--bg)", color: "var(--fg)",
          }}>
            <div style={{ width: "100%" }}>
              <window.PrimaryCTA variant="venue" href="#"/>
            </div>
          </div>
        </window.DCArtboard>
        <window.DCArtboard id="cta-soldout" label="Sold out · disabled" width={420} height={140}>
          <div style={{
            ...themeStyle, padding: 24, height: "100%", boxSizing: "border-box",
            display: "flex", alignItems: "center",
            background: "var(--bg)", color: "var(--fg)",
          }}>
            <div style={{ width: "100%" }}>
              <window.SoldOutCTA/>
            </div>
          </div>
        </window.DCArtboard>
      </window.DCSection>

      <window.DCSection
        id="price-states"
        title="Other price states"
        subtitle="Beyond box office: every other shape engineering must handle. Primary tier is rare under the May-2026 strategy; community + resale + verified + stale are the working set; sold-out is itself a community claim now (no API tells us a show is gone); no-price-yet is the community-handoff card."
      >
        {stateRow.map(s => {
          // No-price events typically don't have a direct ticketUrl either —
          // drop it so the matrix shows the venue-fallback CTA in context.
          const ev = s.id === "none"
            ? { ...eventBase, price: null, ticketUrl: null }
            : { ...eventBase, price: s.get ? s.get() : null };
          return (
            <window.DCArtboard key={s.id} id={`state-${s.id}`} label={s.label} width={480} height={1020}>
              <window.EV2_VariantFrame
                Variant={window.EventDetail}
                event={ev}
                theme={theme}
                label={s.label}
                sublabel={s.sublabel || ""}
              />
            </window.DCArtboard>
          );
        })}
      </window.DCSection>
    </window.DesignCanvas>
  );
}

window.EventDetailV2Canvas = EventDetailV2Canvas;

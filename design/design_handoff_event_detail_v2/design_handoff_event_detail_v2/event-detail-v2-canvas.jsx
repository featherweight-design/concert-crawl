// Event Detail v2 — design canvas (final)
// Single chosen layout: Modular cards.
// Sections: hero artboard (the screen itself), Watch button states,
// price-state matrix.

function EventDetailV2Canvas({ theme = "electric" }) {
  const eventBase = window.EV2_EVENT;
  const states = window.EV2_PRICE_BY_STATE || {};

  const stateRow = [
    { id: "drift",     label: "Drift / default", get: states.default },
    { id: "drop",      label: "Drop",            get: states.drop },
    { id: "soldout",   label: "Sold out",        get: states.soldout },
    { id: "resale",    label: "Resale",          get: states.resale },
    { id: "community", label: "Community",       get: states.community },
    { id: "stale",     label: "Stale (>24h)",    get: states.stale },
    { id: "verified",  label: "Verified",        get: states.verified },
    { id: "none",      label: "No price yet",    get: states.none },
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
        subtitle="Final design. Modular surfaces: spacious price card, dedicated setlist card, Watch CTA + watching count under the title (separate from the Save heart). Confirmed Beta-bound."
      >
        <window.DCArtboard id="screen-default" label="Screen · default" width={480} height={1020}>
          <window.EV2_VariantFrame
            Variant={window.EventDetail}
            event={eventBase}
            theme={theme}
            label="Mobile · 393×852"
            sublabel="Default state on Electric Callboy at the Ogden — primary face price + sparkline + breakdown, watching count under the title."
          />
        </window.DCArtboard>
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
        id="price-states"
        title="Price states"
        subtitle="Same Modular layout, every price shape engineering needs to handle. Resale (warning) and Community (azure) wear inline trust marks next to the headline price; Stale shows the warning dot on the timestamp; Verified attaches a verification stamp in the footer; Sold out renders a SOLD OUT pill on the price and a disabled 'Sold out' button below."
      >
        {stateRow.map(s => {
          const ev = { ...eventBase, price: s.get ? s.get() : null };
          return (
            <window.DCArtboard key={s.id} id={`state-${s.id}`} label={s.label} width={480} height={1020}>
              <window.EV2_VariantFrame
                Variant={window.EventDetail}
                event={ev}
                theme={theme}
                label={s.label}
                sublabel=""
              />
            </window.DCArtboard>
          );
        })}
      </window.DCSection>
    </window.DesignCanvas>
  );
}

window.EventDetailV2Canvas = EventDetailV2Canvas;

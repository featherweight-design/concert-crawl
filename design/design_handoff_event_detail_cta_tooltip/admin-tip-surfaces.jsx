// admin-tip-surfaces.jsx — the tooltip gallery specimen.
//
// The admin artboards render the REAL First-Timer form (`GuideAdminBlock` from
// design_handoff_venue_first_timer_guide/guide-admin.jsx, copied into this
// folder) — the ⓘs are threaded into that component via its new `tip` prop.
// Nothing here re-implements it.
//
// The "before" artboard renders the real `ChipStateLegend` — the card being
// retired. Its rows are reproduced verbatim in TIP_CONTENT["chip-states"].
//
// Exports: TipSpecimen

const ATS_UI = "Inter, system-ui, sans-serif";
const ATS_MONO = "'JetBrains Mono', ui-monospace, monospace";

// Renders one variant's popover statically, with the trigger it hangs off,
// so all six shapes can be compared side by side.
function TipSpecimen({ tipKey, width }) {
  const tip = TIP_CONTENT[tipKey];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, fontFamily: ATS_UI }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          fontFamily: ATS_MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em",
          textTransform: "uppercase", color: "var(--signal)",
        }}>{tip.variant}</span>
        <span style={{ fontFamily: ATS_UI, fontSize: 12, color: "var(--fg-subtle)" }}>{tipKey}</span>
      </div>
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: ATS_UI, fontSize: 13, fontWeight: 600, color: "var(--fg-muted)" }}>Label it explains</span>
        <span style={{ position: "relative", display: "inline-flex" }}>
          <span style={{
            width: 26, height: 26, borderRadius: 999, display: "inline-flex",
            alignItems: "center", justifyContent: "center", color: "var(--signal)",
            background: "color-mix(in oklab, var(--signal) 12%, transparent)",
          }}><TipInfoIcon size={15}/></span>
          <CCTipPopover id={`spec-${tipKey}`} tip={tip} placement="bottom" align="start"
            width={width || (tip.variant === "text" || tip.variant === "titled" ? 272 : 320)}
            onClose={() => {}}/>
        </span>
      </div>
    </div>
  );
}

Object.assign(window, { TipSpecimen });

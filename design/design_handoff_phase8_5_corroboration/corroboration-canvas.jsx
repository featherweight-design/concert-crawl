// corroboration-canvas.jsx — design canvas for Phase 8.5
// Issue #556. Pending price, fan corroboration, dispute surfaces, fan event
// reporting.
//
// May 25 (Hugh's review) revisions baked in:
//   - Direction B (minimal row with mono tell) is the primary direction.
//     Direction A is kept as a single comparison artboard at the bottom.
//   - All artboards use the full Phase 8 submission shape: floor + ceiling
//     (range) + tier + vendor + trust kind.
//   - "Face value" framing only appears on box-office submissions.
//   - "Tickets available" only renders in the report sheet when a status
//     report is currently live.

function ArtboardWrap({ children, theme = "electric", padded = true, height = "auto", width = 393 }) {
  const themeStyle = window.CC_THEMES
    ? Object.fromEntries(Object.entries(window.CC_THEMES[theme].tokens).map(([k,v]) => [`--${k}`, v]))
    : {};
  return (
    <div style={{
      ...themeStyle,
      width, minHeight: height,
      padding: padded ? "18px 16px 20px" : 0,
      background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui, sans-serif",
      boxSizing: "border-box",
    }}>{children}</div>
  );
}

function ShowHeader({ artist = "Electric Callboy", venue = "Mission Ballroom · Sat, Aug 30" }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
        color: "var(--fg-subtle)", letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}>{venue}</div>
      <div style={{
        marginTop: 4,
        fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 22,
        color: "var(--fg)", letterSpacing: "-0.02em", lineHeight: 1.1,
      }}>{artist}</div>
    </div>
  );
}

// Sample submission payloads used across artboards. Mirrors the Phase 8
// submission shape exactly (floor, ceiling, tier, vendor, kind, optional
// action/method for box-office subtier).
const SAMPLE = {
  community: {
    floor: 48, ceiling: 58, tier: "GA", vendor: "AXS", kind: "community",
    submitter: { handle: "@hugh", url: "/u/hugh" },
    submittedAt: "2h ago",
    note: "GA standing — checked the cart on AXS. Showed $48 face, $58 with fees.",
  },
  communitySingle: {
    floor: 48, tier: "Reserved", vendor: "Ticketmaster", kind: "community",
    submitter: { handle: "@amelia", url: "/u/amelia" },
    submittedAt: "5h ago",
    note: "Single-section reserve, no range — checked the cart on TM.",
  },
  boxBought: {
    floor: 42, tier: "GA", vendor: "Venue box office", kind: "boxoffice",
    action: "bought", method: "in-person",
    submitter: { handle: "@hugh", url: "/u/hugh" },
    submittedAt: "yesterday",
    note: "Walked up to the Mission window, bought GA face. No fees.",
  },
  boxBoughtPhone: {
    floor: 38, tier: "GA", vendor: "Venue box office", kind: "boxoffice",
    action: "bought", method: "phone",
    submitter: { handle: "@kel", url: "/u/kel" },
    submittedAt: "3h ago",
    note: "Called the box office. Bought GA over the phone — no fees added.",
  },
  anonymous: {
    floor: 65, ceiling: 90, tier: "Reserved", vendor: "Ticketmaster", kind: "community",
    submitter: null,
    submittedAt: "4h ago",
    note: "Reserved seating range, checked TM cart for two sections.",
  },
};

function CorroborationCanvas({ theme = "electric" }) {
  return (
    <window.DesignCanvas>
      {/* ──────────────────────────────────────────────────── */}
      {/* SECTION 1 — Pending price · primary direction (B) */}
      {/* ──────────────────────────────────────────────────── */}
      <window.DCSection
        id="pending-price-b"
        title="Pending price · primary direction"
        subtitle="Direction B (minimal row with mono tell) chosen May 25. Card chrome matches a live PriceBlockB so the pending → live transition doesn't break the visual rhythm. Pending strip carries the mono tell + dot progress; below, the submission renders with its full Phase 8 shape — price (range when used), tier label, vendor line, optional submitter note, trust pill. Footer is the inline Confirm CTA (other fan view) or Edit/Withdraw (submitter view)."
      >
        <window.DCArtboard id="b-other" label="B · range · community · other fan" width={433} height={520}>
          <ArtboardWrap theme={theme}>
            <ShowHeader/>
            <window.PendingCardB {...SAMPLE.community} view="other"/>
          </ArtboardWrap>
        </window.DCArtboard>
        <window.DCArtboard id="b-submitter" label="B · range · community · submitter" width={433} height={520}>
          <ArtboardWrap theme={theme}>
            <ShowHeader/>
            <window.PendingCardB {...SAMPLE.community} view="submitter"/>
          </ArtboardWrap>
        </window.DCArtboard>
        <window.DCArtboard id="b-self-locked" label="B · self-confirm locked" width={433} height={520}>
          <ArtboardWrap theme={theme}>
            <ShowHeader/>
            <window.PendingCardB {...SAMPLE.community} view="self-locked"/>
          </ArtboardWrap>
        </window.DCArtboard>
      </window.DCSection>

      {/* ──────────────────────────────────────────────────── */}
      {/* SECTION 2 — Pending price · trust tiers */}
      {/* ──────────────────────────────────────────────────── */}
      <window.DCSection
        id="pending-trust-tiers"
        title="Pending price · trust tiers + submission shape"
        subtitle="The four submission inputs that change a pending card's chrome: trust tier (community vs box-office), price range (single vs floor–ceiling), tier (GA / Reserved / VIP / Pit / Lawn), and box-office subtier (bought in-person, bought by phone). Box-office submissions earn the gold tint + 'face value · no fees' framing — they're the only place that framing lives. Vendor and resale don't appear here because they aren't reachable through the fan submit flow (scrapers only)."
      >
        <window.DCArtboard id="tier-community-range" label="Community · range · GA" width={433} height={500}>
          <ArtboardWrap theme={theme}>
            <ShowHeader/>
            <window.PendingCardB {...SAMPLE.community} view="other"/>
          </ArtboardWrap>
        </window.DCArtboard>
        <window.DCArtboard id="tier-community-single" label="Community · single value · Reserved" width={433} height={500}>
          <ArtboardWrap theme={theme}>
            <ShowHeader/>
            <window.PendingCardB {...SAMPLE.communitySingle} view="other"/>
          </ArtboardWrap>
        </window.DCArtboard>
        <window.DCArtboard id="tier-box-bought" label="Box office · bought in person · GA" width={433} height={520}>
          <ArtboardWrap theme={theme} artist="Big Thief"
                        venue="Mission Ballroom · Mon, Sep 14">
            <ShowHeader artist="Big Thief" venue="Mission Ballroom · Mon, Sep 14"/>
            <window.PendingCardB {...SAMPLE.boxBought} view="other"/>
          </ArtboardWrap>
        </window.DCArtboard>
        <window.DCArtboard id="tier-box-phone" label="Box office · bought by phone · GA" width={433} height={520}>
          <ArtboardWrap theme={theme} artist="LDR" venue="Red Rocks · Sat, Sep 27">
            <ShowHeader artist="Lana Del Rey" venue="Red Rocks · Sat, Sep 27"/>
            <window.PendingCardB {...SAMPLE.boxBoughtPhone} view="other"/>
          </ArtboardWrap>
        </window.DCArtboard>
        <window.DCArtboard id="tier-anonymous" label="Community · anonymous fan · range" width={433} height={500}>
          <ArtboardWrap theme={theme}>
            <ShowHeader/>
            <window.PendingCardB {...SAMPLE.anonymous} view="other"/>
          </ArtboardWrap>
        </window.DCArtboard>
      </window.DCSection>

      {/* ──────────────────────────────────────────────────── */}
      {/* SECTION 3 — Confirmation progress states */}
      {/* ──────────────────────────────────────────────────── */}
      <window.DCSection
        id="pending-progress"
        title="Confirmation progress · pending card across the corroboration loop"
        subtitle="How the pending card responds to confirmation progress. Three states: fresh (0/2), in-flight (1/2 — the canonical state most fans land in), and ready-to-live (2/2 — a transient state in the moment between the second confirm landing and the card flipping to its live PriceBlockB rendering)."
      >
        {[
          { id: "fresh", label: "0 of 2 · fresh", confirms: 0 },
          { id: "midway", label: "1 of 2 · canonical", confirms: 1 },
          { id: "ready", label: "2 of 2 · ready to live", confirms: 2 },
        ].map(s => (
          <window.DCArtboard key={s.id} id={`progress-${s.id}`} label={s.label} width={433} height={460}>
            <ArtboardWrap theme={theme}>
              <ShowHeader/>
              <window.PendingCardB {...SAMPLE.community} view="other" confirms={s.confirms}/>
            </ArtboardWrap>
          </window.DCArtboard>
        ))}
      </window.DCSection>

      {/* ──────────────────────────────────────────────────── */}
      {/* SECTION 4 — Corroboration sheet */}
      {/* ──────────────────────────────────────────────────── */}
      <window.DCSection
        id="corroboration-sheet"
        title="Corroboration sheet · friction by design"
        subtitle="Tapping Confirm opens a full-screen sheet that requires the fan to indicate HOW they're confirming — not just a tap-through. Per Hugh's May 25 note: 'entice people to actually verify prices versus just hitting confirm out of laziness.' Four method options map to three schema values: same-vendor / other-vendor / box-office (saw vs bought). The 'bought at box office' path confirms the current submission AND opens a follow-up SubmitPriceModal pre-filled as a fresh gold-tier box-office submission, so a purchase is captured separately. Sheet accent follows the submission's tier — community submissions get azure, box-office submissions get gold."
      >
        <window.DCArtboard id="sheet-community" label="Sheet · community submission · 'same vendor' selected" width={433} height={880}>
          <div style={{ padding: 20 }}>
            <window.CorroborationSheet
              theme={theme}
              {...SAMPLE.community}
              state="fresh"
              selected="same-vendor"
            />
          </div>
        </window.DCArtboard>
        <window.DCArtboard id="sheet-box-saw" label="Sheet · box-office submission · 'saw at box office' selected (gold accent)" width={433} height={880}>
          <div style={{ padding: 20 }}>
            <window.CorroborationSheet
              theme={theme}
              {...SAMPLE.boxBought}
              state="fresh"
              selected="box-office-saw"
            />
          </div>
        </window.DCArtboard>
        <window.DCArtboard id="sheet-box-bought" label="Sheet · 'bought at box office' selected · branches into follow-up SubmitPriceModal" width={433} height={880}>
          <div style={{ padding: 20 }}>
            <window.CorroborationSheet
              theme={theme}
              {...SAMPLE.community}
              state="fresh"
              selected="box-office-bought"
            />
          </div>
        </window.DCArtboard>
        <window.DCArtboard id="sheet-self-locked" label="Sheet · self-confirm locked" width={433} height={700}>
          <div style={{ padding: 20 }}>
            <window.CorroborationSheet
              theme={theme}
              {...SAMPLE.community}
              state="self-locked"
            />
          </div>
        </window.DCArtboard>
      </window.DCSection>

      {/* ──────────────────────────────────────────────────── */}
      {/* SECTION 5 — Dispute indicator + counter-submit sheet */}
      {/* ──────────────────────────────────────────────────── */}
      <window.DCSection
        id="dispute"
        title="Dispute indicator · everyone sees it, reframed as 'price update'"
        subtitle="When a corroborated price is being challenged, the live card surfaces it as an update — not an alarm. Color is intentionally neutral (--fg-muted, dashed border) so it doesn't compete with the resale-coral or sold-out warning. The counter-submit sheet mirrors the Phase 8 SubmitForm exactly (floor + ceiling + tier chips + vendor chips), but with the copy reframed: 'Submit update', signal-toned CTA. Same mechanic as Phase 8's dispute form, friendlier frame."
      >
        <window.DCArtboard id="disputed-card" label="Live priced card · dispute indicator" width={433} height={400}>
          <ArtboardWrap theme={theme}>
            <ShowHeader/>
            <window.DisputedPriceCard
              floor={48} ceiling={58} tier="GA" vendor="AXS"
              kind="community"
              submitter={{ handle: "@hugh", url: "/u/hugh" }}
              observedAt="yesterday"
              disputeBy={{ handle: "@kel" }}
              disputeAt="1h ago"
              disputedFloor={65} disputedCeiling={80}
            />
          </ArtboardWrap>
        </window.DCArtboard>
        <window.DCArtboard id="counter-sheet" label="Counter-submit sheet · Phase 8 form shape, update framing" width={433} height={900}>
          <div style={{ padding: 20 }}>
            <window.CounterSubmitSheet
              theme={theme}
              currentFloor={48} currentCeiling={58} currentVendor="AXS"
              newFloor="65" newCeiling="80"
              selectedTier="GA" selectedVendor="AXS"
            />
          </div>
        </window.DCArtboard>
      </window.DCSection>

      {/* ──────────────────────────────────────────────────── */}
      {/* SECTION 6 — Admin dispute resolution */}
      {/* ──────────────────────────────────────────────────── */}
      <window.DCSection
        id="admin-dispute"
        title="Admin dispute resolution"
        subtitle="When multiple submissions exist for the same show, admin sees them side-by-side. Either entry can be promoted; the loser is archived (not deleted) with a reason that's shown to both submitters. No penalty to either fan — disputes are updates, not violations. Admins also have an override path here (per Hugh's May 25 call) to promote ANY status report immediately rather than waiting on the 2-fan gate."
      >
        <window.DCArtboard id="admin-counter-wins" label="Resolution · promoting the counter" width={820} height={720}>
          <div style={{ padding: 30 }}>
            <window.AdminDisputePanel theme={theme} winner="counter"/>
          </div>
        </window.DCArtboard>
        <window.DCArtboard id="admin-original-wins" label="Resolution · keeping the original" width={820} height={720}>
          <div style={{ padding: 30 }}>
            <window.AdminDisputePanel theme={theme} winner="original"/>
          </div>
        </window.DCArtboard>
      </window.DCSection>

      {/* ──────────────────────────────────────────────────── */}
      {/* SECTION 6b — Admin queues (BLOCKING per eng review May 25 r2) */}
      {/* ──────────────────────────────────────────────────── */}
      <window.DCSection
        id="admin-queues"
        title="Admin queues · price disputes + status reports"
        subtitle="Two new auto-hiding sections that get appended to the existing Review page (below 'Price coverage'). A pending counter-submission or status report that doesn't reach 2 fan confirms needs an admin path — these queues surface them across all events with a one-click 'Resolve →' that opens the per-event resolution panel. Visual chrome matches the existing Review page patterns (auto-hide-when-empty, same Panel + AdminTable primitives); engineering implements against admin-primitives.jsx, not the inline copies shown here."
      >
        <window.DCArtboard id="queue-price-disputes" label="Price disputes queue · sits below Price coverage in Review" width={1000} height={420}>
          <div style={{ padding: 24, background: "#f0eee9", minHeight: "100%" }}>
            <window.PriceDisputesQueue theme="light"/>
          </div>
        </window.DCArtboard>
        <window.DCArtboard id="queue-status-reports" label="Event status reports queue · filter chips for kind" width={1000} height={520}>
          <div style={{ padding: 24, background: "#f0eee9", minHeight: "100%" }}>
            <window.EventReportsQueue theme="light" activeFilter="all"/>
          </div>
        </window.DCArtboard>
        <window.DCArtboard id="queue-status-reports-filtered" label="Status reports queue · 'Cancelled' filter active" width={1000} height={460}>
          <div style={{ padding: 24, background: "#f0eee9", minHeight: "100%" }}>
            <window.EventReportsQueue theme="light" activeFilter="cancelled"/>
          </div>
        </window.DCArtboard>
        <window.DCArtboard id="resolve-report-counter" label="Per-event resolution · pending report + counter" width={860} height={760}>
          <div style={{ padding: 30, background: "#f0eee9", minHeight: "100%" }}>
            <window.EventReportResolutionPanel theme="light" hasCounter winner={null}/>
          </div>
        </window.DCArtboard>
        <window.DCArtboard id="resolve-report-promoting" label="Per-event resolution · promoting the report" width={860} height={760}>
          <div style={{ padding: 30, background: "#f0eee9", minHeight: "100%" }}>
            <window.EventReportResolutionPanel theme="light" hasCounter winner="report"/>
          </div>
        </window.DCArtboard>
        <window.DCArtboard id="resolve-report-no-counter" label="Per-event resolution · no counter filed" width={860} height={620}>
          <div style={{ padding: 30, background: "#f0eee9", minHeight: "100%" }}>
            <window.EventReportResolutionPanel theme="light" hasCounter={false} winner={null}/>
          </div>
        </window.DCArtboard>
      </window.DCSection>

      {/* ──────────────────────────────────────────────────── */}
      {/* SECTION 6c — Multi-tier price states */}
      {/* ──────────────────────────────────────────────────── */}
      <window.DCSection
        id="multi-tier"
        title="Multi-tier prices · the open question, answered"
        subtitle="Per engineering's May 25 r2 note: tier is display metadata, not a competing claim. GA $40 and VIP $100 are independent submissions, each going through their own 2-confirm gate. (1) Pending: two PendingCardB cards stack in the price-card slot — neither blocks the other. (2) Fully resolved: cheapest tier is the headline framed as 'from $40 · GA'; higher tier(s) render as TierAlternateRow below in the same rhythm as the cross-vendor alternates in PriceBlockB. (3) Mixed: one live, one still pending — the pending tier's alternate row shows a 'pending · 1/2' tell so the fan knows it's not yet confirmed."
      >
        <window.DCArtboard id="multi-pending" label="Two pending tiers · stacked cards · independent gates" width={433} height={840}>
          <ArtboardWrap theme={theme}>
            <ShowHeader/>
            <window.TwoPendingStack theme={theme}/>
          </ArtboardWrap>
        </window.DCArtboard>
        <window.DCArtboard id="multi-live" label="Two tiers resolved · 'from $40' headline + tier alternates" width={433} height={400}>
          <ArtboardWrap theme={theme}>
            <ShowHeader/>
            <window.MultiTierLiveCard/>
          </ArtboardWrap>
        </window.DCArtboard>
        <window.DCArtboard id="multi-live-three-tiers" label="Three tiers resolved · GA / Pit / VIP" width={433} height={440}>
          <ArtboardWrap theme={theme}>
            <ShowHeader/>
            <window.MultiTierLiveCard
              cheapestTier="GA"
              cheapestFloor={40}
              cheapestVendor="AXS"
              cheapestKind="community"
              alternates={[
                { tier: "Pit", floor: 75, vendor: "AXS", kind: "community", confirms: 2 },
                { tier: "VIP", floor: 100, vendor: "AXS", kind: "community", confirms: 2 },
              ]}
            />
          </ArtboardWrap>
        </window.DCArtboard>
        <window.DCArtboard id="multi-mixed" label="Mixed · GA live · VIP still pending in alt row" width={433} height={400}>
          <ArtboardWrap theme={theme}>
            <ShowHeader/>
            <window.MixedTierCard/>
          </ArtboardWrap>
        </window.DCArtboard>
        <window.DCArtboard id="multi-live-box-ga" label="Box-office GA headline · VIP community alternate" width={433} height={420}>
          <ArtboardWrap theme={theme} artist="Big Thief" venue="Mission Ballroom · Mon, Sep 14">
            <ShowHeader artist="Big Thief" venue="Mission Ballroom · Mon, Sep 14"/>
            <window.MultiTierLiveCard
              cheapestTier="GA"
              cheapestFloor={42}
              cheapestVendor="Venue box office"
              cheapestKind="boxoffice"
              alternates={[
                { tier: "Reserved", floor: 65, ceiling: 90, vendor: "AXS", kind: "community", confirms: 2 },
              ]}
            />
          </ArtboardWrap>
        </window.DCArtboard>
      </window.DCSection>

      {/* ──────────────────────────────────────────────────── */}
      {/* SECTION 7 — Event reporting CTA + sheet */}
      {/* ──────────────────────────────────────────────────── */}
      <window.DCSection
        id="report-entry"
        title="Event reporting · entry point + conditional sheet"
        subtitle="A single CTA at the bottom of the event detail page opens a bottom sheet. The sheet's options ADAPT to what's currently live for this show — 'Tickets available' only renders when there's a status report to counter (per Hugh's May 25 call). For a default upcoming show with no status, three options render: sold out, postponed, cancelled. For a show already marked sold out, the sheet shifts to 'Tickets available' (the counter) + 'Postponed' + 'Cancelled' (in case of escalation)."
      >
        <window.DCArtboard id="footer-link" label="Footer link · 'Report a status change'" width={433} height={220}>
          <div style={{ background: "var(--bg)" }}>
            <window.ReportFooterLink theme={theme}/>
          </div>
        </window.DCArtboard>
        <window.DCArtboard id="sheet-default" label="Report sheet · default show (no live status)" width={433} height={780}>
          <div style={{ padding: 20 }}>
            <window.ReportSheet theme={theme} selected="cancelled" liveStatus={null}/>
          </div>
        </window.DCArtboard>
        <window.DCArtboard id="sheet-soldout-live" label="Report sheet · show is live as 'sold out'" width={433} height={780}>
          <div style={{ padding: 20 }}>
            <window.ReportSheet theme={theme} selected="available" liveStatus="soldout"/>
          </div>
        </window.DCArtboard>
        <window.DCArtboard id="sheet-cancelled-live" label="Report sheet · show is live as 'cancelled'" width={433} height={620}>
          <div style={{ padding: 20 }}>
            <window.ReportSheet theme={theme} selected="available" liveStatus="cancelled"/>
          </div>
        </window.DCArtboard>
      </window.DCSection>

      {/* ──────────────────────────────────────────────────── */}
      {/* SECTION 8 — Evidence forms */}
      {/* ──────────────────────────────────────────────────── */}
      <window.DCSection
        id="evidence-forms"
        title="Evidence forms · 'How do you know?'"
        subtitle="After picking a report type, the fan answers a method radio + optional link + optional notes. Per Hugh's May 25 note: 'Did they get an email about the show cancelling? Did the artists announce something on their social?' — the form is built around producing something other fans can verify against. The submit button is colored by the report type so the fan sees the weight of what they're filing."
      >
        <window.DCArtboard id="evidence-cancelled" label="Evidence · cancelled" width={433} height={880}>
          <div style={{ padding: 20 }}>
            <window.EvidenceForm theme={theme} kind="cancelled" selected="social"
              link="https://instagram.com/p/Cz4rMnRPxLk"/>
          </div>
        </window.DCArtboard>
        <window.DCArtboard id="evidence-postponed" label="Evidence · postponed" width={433} height={880}>
          <div style={{ padding: 20 }}>
            <window.EvidenceForm theme={theme} kind="postponed" selected="email" link=""/>
          </div>
        </window.DCArtboard>
        <window.DCArtboard id="evidence-soldout" label="Evidence · sold out" width={433} height={880}>
          <div style={{ padding: 20 }}>
            <window.EvidenceForm theme={theme} kind="soldout" selected="venue-visit" link=""/>
          </div>
        </window.DCArtboard>
        <window.DCArtboard id="evidence-cancelled-imminent" label="Evidence · cancelled · show in 4 days (ER_POLICY · 3 confirms)" width={433} height={960}>
          <div style={{ padding: 20 }}>
            <window.EvidenceForm
              theme={theme} kind="cancelled" selected="email"
              link="" confirmsRequired={3} showDate="in 4 days"
            />
          </div>
        </window.DCArtboard>
      </window.DCSection>

      {/* ──────────────────────────────────────────────────── */}
      {/* SECTION 8b — ER_POLICY · 3-confirm threshold variant */}
      {/* ──────────────────────────────────────────────────── */}
      <window.DCSection
        id="er-policy"
        title="ER_POLICY · cancelled within 7 days needs 3 confirms"
        subtitle="Per engineering's May 25 confirmation: cancelled reports on shows < 7 days out require 3 confirms instead of 2. A wrong cancellation on an imminent show hides the event from upcoming, so the higher bar is proportionate. The pending banner reflects this with three dots in the progress strip and 'of 3' microcopy; the evidence form surfaces a warning panel so the reporter knows what they're signing up for."
      >
        <window.DCArtboard id="er-cancelled-3conf-pending" label="Pending · cancelled · 1 of 3 (imminent show)" width={433} height={580}>
          <ArtboardWrap theme={theme}>
            <div style={{ marginBottom: 16 }}>
              <window.PendingReportBanner
                kind="cancelled"
                evidence="Instagram post · @electric.callboy"
                view="other"
                confirms={1}
                needed={3}
              />
            </div>
            <ShowHeader venue="Mission Ballroom · Thu, May 28 (in 3 days)"/>
            <div style={{
              padding: "10px 12px",
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
              color: "var(--fg-subtle)", letterSpacing: "0.04em",
              textTransform: "uppercase", textAlign: "center", lineHeight: 1.6,
            }}>
              ER_POLICY · cancelled on show &lt; 7 days out →<br/>
              3 confirms instead of 2 · admin can still override
            </div>
          </ArtboardWrap>
        </window.DCArtboard>
        <window.DCArtboard id="er-cancelled-3conf-near" label="Pending · cancelled · 2 of 3 (one more to go)" width={433} height={580}>
          <ArtboardWrap theme={theme}>
            <div style={{ marginBottom: 16 }}>
              <window.PendingReportBanner
                kind="cancelled"
                evidence="Instagram post · @electric.callboy"
                view="other"
                confirms={2}
                needed={3}
              />
            </div>
            <ShowHeader venue="Mission Ballroom · Thu, May 28 (in 3 days)"/>
          </ArtboardWrap>
        </window.DCArtboard>
      </window.DCSection>

      {/* ──────────────────────────────────────────────────── */}
      {/* SECTION 9 — Pending event reports (in context) */}
      {/* ──────────────────────────────────────────────────── */}
      <window.DCSection
        id="pending-reports"
        title="Pending event reports · three types in context"
        subtitle="Sold-out, cancelled, and postponed each have distinct chrome but stay within the existing token palette. Sold-out lives where the price card lives (it IS price-adjacent). Cancelled and postponed reshape the whole event, so their pending state sits as a banner at the very top of the page, above the title."
      >
        <window.DCArtboard id="pending-soldout-other" label="Pending · sold out (other fan)" width={433} height={500}>
          <ArtboardWrap theme={theme}>
            <ShowHeader/>
            <window.PendingSoldOutCard
              view="other"
              evidence="AXS listing · ‘not available’"
            />
          </ArtboardWrap>
        </window.DCArtboard>
        <window.DCArtboard id="pending-cancelled-other" label="Pending · cancelled (banner above title)" width={433} height={580}>
          <ArtboardWrap theme={theme}>
            <div style={{ marginBottom: 16 }}>
              <window.PendingReportBanner
                kind="cancelled"
                evidence="Instagram post · @electric.callboy"
                view="other"
              />
            </div>
            <ShowHeader/>
            <div style={{
              padding: "10px 12px",
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
              color: "var(--fg-subtle)", letterSpacing: "0.04em",
              textTransform: "uppercase", textAlign: "center", lineHeight: 1.6,
            }}>
              Price card hidden while a cancelled report is pending →<br/>
              Confirming the report reshapes the whole page
            </div>
          </ArtboardWrap>
        </window.DCArtboard>
        <window.DCArtboard id="pending-postponed-other" label="Pending · postponed (banner above title)" width={433} height={580}>
          <ArtboardWrap theme={theme}>
            <div style={{ marginBottom: 16 }}>
              <window.PendingReportBanner
                kind="postponed"
                evidence="Email · Mission Ballroom · 'rescheduled to Nov 4'"
                view="other"
                reporter={{ handle: "@amelia" }}
                reportedAt="6h ago"
                confirms={1}
              />
            </div>
            <ShowHeader/>
            <div style={{
              padding: "10px 12px",
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
              color: "var(--fg-subtle)", letterSpacing: "0.04em",
              textTransform: "uppercase", textAlign: "center", lineHeight: 1.6,
            }}>
              Price card stays visible during pending postponed →<br/>
              Postponed isn't terminal · ticket may still apply
            </div>
          </ArtboardWrap>
        </window.DCArtboard>
        <window.DCArtboard id="pending-soldout-reporter" label="Pending · sold out (reporter)" width={433} height={500}>
          <ArtboardWrap theme={theme}>
            <ShowHeader/>
            <window.PendingSoldOutCard view="reporter" evidence="AXS listing · ‘not available’"/>
          </ArtboardWrap>
        </window.DCArtboard>
        <window.DCArtboard id="pending-cancelled-reporter" label="Pending · cancelled (reporter)" width={433} height={580}>
          <ArtboardWrap theme={theme}>
            <div style={{ marginBottom: 16 }}>
              <window.PendingReportBanner
                kind="cancelled"
                evidence="Instagram post · @electric.callboy"
                view="reporter"
              />
            </div>
            <ShowHeader/>
          </ArtboardWrap>
        </window.DCArtboard>
      </window.DCSection>

      {/* ──────────────────────────────────────────────────── */}
      {/* SECTION 10 — Confirm-report sheet */}
      {/* ──────────────────────────────────────────────────── */}
      <window.DCSection
        id="confirm-report-sheets"
        title="Confirm-report sheet · same friction pattern"
        subtitle="Status reports use the same corroboration shape as price submissions: a sheet that asks how the fan knows. The options are tailored to status (saw the source / have own evidence / heard from someone) rather than price (vendor / box office). The 'I think this is wrong' link routes to a counter-report through the same ReportSheet."
      >
        <window.DCArtboard id="confirm-cancelled" label="Confirm · cancelled" width={433} height={840}>
          <div style={{ padding: 20 }}>
            <window.ConfirmReportSheet
              theme={theme} kind="cancelled"
              evidence="Instagram post · @electric.callboy"
              selected="saw-source"
            />
          </div>
        </window.DCArtboard>
        <window.DCArtboard id="confirm-postponed" label="Confirm · postponed" width={433} height={840}>
          <div style={{ padding: 20 }}>
            <window.ConfirmReportSheet
              theme={theme} kind="postponed"
              reporter={{ handle: "@amelia" }}
              reportedAt="6h ago"
              evidence="Email · Mission Ballroom · 'rescheduled to Nov 4'"
              selected="own-evidence"
            />
          </div>
        </window.DCArtboard>
      </window.DCSection>

      {/* ──────────────────────────────────────────────────── */}
      {/* SECTION 11 — Live state for comparison */}
      {/* ──────────────────────────────────────────────────── */}
      <window.DCSection
        id="live-comparison"
        title="Live state · already shipped (for comparison)"
        subtitle="What a confirmed status report looks like once two fans have vouched. These are not new designs — the sold-out pill and cancelled / postponed badges already exist on the event detail page. Included so reviewers can see pending → live end-to-end."
      >
        <window.DCArtboard id="live-soldout" label="Live · sold out" width={433} height={200}>
          <ArtboardWrap theme={theme}>
            <window.LiveReportBanner kind="soldout" reportedBy="@kel" confirms={2}/>
          </ArtboardWrap>
        </window.DCArtboard>
        <window.DCArtboard id="live-cancelled" label="Live · cancelled" width={433} height={200}>
          <ArtboardWrap theme={theme}>
            <window.LiveReportBanner kind="cancelled" reportedBy="@kel" confirms={2}/>
          </ArtboardWrap>
        </window.DCArtboard>
        <window.DCArtboard id="live-postponed" label="Live · postponed" width={433} height={200}>
          <ArtboardWrap theme={theme}>
            <window.LiveReportBanner kind="postponed" reportedBy="@amelia" confirms={2}/>
          </ArtboardWrap>
        </window.DCArtboard>
      </window.DCSection>

      {/* ──────────────────────────────────────────────────── */}
      {/* SECTION 12 — Status mark reference */}
      {/* ──────────────────────────────────────────────────── */}
      <window.DCSection
        id="status-mark-reference"
        title="Report-type chips · color discipline"
        subtitle="The three report types (plus the counter 'tickets available' path) each use an existing theme token: --warning for sold-out, --danger for cancelled, --warning + clock glyph for postponed, --success for tickets-back. Sold-out and postponed share the same hue but different chrome (filled pill vs outlined+clock) — by design, since both are 'provisional, may reverse' states. Cancelled is the only state that earns --danger, because it's terminal."
      >
        <window.DCArtboard id="chip-ref" label="Chip reference · all states" width={620} height={280}>
          <ArtboardWrap theme={theme} padded={false}>
            <div style={{
              padding: 28, height: "100%", boxSizing: "border-box",
              display: "flex", flexDirection: "column", gap: 14,
            }}>
              <ChipRow kind="soldout"   label="Sold out"   sub="Existing PriceBlockB pill · reuse it"/>
              <ChipRow kind="soldout"   label="Sold out"   sub="Pending state · same hue, outlined chrome" pending/>
              <ChipRow kind="cancelled" label="Cancelled"  sub="--danger · the only terminal report"/>
              <ChipRow kind="cancelled" label="Cancelled"  sub="Pending state · outlined" pending/>
              <ChipRow kind="postponed" label="Postponed"  sub="--warning + clock glyph · not terminal"/>
              <ChipRow kind="postponed" label="Postponed"  sub="Pending state · outlined" pending/>
              <ChipRow kind="available" label="Tickets back" sub="--success · counter-report path"/>
            </div>
          </ArtboardWrap>
        </window.DCArtboard>
      </window.DCSection>

      {/* ──────────────────────────────────────────────────── */}
      {/* SECTION 13 — Alternative direction · A · for reference */}
      {/* ──────────────────────────────────────────────────── */}
      <window.DCSection
        id="pending-direction-a"
        title="Alternative · Direction A (not chosen)"
        subtitle="Tinted card with explicit progress bar. Kept for reference — Hugh chose Direction B (above) on May 25 because its rhythm matches the live priced card better and the pending → live transition is less visually disruptive. A is documented here in case you want to revisit later, e.g. for a noisier 'last call' moment when a card is close to going live."
      >
        <window.DCArtboard id="a-other" label="A · tinted with progress · community" width={433} height={520}>
          <ArtboardWrap theme={theme}>
            <ShowHeader/>
            <window.PendingCardA {...SAMPLE.community} view="other"/>
          </ArtboardWrap>
        </window.DCArtboard>
        <window.DCArtboard id="a-box" label="A · tinted with progress · box office" width={433} height={520}>
          <ArtboardWrap theme={theme} artist="Big Thief" venue="Mission Ballroom · Mon, Sep 14">
            <ShowHeader artist="Big Thief" venue="Mission Ballroom · Mon, Sep 14"/>
            <window.PendingCardA {...SAMPLE.boxBought} view="other"/>
          </ArtboardWrap>
        </window.DCArtboard>
      </window.DCSection>
    </window.DesignCanvas>
  );
}

function ChipRow({ kind, label, sub, pending }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 130, flexShrink: 0 }}>
        <window.ReportTypeMark kind={kind} pending={pending}/>
      </div>
      <div>
        <div style={{
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13,
          color: "var(--fg)", letterSpacing: "-0.005em",
        }}>{label}</div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: "var(--fg-subtle)", letterSpacing: "0.04em",
        }}>{sub}</div>
      </div>
    </div>
  );
}

window.CorroborationCanvas = CorroborationCanvas;

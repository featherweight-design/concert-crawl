// admin-venues-v2.jsx — Venues table with expandable rows + Generate UI for
// About / Capacity / Neighborhood fields on the detail page.
//
// What changed vs v1:
//   1. Row-expansion: chevron toggles a panel directly under the row. One open
//      at a time. Clicking the venue name still navigates to detail page.
//   2. Quick-view contents: ticket vendor + url, crawl schedule, strategy,
//      consecutive failure count + last error, robots.txt.
//   3. NEW: <GenerateField> + states (idle / loading / review / accepted / error).

const VENUES_V2 = [
  { id: "rrx", name: "Red Rocks Amphitheatre",   url: "redrocksonline.com/events",   robots: "ok",       strategy: "structured_data", schedule: { cron: "0 */6 * * *", label: "every 6 hours" },  status: "blocked", health: 0.0,  last: "12m ago", events: 0,  note: "HTTP 403",
    ticketVendor: "AXS", ticketUrl: "axs.com/series/16127-red-rocks", consecutiveFailures: 3, lastError: "HTTP 403 · bot detection (3rd consecutive)" },
  { id: "msn", name: "Mission Ballroom",         url: "missionballroom.com/events",  robots: "ok",       strategy: "structured_data", schedule: { cron: "0 */6 * * *", label: "every 6 hours" },  status: "active",  health: 1.0,  last: "32m ago", events: 14,
    ticketVendor: "AXS", ticketUrl: "axs.com/venues/202049-mission-ballroom", consecutiveFailures: 0, lastError: null },
  { id: "blu", name: "Bluebird Theater",         url: "bluebirdtheater.net/calendar",robots: "ok",       strategy: "llm",             schedule: { cron: "0 */6 * * *", label: "every 6 hours" },  status: "active",  health: 0.78, last: "47m ago", events: 9,  note: "low confidence avg 0.58",
    ticketVendor: "AXS", ticketUrl: "axs.com/venues/202047-bluebird-theater", consecutiveFailures: 0, lastError: "5 events below confidence threshold" },
  { id: "ogd", name: "Ogden Theatre",            url: "ogdentheatre.com/events",     robots: "ok",       strategy: "structured_data", schedule: { cron: "0 */6 * * *", label: "every 6 hours" },  status: "active",  health: 1.0,  last: "1h ago",  events: 11,
    ticketVendor: "AXS", ticketUrl: "axs.com/venues/202048-ogden-theatre", consecutiveFailures: 0, lastError: null },
  { id: "got", name: "Gothic Theatre",           url: "gothictheatre.com/events",    robots: "ok",       strategy: "llm",             schedule: { cron: "0 */12 * * *", label: "every 12 hours" }, status: "active",  health: 0.95, last: "1h ago",  events: 8,
    ticketVendor: "AEG Presents", ticketUrl: "aegpresents.com/venue/gothic-theatre", consecutiveFailures: 0, lastError: null },
  { id: "lar", name: "Larimer Lounge",           url: "larimerlounge.com/calendar",  robots: "blocked",  strategy: "manual",          schedule: { cron: null, label: "—" },                        status: "paused",  health: 0.0,  last: "—",       events: 0,  note: "robots.txt disallows /events/",
    ticketVendor: "Eventbrite", ticketUrl: "eventbrite.com/o/larimer-lounge", consecutiveFailures: 0, lastError: "robots.txt disallowed" },
];

function HealthDotV2({ value }) {
  if (value === null) return <span style={{ width: 8, height: 8, borderRadius: 4, background: "var(--surface-2)", display: "inline-block", border: "1px dashed var(--border)" }} />;
  const kind = value >= 0.95 ? "success" : value >= 0.7 ? "warning" : "danger";
  return <span style={{ width: 8, height: 8, borderRadius: 4, background: `var(--${kind})`, display: "inline-block", boxShadow: `0 0 0 3px color-mix(in oklab, var(--${kind}) 22%, transparent)` }} />;
}

function statusToVenueV2(s) {
  return ({
    active:  <StatusBadge kind="success" dot>Active</StatusBadge>,
    paused:  <StatusBadge kind="warning" dot>Paused</StatusBadge>,
    blocked: <StatusBadge kind="danger"  dot>Blocked</StatusBadge>,
    draft:   <StatusBadge kind="neutral">Draft</StatusBadge>,
  })[s];
}

// ── Expanded row quick-view ──────────────────────────────────────────
function VenueQuickView({ v }) {
  return (
    <div style={{
      padding: "18px 22px",
      background: "var(--surface-1)",
      borderBottom: "1px solid var(--border)",
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 18, marginBottom: 14 }}>
        {/* Ticket vendor */}
        <div>
          <MonoLabel>ticket vendor</MonoLabel>
          <div style={{ marginTop: 4, fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>{v.ticketVendor}</div>
          <a href="#" style={{
            marginTop: 4, display: "inline-flex", alignItems: "center", gap: 4,
            fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--signal)", textDecoration: "none",
          }}>
            <AdminIcon name="external" size={11} />
            {v.ticketUrl}
          </a>
        </div>
        {/* Schedule */}
        <div>
          <MonoLabel>crawl schedule</MonoLabel>
          <div style={{ marginTop: 4, fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>{v.schedule.label}</div>
          <div style={{ marginTop: 4, fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--fg-muted)" }}>{v.schedule.cron || "—"}</div>
        </div>
        {/* Strategy */}
        <div>
          <MonoLabel>extraction strategy</MonoLabel>
          <div style={{ marginTop: 6 }}>
            <StatusBadge kind={v.strategy === "structured_data" ? "signal" : v.strategy === "llm" ? "accent" : "neutral"} variant="outline" mono>
              {v.strategy === "structured_data" ? "structured" : v.strategy}
            </StatusBadge>
          </div>
        </div>
        {/* Consecutive failures */}
        <div>
          <MonoLabel>consecutive failures</MonoLabel>
          <div style={{
            marginTop: 4, fontFamily: ADMIN_MONO, fontSize: 18, fontWeight: 700,
            color: v.consecutiveFailures >= 3 ? "var(--danger)" : v.consecutiveFailures > 0 ? "var(--warning)" : "var(--fg)",
            fontVariantNumeric: "tabular-nums",
          }}>{v.consecutiveFailures} <span style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-muted)" }}>of 4</span></div>
        </div>
        {/* robots */}
        <div>
          <MonoLabel>robots.txt</MonoLabel>
          <div style={{ marginTop: 6 }}>
            {v.robots === "ok"      && <StatusBadge kind="success" mono>allowed</StatusBadge>}
            {v.robots === "blocked" && <StatusBadge kind="danger"  mono>disallowed</StatusBadge>}
            {v.robots === "unknown" && <StatusBadge kind="neutral" mono>unchecked</StatusBadge>}
          </div>
        </div>
      </div>

      {/* Last error strip */}
      {v.lastError && (
        <div style={{
          padding: "10px 14px", marginBottom: 14,
          background: v.consecutiveFailures > 0 ? "color-mix(in oklab, var(--danger) 8%, var(--bg-elevated))" : "var(--bg-elevated)",
          border: `1px solid ${v.consecutiveFailures > 0 ? "color-mix(in oklab, var(--danger) 30%, transparent)" : "var(--border)"}`,
          borderRadius: 8,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <AdminIcon name="alert" size={14} color={v.consecutiveFailures > 0 ? "var(--danger)" : "var(--warning)"} />
          <span style={{ fontFamily: ADMIN_FONT, fontSize: 12, fontWeight: 600, color: v.consecutiveFailures > 0 ? "var(--danger)" : "var(--fg-muted)" }}>{v.lastError}</span>
        </div>
      )}

      {/* Action shelf */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <AdminButton variant="outline" size="sm" icon="refresh">Run crawl now</AdminButton>
        <AdminButton variant="outline" size="sm" icon="edit">Edit venue</AdminButton>
        <AdminButton variant="ghost" size="sm" icon="external">Open detail</AdminButton>
        <AdminButton variant="ghost" size="sm" iconRight="chevR" style={{ marginLeft: "auto" }}>Crawl history</AdminButton>
      </div>
    </div>
  );
}

// ── Venues table with accordion ──────────────────────────────────────
function AdminVenuesPageV2({ expandedId = "rrx", onToggle }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionHead
        eyebrow="Phase 7 · Sources"
        title="Venues"
        subtitle="Configure crawl targets. Click chevron for quick details, click name to open the full venue page."
        actions={<>
          <AdminButton variant="outline" icon="filter">Status</AdminButton>
          <AdminButton variant="outline" icon="external">robots.txt audit</AdminButton>
          <AdminButton variant="primary" icon="plus">Add venue</AdminButton>
        </>}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        <StatCard label="Total venues"     value="11"  icon="venues" />
        <StatCard label="Active"           value="7"   icon="venues" kind="success" />
        <StatCard label="Paused / blocked" value="2"   icon="venues" kind="warning" />
        <StatCard label="Avg health · 7d"  value="93%" icon="activity" kind="signal" hint="median run success rate" />
      </div>
      <Panel title={<>
        <span style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700 }}>Configured venues</span>
        <MonoLabel>{VENUES_V2.length}</MonoLabel>
      </>} padding={0}>
        <AdminTable style={{ border: "none", borderRadius: 0 }}>
          <THead>
            <tr>
              <TH width={28}><input type="checkbox" style={{ accentColor: "var(--signal)" }} /></TH>
              <TH width={36}></TH>
              <TH>Venue</TH>
              <TH>Source URL</TH>
              <TH>Strategy</TH>
              <TH>Schedule</TH>
              <TH>Status</TH>
              <TH>Health</TH>
              <TH align="right">Last crawl</TH>
              <TH align="right">Events</TH>
              <TH width={32}></TH>
            </tr>
          </THead>
          <tbody>
            {VENUES_V2.map(v => {
              const open = v.id === expandedId;
              return (
                <React.Fragment key={v.id}>
                  <TR active={open}>
                    <TD><input type="checkbox" style={{ accentColor: "var(--signal)" }} /></TD>
                    <TD>
                      <button onClick={() => onToggle && onToggle(open ? null : v.id)} style={{
                        all: "unset", cursor: "pointer", padding: 6, borderRadius: 6,
                        color: "var(--fg-muted)", display: "flex",
                        transform: open ? "rotate(90deg)" : "rotate(0deg)",
                        transition: "transform .15s",
                      }} title={open ? "Collapse" : "Expand"}>
                        <AdminIcon name="chevR" size={14} />
                      </button>
                    </TD>
                    <TD>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <a href="#" style={{ fontWeight: 600, color: "var(--fg)", textDecoration: "none" }}>{v.name}</a>
                        {v.note && <span style={{ fontSize: 11, color: v.status === "blocked" ? "var(--danger)" : "var(--fg-muted)" }}>{v.note}</span>}
                      </div>
                    </TD>
                    <TD mono color="var(--fg-muted)">
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <AdminIcon name="external" size={11} color="var(--fg-subtle)" />
                        {v.url}
                      </span>
                    </TD>
                    <TD>
                      <StatusBadge kind={v.strategy === "structured_data" ? "signal" : v.strategy === "llm" ? "accent" : "neutral"} variant="outline" mono>
                        {v.strategy === "structured_data" ? "structured" : v.strategy}
                      </StatusBadge>
                    </TD>
                    <TD mono color="var(--fg-muted)">{v.schedule.label}</TD>
                    <TD>{statusToVenueV2(v.status)}</TD>
                    <TD>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <HealthDotV2 value={v.health} />
                        <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, fontVariantNumeric: "tabular-nums", color: v.health === null ? "var(--fg-subtle)" : "var(--fg-muted)" }}>
                          {v.health === null ? "—" : `${Math.round(v.health * 100)}%`}
                        </span>
                      </span>
                    </TD>
                    <TD align="right" mono color="var(--fg-muted)">{v.last}</TD>
                    <TD align="right" mono color={v.events ? "var(--fg)" : "var(--fg-subtle)"}>{v.events || "—"}</TD>
                    <TD>
                      <button style={{ all: "unset", cursor: "pointer", padding: 6, borderRadius: 6, color: "var(--fg-muted)" }}>
                        <AdminIcon name="more" size={14} />
                      </button>
                    </TD>
                  </TR>
                  {open && (
                    <tr>
                      <td colSpan={11} style={{ padding: 0, background: "var(--surface-1)" }}>
                        <VenueQuickView v={v} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </AdminTable>
      </Panel>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// GENERATE UI — for About / Capacity / Neighborhood fields
// ─────────────────────────────────────────────────────────────────────
//
// Lives inline next to the field on the venue detail page. Five states:
//
//   idle      → field shows the current value (or empty) + "Generate" button
//   loading   → spinner + "Generating…" + cancel
//   review    → returned suggestion in a tinted card; Accept / Regenerate / Discard
//   accepted  → value applied to field; subtle "Generated" pill until next edit
//   error     → red strip with retry
//
// Generates use the page's existing LLM budget; cost is shown so admin can decide
// whether to regenerate.

function GenerateField({
  label, helpText, currentValue = "", suggested = "", state = "idle",
  cost = 0.0042, tokens = 1208, source = "Spotify · Wikipedia · venue website",
  multiline = true,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div>
          <label style={{
            fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 700, color: "var(--fg)",
            letterSpacing: "-0.005em",
          }}>{label}</label>
          {helpText && (
            <div style={{ marginTop: 2, fontFamily: ADMIN_FONT, fontSize: 11, color: "var(--fg-muted)" }}>{helpText}</div>
          )}
        </div>
        <GenerateButton state={state} cost={cost} />
      </div>

      {/* Field */}
      {multiline ? (
        <textarea
          defaultValue={state === "accepted" ? suggested : currentValue}
          rows={4}
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "10px 12px",
            border: `1px solid ${state === "accepted" ? "color-mix(in oklab, var(--success) 38%, transparent)" : "var(--border-strong)"}`,
            borderRadius: 8,
            background: state === "accepted" ? "color-mix(in oklab, var(--success) 5%, var(--bg-elevated))" : "var(--bg-elevated)",
            fontFamily: ADMIN_FONT, fontSize: 13, color: "var(--fg)", lineHeight: 1.55,
            resize: "vertical",
          }}
        />
      ) : (
        <input
          defaultValue={state === "accepted" ? suggested : currentValue}
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "10px 12px",
            border: `1px solid ${state === "accepted" ? "color-mix(in oklab, var(--success) 38%, transparent)" : "var(--border-strong)"}`,
            borderRadius: 8,
            background: state === "accepted" ? "color-mix(in oklab, var(--success) 5%, var(--bg-elevated))" : "var(--bg-elevated)",
            fontFamily: ADMIN_FONT, fontSize: 13, color: "var(--fg)",
          }}
        />
      )}

      {/* State strip */}
      {state === "loading" && (
        <div style={{
          padding: "10px 14px", borderRadius: 8,
          background: "color-mix(in oklab, var(--signal) 6%, var(--bg-elevated))",
          border: "1px solid color-mix(in oklab, var(--signal) 28%, transparent)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <Spinner size={14} color="var(--signal)" />
          <span style={{ fontFamily: ADMIN_FONT, fontSize: 12, fontWeight: 600, color: "var(--signal)" }}>Generating…</span>
          <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--fg-muted)" }}>~3–5s</span>
          <AdminButton variant="ghost" size="sm" style={{ marginLeft: "auto" }}>Cancel</AdminButton>
        </div>
      )}

      {state === "review" && (
        <div style={{
          padding: "14px 16px", borderRadius: 8,
          background: "color-mix(in oklab, var(--accent) 6%, var(--bg-elevated))",
          border: "1px solid color-mix(in oklab, var(--accent) 32%, transparent)",
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MonoLabel color="var(--accent)">suggested</MonoLabel>
            <StatusBadge kind="accent" mono>llm</StatusBadge>
            <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 10, fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--fg-muted)" }}>
              <CostText value={cost} size={11} />
              <span>· {tokens} tok</span>
            </span>
          </div>
          <div style={{ fontFamily: ADMIN_FONT, fontSize: 13, color: "var(--fg)", lineHeight: 1.55 }}>{suggested}</div>
          <div style={{ fontFamily: ADMIN_MONO, fontSize: 10, color: "var(--fg-subtle)", letterSpacing: "0.04em" }}>
            SOURCES: {source}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <AdminButton variant="success" size="sm" icon="check">Accept</AdminButton>
            <AdminButton variant="outline" size="sm" icon="refresh">Regenerate</AdminButton>
            <AdminButton variant="ghost" size="sm" icon="x">Discard</AdminButton>
            <AdminButton variant="ghost" size="sm" icon="edit" style={{ marginLeft: "auto" }}>Edit before accept</AdminButton>
          </div>
        </div>
      )}

      {state === "accepted" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <StatusBadge kind="success" mono dot>generated · accepted</StatusBadge>
          <span style={{ fontFamily: ADMIN_FONT, fontSize: 11, color: "var(--fg-muted)" }}>You can edit freely; the pill clears on save.</span>
          <AdminButton variant="ghost" size="sm" iconRight="refresh" style={{ marginLeft: "auto" }}>Regenerate</AdminButton>
        </div>
      )}

      {state === "error" && (
        <div style={{
          padding: "10px 14px", borderRadius: 8,
          background: "color-mix(in oklab, var(--danger) 8%, var(--bg-elevated))",
          border: "1px solid color-mix(in oklab, var(--danger) 32%, transparent)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <AdminIcon name="alert" size={14} color="var(--danger)" />
          <span style={{ fontFamily: ADMIN_FONT, fontSize: 12, fontWeight: 600, color: "var(--danger)" }}>
            Generation failed — model returned no usable output.
          </span>
          <AdminButton variant="ghost" size="sm" icon="refresh" style={{ marginLeft: "auto" }}>Retry</AdminButton>
        </div>
      )}
    </div>
  );
}

function GenerateButton({ state, cost }) {
  if (state === "loading") return null;
  return (
    <button style={{
      all: "unset", cursor: "pointer",
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "6px 10px", borderRadius: 6,
      background: "color-mix(in oklab, var(--accent) 8%, transparent)",
      border: "1px solid color-mix(in oklab, var(--accent) 34%, transparent)",
      color: "var(--accent)",
      fontFamily: ADMIN_FONT, fontSize: 12, fontWeight: 700,
    }}>
      <AdminIcon name="activity" size={13} />
      <span>Generate</span>
      <span style={{ fontFamily: ADMIN_MONO, fontSize: 10, fontWeight: 700, opacity: 0.7, letterSpacing: "0.03em" }}>
        ~${cost.toFixed(4)}
      </span>
    </button>
  );
}

// ── Generate UI demo — a venue detail card with all 3 fields ─────────
function VenueDetailGenerateDemo({ states = { about: "idle", capacity: "review", neighborhood: "accepted" } }) {
  return (
    <Panel title={<>
      <span style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700 }}>Editorial fields</span>
      <StatusBadge kind="accent" mono>llm-assisted</StatusBadge>
    </>}
    action={<AdminButton variant="ghost" size="sm" iconRight="chevR">Generate all</AdminButton>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <GenerateField
          label="About"
          helpText="One short paragraph shown on the venue page (under the hero)."
          currentValue=""
          suggested="Red Rocks Amphitheatre is a 9,525-seat open-air amphitheatre carved into the foothills west of Denver. Built into a natural geologic formation, it's known for acoustics that need no enhancement and sightlines that turn even a back-row ticket into a good one."
          state={states.about}
          cost={0.0042}
          tokens={1208}
        />
        <GenerateField
          label="Capacity"
          helpText="Used in venue facts strip. Be specific (seated / standing / mixed)."
          currentValue="9525"
          suggested="9,525 seated"
          state={states.capacity}
          cost={0.0008}
          tokens={184}
          source="Wikipedia · official site"
          multiline={false}
        />
        <GenerateField
          label="Neighborhood"
          helpText="Single line — where it sits in the city."
          currentValue="Morrison, CO"
          suggested="Morrison, CO — 15 mi west of downtown Denver"
          state={states.neighborhood}
          cost={0.0012}
          tokens={210}
          source="venue website · Wikipedia"
          multiline={false}
        />
      </div>
    </Panel>
  );
}

// ── Mobile venues (compact stack) ────────────────────────────────────
function AdminVenuesMobile({ expandedId = "rrx" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={{ margin: 0, fontFamily: ADMIN_FONT, fontSize: 20, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.02em" }}>Venues</h1>
        <div style={{ marginTop: 4, fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)" }}>11 configured · 1 blocked.</div>
      </div>
      <AdminButton variant="primary" icon="plus" fullWidth>Add venue</AdminButton>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {VENUES_V2.map(v => {
          const open = v.id === expandedId;
          return (
            <div key={v.id} style={{
              background: "var(--bg-elevated)", borderRadius: 12,
              border: `1px solid ${open ? "var(--border-strong)" : "var(--border)"}`, overflow: "hidden",
            }}>
              <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700, color: "var(--fg)", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.name}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    {statusToVenueV2(v.status)}
                    <StatusBadge kind={v.strategy === "structured_data" ? "signal" : v.strategy === "llm" ? "accent" : "neutral"} variant="outline" mono>
                      {v.strategy === "structured_data" ? "structured" : v.strategy}
                    </StatusBadge>
                    <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--fg-muted)" }}>· {v.last}</span>
                  </div>
                </div>
                <button style={{
                  all: "unset", cursor: "pointer", padding: 8, borderRadius: 8,
                  color: "var(--fg-muted)", transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform .15s",
                }}><AdminIcon name="chevR" size={16} /></button>
              </div>
              {open && (
                <div style={{ borderTop: "1px solid var(--border)" }}>
                  <VenueQuickView v={v} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, {
  AdminVenuesPageV2, AdminVenuesMobile, VenueQuickView,
  GenerateField, GenerateButton, VenueDetailGenerateDemo,
  VENUES_V2,
});

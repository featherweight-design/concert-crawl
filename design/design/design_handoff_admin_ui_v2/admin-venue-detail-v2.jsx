// admin-venue-detail-v2.jsx — Full venue detail / edit page, with the
// GenerateField for About/Capacity/Neighborhood embedded in context.
//
// Editable field list (confirmed in this revision):
//   Identity     · name, slug, source URL, city, status
//   Ticketing    · ticket vendor, ticket URL
//   Crawl        · extraction strategy, schedule (cron), request delay, wait selector
//   Editorial    · About (generate), Capacity (generate), Neighborhood (generate)
//   Identity art · namespace (artist/venue), regen seed
//   Danger       · pause, delete

// ── Small form atoms ─────────────────────────────────────────────────
function VDField({ label, hint, helper, children, span }) {
  return (
    <div style={{ gridColumn: span || "auto" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
        <label style={{ fontFamily: ADMIN_FONT, fontSize: 12, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.005em" }}>{label}</label>
        {hint && <span style={{ fontFamily: ADMIN_MONO, fontSize: 10, color: "var(--fg-subtle)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700 }}>{hint}</span>}
      </div>
      {children}
      {helper && <div style={{ marginTop: 6, fontFamily: ADMIN_FONT, fontSize: 11, color: "var(--fg-muted)", lineHeight: 1.5 }}>{helper}</div>}
    </div>
  );
}

function VDInput({ value, mono, prefix, suffix, placeholder, readOnly }) {
  return (
    <div style={{
      display: "flex", alignItems: "center",
      height: 36, padding: "0 4px 0 12px",
      border: "1px solid var(--border-strong)",
      borderRadius: 8, background: "var(--bg-elevated)",
    }}>
      {prefix && <span style={{ marginRight: 4, fontFamily: ADMIN_MONO, fontSize: 12, color: "var(--fg-subtle)" }}>{prefix}</span>}
      <input
        defaultValue={value}
        placeholder={placeholder}
        readOnly={readOnly}
        style={{
          all: "unset", flex: 1,
          fontFamily: mono ? ADMIN_MONO : ADMIN_FONT,
          fontSize: 13, fontWeight: 500,
          color: "var(--fg)",
        }}
      />
      {suffix && <span style={{ marginLeft: 4, display: "inline-flex", padding: 6 }}>{suffix}</span>}
    </div>
  );
}

function VDSelect({ value, options }) {
  return (
    <div style={{
      position: "relative",
      height: 36, padding: "0 12px",
      border: "1px solid var(--border-strong)",
      borderRadius: 8, background: "var(--bg-elevated)",
      display: "flex", alignItems: "center",
    }}>
      <select defaultValue={value} style={{
        all: "unset", width: "100%", paddingRight: 18,
        fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 500, color: "var(--fg)",
      }}>
        {options.map(o => <option key={o.value} value={o.value} style={{ background: "var(--bg-elevated)", color: "var(--fg)" }}>{o.label}</option>)}
      </select>
      <span style={{ position: "absolute", right: 10, color: "var(--fg-subtle)", display: "flex", transform: "rotate(90deg)" }}>
        <AdminIcon name="chevR" size={12} />
      </span>
    </div>
  );
}

function VDSegToggle({ options, value }) {
  return (
    <div style={{
      display: "inline-flex", padding: 2, borderRadius: 8,
      background: "var(--surface-1)", border: "1px solid var(--border)",
    }}>
      {options.map(o => {
        const active = o.value === value;
        return (
          <button key={o.value} style={{
            all: "unset", cursor: "pointer",
            padding: "6px 14px", borderRadius: 6,
            fontFamily: ADMIN_FONT, fontSize: 12, fontWeight: 700,
            color: active ? "var(--fg-on-accent)" : "var(--fg-muted)",
            background: active ? "var(--signal)" : "transparent",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            {o.dot && <span style={{ width: 6, height: 6, borderRadius: 3, background: active ? "var(--fg-on-accent)" : `var(--${o.dot})` }} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Section card ─────────────────────────────────────────────────────
function VDSection({ eyebrow, title, hint, children, danger }) {
  return (
    <div style={{
      background: "var(--bg-elevated)",
      border: `1px solid ${danger ? "color-mix(in oklab, var(--danger) 28%, var(--border))" : "var(--border)"}`,
      borderRadius: 12,
    }}>
      <div style={{
        padding: "16px 22px", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16,
      }}>
        <div>
          <MonoLabel color={danger ? "var(--danger)" : "var(--fg-subtle)"}>{eyebrow}</MonoLabel>
          <div style={{ marginTop: 4, fontFamily: ADMIN_FONT, fontSize: 17, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.015em" }}>{title}</div>
          {hint && <div style={{ marginTop: 4, fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.5 }}>{hint}</div>}
        </div>
      </div>
      <div style={{ padding: 22 }}>{children}</div>
    </div>
  );
}

// ── Identity art preview tile ────────────────────────────────────────
function IdentityArtTile({ name = "Red Rocks Amphitheatre", seed = 0.42 }) {
  // Quick deterministic-looking generative tile so the card has something to show.
  // Real impl uses <IdentityArt /> from Phase 7.5.
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = (hash * 13) % 360;
  return (
    <div style={{
      width: 96, height: 96, borderRadius: 12, flexShrink: 0,
      background: `linear-gradient(135deg, oklch(0.62 0.16 ${hue}), oklch(0.45 0.14 ${(hue + 60) % 360}))`,
      position: "relative", overflow: "hidden",
      border: "1px solid var(--border-strong)",
    }}>
      <div style={{ position: "absolute", inset: 0, background: `repeating-linear-gradient(45deg, transparent 0 8px, rgba(0,0,0,0.08) 8px 16px)` }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.92)", fontFamily: ADMIN_FONT, fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>
        {name.split(" ").map(w => w[0]).slice(0, 2).join("")}
      </div>
    </div>
  );
}

// ── Health / status summary chip at the top ──────────────────────────
function VenueHeaderSummary({ venue }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      padding: "12px 16px", marginBottom: 18,
      background: "var(--bg-elevated)", border: "1px solid var(--border)",
      borderRadius: 12,
    }}>
      <IdentityArtTile name={venue.name} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
          <MonoLabel>{venue.id} · venue</MonoLabel>
          {venue.status === "active"  && <StatusBadge kind="success" dot>Active</StatusBadge>}
          {venue.status === "paused"  && <StatusBadge kind="warning" dot>Paused</StatusBadge>}
          {venue.status === "blocked" && <StatusBadge kind="danger" dot>Blocked</StatusBadge>}
          <StatusBadge kind={venue.strategy === "structured_data" ? "signal" : venue.strategy === "llm" ? "accent" : "neutral"} variant="outline" mono>
            {venue.strategy === "structured_data" ? "structured" : venue.strategy}
          </StatusBadge>
          {venue.consecutiveFailures > 0 && <StatusBadge kind="danger" mono>{venue.consecutiveFailures} consec. failures</StatusBadge>}
        </div>
        <h2 style={{ margin: 0, fontFamily: ADMIN_FONT, fontSize: 22, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.02em" }}>{venue.name}</h2>
        <div style={{ marginTop: 4, display: "flex", gap: 14, fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--fg-muted)" }}>
          <span>last crawl · {venue.last}</span>
          <span>·</span>
          <span>{venue.events} events live</span>
          <span>·</span>
          <span>health {Math.round((venue.health || 0) * 100)}%</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <AdminButton variant="outline" icon="refresh">Run crawl now</AdminButton>
        <AdminButton variant="outline" icon="external">View on site</AdminButton>
      </div>
    </div>
  );
}

// ── The whole detail page ────────────────────────────────────────────
function VenueDetailPageV2({ venue, generateStates = { about: "idle", capacity: "idle", neighborhood: "idle" } }) {
  const v = venue || VENUES_V2[0];
  return (
    <div style={{ maxWidth: 1080, display: "flex", flexDirection: "column", gap: 18 }}>
      <SectionHead
        eyebrow="Venues · edit"
        title="Venue detail"
        subtitle="Identity, ticketing, crawl config, editorial fields. LLM-assisted fields are always admin-reviewed before they save."
        actions={
          <>
            <AdminButton variant="ghost" iconRight="chevR">Back to venues</AdminButton>
            <AdminButton variant="outline" icon="external">Crawl history</AdminButton>
          </>
        }
      />

      <VenueHeaderSummary venue={v} />

      {/* IDENTITY */}
      <VDSection eyebrow="01 · identity" title="Name + slug + source">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <VDField label="Venue name"><VDInput value={v.name} /></VDField>
          <VDField label="Slug" hint="auto-generated">
            <VDInput value={v.id === "rrx" ? "red-rocks-amphitheatre" : v.id} mono prefix="/v/" suffix={
              <button title="Regenerate" style={{ all: "unset", cursor: "pointer", color: "var(--fg-subtle)", display: "flex" }}>
                <AdminIcon name="refresh" size={13} />
              </button>
            } />
          </VDField>
          <VDField label="Source URL" hint={
            v.robots === "ok" ? <StatusBadge kind="success" mono>robots ✓</StatusBadge> :
            v.robots === "blocked" ? <StatusBadge kind="danger" mono>robots ✗</StatusBadge> :
            <StatusBadge kind="neutral" mono>unchecked</StatusBadge>
          } span="1 / -1" helper="The events page we crawl on the configured schedule.">
            <VDInput value={`https://${v.url}`} mono />
          </VDField>
          <VDField label="City"><VDInput value="Morrison, CO" /></VDField>
          <VDField label="Status">
            <VDSegToggle
              value={v.status}
              options={[
                { value: "active",  label: "Active",  dot: "success" },
                { value: "paused",  label: "Paused",  dot: "warning" },
                { value: "blocked", label: "Blocked", dot: "danger" },
              ]}
            />
          </VDField>
        </div>
      </VDSection>

      {/* TICKETING */}
      <VDSection eyebrow="02 · ticketing" title="Where fans buy">
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16 }}>
          <VDField label="Primary vendor">
            <VDSelect
              value={v.ticketVendor}
              options={[
                { value: "AXS",            label: "AXS" },
                { value: "Ticketmaster",   label: "Ticketmaster" },
                { value: "AEG Presents",   label: "AEG Presents" },
                { value: "Eventbrite",     label: "Eventbrite" },
                { value: "DICE",           label: "DICE" },
                { value: "(direct)",       label: "Direct from venue" },
              ]}
            />
          </VDField>
          <VDField label="Ticket URL" helper="Default destination for the 'Buy tickets' button when an event has no per-show URL.">
            <VDInput value={`https://${v.ticketUrl}`} mono suffix={<AdminIcon name="external" size={13} color="var(--fg-subtle)" />} />
          </VDField>
        </div>
      </VDSection>

      {/* CRAWL */}
      <VDSection eyebrow="03 · crawl config" title="How the scraper hits this venue">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <VDField label="Extraction strategy">
            <VDSelect
              value={v.strategy}
              options={[
                { value: "structured_data", label: "structured — schema.org/Event" },
                { value: "llm",             label: "llm — Claude Haiku parse" },
                { value: "manual",          label: "manual — admin enters events" },
              ]}
            />
          </VDField>
          <VDField label="Schedule (cron)" hint="every 6 hours">
            <VDInput value={v.schedule.cron || ""} mono placeholder="0 */6 * * *" />
          </VDField>
          <VDField label="Request delay" helper="Milliseconds between requests inside one sweep. Tune up if you hit rate limits.">
            <VDInput value="1500" mono suffix={<span style={{ fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--fg-subtle)" }}>ms</span>} />
          </VDField>
          <VDField label="Wait selector" hint="optional" helper="If set, Playwright waits for this selector before parsing.">
            <VDInput value="" mono placeholder=".event-card, [data-event]" />
          </VDField>
        </div>
      </VDSection>

      {/* EDITORIAL — Generate UI in context */}
      <VDSection
        eyebrow="04 · editorial"
        title="About · capacity · neighborhood"
        hint={<>These fields render on the venue's public page. <strong style={{ color: "var(--accent)", fontWeight: 700 }}>LLM-assisted</strong> — every generation needs your sign-off before it saves.</>}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <GenerateField
            label="About"
            helpText="One short paragraph shown on the venue page (under the hero). Plain prose, no markdown."
            currentValue=""
            suggested="Red Rocks Amphitheatre is a 9,525-seat open-air amphitheatre carved into the foothills west of Denver. Built into a natural geologic formation, it's known for acoustics that need no enhancement and sightlines that turn even a back-row ticket into a good one."
            state={generateStates.about}
            cost={0.0042}
            tokens={1208}
            source="Spotify · Wikipedia · venue website"
          />
          <GenerateField
            label="Capacity"
            helpText="Used in the venue facts strip. Be specific (seated / standing / mixed)."
            currentValue="9525"
            suggested="9,525 seated"
            state={generateStates.capacity}
            cost={0.0008}
            tokens={184}
            source="Wikipedia · official site"
            multiline={false}
          />
          <GenerateField
            label="Neighborhood"
            helpText="Single line — where it sits in the city. Helps fans gauge travel time."
            currentValue="Morrison, CO"
            suggested="Morrison, CO — 15 mi west of downtown Denver"
            state={generateStates.neighborhood}
            cost={0.0012}
            tokens={210}
            source="venue website · Wikipedia"
            multiline={false}
          />
        </div>
      </VDSection>

      {/* IDENTITY ART */}
      <VDSection eyebrow="05 · identity art" title="Generative cover (Phase 7.5)">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
          <IdentityArtTile name={v.name} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontFamily: ADMIN_FONT, fontSize: 13, color: "var(--fg)", lineHeight: 1.55 }}>
              Art is hashed deterministically from <span style={{ fontFamily: ADMIN_MONO, color: "var(--accent)", fontWeight: 700 }}>{`(${v.id === "rrx" ? "venue" : "venue"} · ${v.name})`}</span>. Same input → same art. To roll fresh art without renaming, bump the seed.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <VDField label="Namespace" helper="Determines which generator template family kicks in. Venues skew geometric.">
                <VDSegToggle
                  value="venue"
                  options={[
                    { value: "venue",  label: "Venue" },
                    { value: "artist", label: "Artist" },
                  ]}
                />
              </VDField>
              <VDField label="Seed" hint="locked unless bumped" helper="Increment to force fresh art. Stored in the venue record.">
                <VDInput value="0" mono suffix={
                  <button title="Bump seed" style={{ all: "unset", cursor: "pointer", color: "var(--fg-subtle)", display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6, background: "var(--surface-1)", border: "1px solid var(--border)", fontFamily: ADMIN_FONT, fontSize: 11, fontWeight: 700 }}>
                    <AdminIcon name="refresh" size={12} /> Roll
                  </button>
                } />
              </VDField>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 12px", borderRadius: 8,
              background: "var(--surface-1)", border: "1px dashed var(--border-strong)",
              fontFamily: ADMIN_FONT, fontSize: 11, color: "var(--fg-muted)",
            }}>
              <AdminIcon name="alertTri" size={12} color="var(--warning)" />
              <span>Phase 8 replaces this with a real venue photo if/when one's available.</span>
            </div>
          </div>
        </div>
      </VDSection>

      {/* DANGER */}
      <VDSection eyebrow="danger zone" title="Pause or remove this venue" danger>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div>
            <div style={{ fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>Pause crawling</div>
            <div style={{ marginTop: 2, fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)" }}>Stops scheduled runs. Existing events stay published.</div>
          </div>
          <AdminButton variant="outline" icon="pause">Pause venue</AdminButton>
        </div>
        <div style={{ height: 1, background: "var(--border)", margin: "16px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div>
            <div style={{ fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 700, color: "var(--danger)" }}>Delete venue</div>
            <div style={{ marginTop: 2, fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)" }}>Removes config + breaks links to existing events. Cannot be undone.</div>
          </div>
          <AdminButton variant="danger" icon="x">Delete venue…</AdminButton>
        </div>
      </VDSection>

      {/* Sticky save bar */}
      <div style={{
        position: "sticky", bottom: 0,
        marginTop: 4, padding: "12px 18px",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        boxShadow: "0 -6px 18px rgba(0,0,0,0.06)",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <StatusBadge kind="warning" dot>3 unsaved changes</StatusBadge>
        <span style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)" }}>About · Capacity · Status</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <AdminButton variant="ghost">Discard</AdminButton>
          <AdminButton variant="primary" icon="check">Save changes</AdminButton>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { VenueDetailPageV2, IdentityArtTile, DeleteVenueConfirm });

// ──────────────────────────────────────────────────────────────────────
// DELETE VENUE — confirmation modal (matches DeleteAccountConfirm pattern)
// ──────────────────────────────────────────────────────────────────────
// Uses the same DELETE-typed gate as design_handoff_profile_settings_v2's
// DeleteAccountConfirm. Plain-and-clear voice (no snark for destructive actions).
// Two phases:
//   - type    — input empty / wrong, primary button disabled
//   - armed   — DELETE typed exactly, button arms red
//   - deleting — spinner state (not shown in canvas)

function DeleteVenueConfirm({ venue, initialPhase = "type", onCancel, onConfirm }) {
  const v = venue || VENUES_V2[0];
  const [typed, setTyped] = React.useState(initialPhase === "armed" ? "DELETE" : "");
  const armed = typed === "DELETE";
  const liveEvents = v.events || 0;
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        width: 520, maxWidth: "100%",
        background: "var(--bg-elevated)",
        border: "1px solid color-mix(in oklab, var(--danger) 32%, transparent)",
        borderTop: "3px solid var(--danger)",
        borderRadius: 14,
        boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
        overflow: "hidden",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "22px 24px 16px" }}>
          <MonoLabel color="var(--danger)">destructive action</MonoLabel>
          <h3 style={{ margin: "8px 0 0", fontFamily: ADMIN_FONT, fontSize: 22, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
            Delete {v.name}?
          </h3>
          <div style={{ marginTop: 10, fontFamily: ADMIN_FONT, fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.6 }}>
            This <strong style={{ color: "var(--danger)", fontWeight: 700 }}>can't be undone</strong>. The venue config, crawl schedule, and ticketing defaults will be removed. {liveEvents > 0 && (
              <>Links from <span style={{ fontFamily: ADMIN_MONO, fontWeight: 700, color: "var(--fg)" }}>{liveEvents}</span> live events will break — they'll keep their data but show "venue unknown" on the consumer app.</>
            )}
          </div>
        </div>

        {/* What's lost — explicit list */}
        <div style={{ padding: "0 24px 16px" }}>
          <MonoLabel>what gets removed</MonoLabel>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontFamily: ADMIN_FONT, fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.7 }}>
            <li>Venue config (name, slug, source URL, ticketing)</li>
            <li>Crawl schedule + extraction strategy + history</li>
            <li>About / Capacity / Neighborhood editorial copy</li>
            <li>Identity art seed</li>
          </ul>
          <MonoLabel style={{ marginTop: 14, display: "inline-block" }}>what survives</MonoLabel>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontFamily: ADMIN_FONT, fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.7 }}>
            <li>Individual event records (orphaned, can be re-linked or re-deleted manually)</li>
            <li>Fan-submitted prices and confirmations on those events</li>
          </ul>
        </div>

        {/* DELETE gate */}
        <div style={{ padding: "0 24px 18px" }}>
          <div style={{ fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 600, color: "var(--fg)", marginBottom: 8 }}>
            Type <strong style={{ color: "var(--danger)", fontFamily: ADMIN_MONO, letterSpacing: "0.06em" }}>DELETE</strong> to confirm.
          </div>
          <div style={{
            background: "var(--surface-1)",
            border: armed ? "1.5px solid var(--danger)" : "1px solid var(--border-strong)",
            borderRadius: 10, padding: "0 14px",
            transition: "border-color .12s",
          }}>
            <input
              type="text"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder="DELETE"
              style={{
                all: "unset", boxSizing: "border-box", width: "100%", padding: "12px 0",
                fontFamily: ADMIN_MONO, fontSize: 16, fontWeight: 700,
                color: "var(--fg)", letterSpacing: "0.08em",
              }}
            />
          </div>
        </div>

        <div style={{
          padding: "14px 24px", borderTop: "1px solid var(--border)",
          display: "flex", gap: 8, justifyContent: "flex-end",
          background: "var(--surface-1)",
        }}>
          <AdminButton variant="ghost" onClick={onCancel}>Keep venue</AdminButton>
          <button
            onClick={armed ? onConfirm : undefined}
            disabled={!armed}
            style={{
              all: "unset", boxSizing: "border-box",
              cursor: armed ? "pointer" : "not-allowed",
              display: "inline-flex", alignItems: "center", gap: 8,
              height: 34, padding: "0 16px", borderRadius: 8,
              border: `1px solid ${armed ? "var(--danger)" : "var(--border-strong)"}`,
              background: armed ? "var(--danger)" : "var(--surface-2)",
              color: armed ? "var(--fg-on-accent)" : "var(--fg-subtle)",
              fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 700, letterSpacing: "-0.005em",
              transition: "background .12s",
            }}
          >
            <AdminIcon name="x" size={14} />
            {armed ? "Delete forever" : "Type DELETE to enable"}
          </button>
        </div>
      </div>
    </div>
  );
}

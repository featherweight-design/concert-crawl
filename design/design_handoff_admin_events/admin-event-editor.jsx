// admin-event-editor.jsx — full-page event editor (/admin/events/:id/edit).
//
// Canonical edit surface, reached from the All events row menu ("Edit…"), the
// queue inspector's "Open full editor" link, and View detail. Mirrors
// VenueDetailPageV2: numbered sections + sticky unsaved-changes save bar + danger zone.
// Shares the FieldRow primitive, validation rules, and save semantics with the
// queue inspector (drift contained at the component level).
//
// Two axes, schema-aligned:
//   • Status (events.status enum): upcoming | postponed | cancelled  → stays published, fan banner
//   • Verification: verified | unverified                            → moderation
//
// Reuses admin primitives + LifecycleBadge / VerifyMark / DeleteEventConfirm (mgmt). Tokens var(--*).

// ── Field primitives (shared with the queue inspector) ────────────────
function editBoxStyle(error, focus) {
  return {
    width: "100%", boxSizing: "border-box",
    background: "var(--bg-elevated)",
    border: `1.5px solid ${error ? "var(--danger)" : focus ? "var(--signal)" : "var(--border-strong)"}`,
    borderRadius: 9, padding: "10px 12px",
    fontFamily: ADMIN_FONT, fontSize: 13.5, fontWeight: 500, color: "var(--fg)",
  };
}

function EditLabel({ children, changed }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
      <span style={{ fontFamily: ADMIN_MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-subtle)" }}>{children}</span>
      {changed && <span title="Unsaved change" style={{ width: 6, height: 6, borderRadius: 3, background: "var(--signal)", boxShadow: "0 0 0 3px color-mix(in oklab, var(--signal) 22%, transparent)" }} />}
    </div>
  );
}

// type: text | number | time | select | textarea | tags | readonly | mono
// Extraction-source tag (structured | llm | community | admin) — distinct from the
// price SourceBadge in admin-review (which only knows crawled/community/admin).
function SrcTag({ source }) {
  if (!source) return <StatusBadge kind="danger" variant="outline" mono>no source</StatusBadge>;
  const kind = { structured: "signal", llm: "accent", community: "accent", admin: "warning", crawled: "signal" }[source] || "neutral";
  return <StatusBadge kind={kind} variant="outline" mono>{source}</StatusBadge>;
}

function EditField({ label, type = "text", value, placeholder, prefix, changed, error, help, focus, options, tags, full }) {
  let control;
  if (type === "readonly" || type === "mono") {
    control = (
      <div style={{ ...editBoxStyle(false), background: "var(--surface-1)", color: "var(--fg-muted)", fontFamily: type === "mono" ? ADMIN_MONO : ADMIN_FONT, display: "flex", alignItems: "center", gap: 8 }}>
        {value}
      </div>
    );
  } else if (type === "select") {
    control = (
      <div style={{ ...editBoxStyle(error, focus), display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
        <span style={{ flex: 1, color: value ? "var(--fg)" : "var(--fg-subtle)" }}>{value || placeholder}</span>
        <AdminIcon name="chevD" size={14} color="var(--fg-muted)" />
      </div>
    );
  } else if (type === "textarea") {
    control = <div style={{ ...editBoxStyle(error, focus), minHeight: 64, color: value ? "var(--fg)" : "var(--fg-subtle)", lineHeight: 1.5 }}>{value || placeholder}</div>;
  } else if (type === "tags") {
    control = (
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {(tags || []).map(t => (
          <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 6px 5px 10px", borderRadius: 7, background: "var(--surface-1)", border: "1px solid var(--border)", fontFamily: ADMIN_MONO, fontSize: 11, fontWeight: 600, color: "var(--fg)" }}>
            {t}<AdminIcon name="x" size={11} color="var(--fg-subtle)" />
          </span>
        ))}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, border: "1px dashed var(--border-strong)", fontFamily: ADMIN_MONO, fontSize: 11, fontWeight: 600, color: "var(--fg-subtle)", cursor: "pointer" }}>
          <AdminIcon name="plus" size={11} /> add genre
        </span>
      </div>
    );
  } else {
    // text / number / time
    control = (
      <div style={{ ...editBoxStyle(error, focus), display: "flex", alignItems: "center", gap: 6, fontFamily: type === "number" || type === "time" ? ADMIN_MONO : ADMIN_FONT }}>
        {prefix && <span style={{ color: "var(--fg-subtle)", fontFamily: ADMIN_MONO }}>{prefix}</span>}
        <span style={{ flex: 1, color: value ? "var(--fg)" : "var(--fg-subtle)", fontWeight: type === "number" || type === "time" ? 600 : 500 }}>{value || placeholder}</span>
      </div>
    );
  }
  return (
    <div style={{ gridColumn: full ? "1 / -1" : "auto", minWidth: 0 }}>
      <EditLabel changed={changed}>{label}</EditLabel>
      {control}
      {error && <div style={{ marginTop: 6, fontFamily: ADMIN_FONT, fontSize: 12, fontWeight: 600, color: "var(--danger)", display: "flex", alignItems: "center", gap: 6 }}><AdminIcon name="alert" size={13} color="var(--danger)" />{error}</div>}
      {help && !error && <div style={{ marginTop: 6, fontFamily: ADMIN_FONT, fontSize: 11.5, color: "var(--fg-subtle)", lineHeight: 1.5 }}>{help}</div>}
    </div>
  );
}

function EditSegmented({ options, value, danger }) {
  return (
    <div style={{ display: "inline-flex", padding: 3, gap: 2, background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 9 }}>
      {options.map(o => {
        const a = o.k === value;
        const tint = o.kind || "signal";
        return (
          <span key={o.k} style={{
            display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 14px", borderRadius: 6, cursor: "pointer",
            fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: a ? 700 : 500,
            color: a ? (o.kind ? `var(--${o.kind})` : "var(--fg)") : "var(--fg-muted)",
            background: a ? "var(--bg-elevated)" : "transparent",
            boxShadow: a ? "0 1px 2px rgba(0,0,0,0.14), 0 0 0 1px var(--border)" : "none",
          }}>
            {o.icon && <AdminIcon name={o.icon} size={13} color={a && o.kind ? `var(--${o.kind})` : "currentColor"} />}
            {o.label}
          </span>
        );
      })}
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────
function EditSection({ n, title, children, action }) {
  return (
    <Panel
      title={<span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, fontWeight: 700, color: "var(--fg-subtle)" }}>{n}</span>
        <span style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700, color: "var(--fg)" }}>{title}</span>
      </span>}
      action={action}
    >
      {children}
    </Panel>
  );
}

const editGrid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 };

// ── Status section (lifecycle + verification) ─────────────────────────
function StatusSection({ lifecycle = "upcoming", soldOut = false, verified = false, confidence = 0.74, source = "llm", changed, changedSoldOut }) {
  const lcOpts = [
    { k: "upcoming", label: "Upcoming", kind: null },
    { k: "postponed", label: "Postponed", kind: "warning", icon: "pause" },
    { k: "cancelled", label: "Cancelled", kind: "danger", icon: "x" },
  ];
  return (
    <EditSection n="04" title="Status">
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Two orthogonal controls side by side: lifecycle (events.status) + availability (sold-out report) */}
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <EditLabel changed={changed}>status · events.status</EditLabel>
            <EditSegmented options={lcOpts} value={lifecycle} />
          </div>
          <div>
            <EditLabel changed={changedSoldOut}>availability</EditLabel>
            <EditSegmented options={[{ k: "available", label: "Available", kind: null }, { k: "soldout", label: "Sold out", kind: "accent", icon: "alertTri" }]} value={soldOut ? "soldout" : "available"} />
          </div>
        </div>
        {lifecycle === "postponed" && (
          <div style={{ ...editGrid }}>
            <EditField label="New date" type="text" value="" placeholder="TBD — to be rescheduled" changed={changed} help="Leave as TBD if the venue hasn't announced one. Fans see a 'Postponed' banner either way." />
            <EditField label="Note · optional" type="text" value="" placeholder="e.g. artist illness, rescheduling" />
          </div>
        )}
        {lifecycle === "cancelled" && (
          <EditField label="Cancellation note · optional" type="text" value="" placeholder="e.g. cancelled by venue" full help="Stays published with a 'Cancelled' banner so fans who saved it are informed. Use Mark non-concert or Delete to remove it from the app." />
        )}
        {soldOut && (
          <div style={{ padding: "14px 16px", borderRadius: 10, background: "color-mix(in oklab, var(--accent) 6%, var(--bg-elevated))", border: "1px solid color-mix(in oklab, var(--accent) 28%, transparent)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <AdminIcon name="alertTri" size={14} color="var(--accent)" />
              <span style={{ fontFamily: ADMIN_FONT, fontSize: 12.5, color: "var(--fg)", lineHeight: 1.5 }}>
                Files an <strong>admin-authored sold-out report</strong> — same record the community submits, so the fan banner is one code path. Stays published. Provenance is optional but recommended.
              </span>
            </div>
            <div style={{ ...editGrid }}>
              <EditField label="Source" type="select" value="Venue page" />
              <EditField label="URL · optional" type="text" value="" placeholder="https://…" />
              <EditField label="Note · optional" type="text" value="" placeholder="e.g. confirmed at box office" full />
            </div>
          </div>
        )}
        {lifecycle === "upcoming" && !soldOut && (
          <div style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-subtle)", lineHeight: 1.5 }}>
            Postponed, cancelled, and sold-out events all stay published with a fan-facing banner — none are hidden.
          </div>
        )}
        <div style={{ height: 1, background: "var(--border)" }} />
        <div>
          <EditLabel>verification</EditLabel>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <EditSegmented options={[{ k: "unverified", label: "Unverified", kind: "warning" }, { k: "verified", label: "Verified", kind: "success", icon: "check" }]} value={verified ? "verified" : "unverified"} />
            <div style={{ display: "flex", gap: 18, fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)" }}>
              <span>confidence <span style={{ fontFamily: ADMIN_MONO, fontWeight: 700, color: "var(--fg)" }}>{confidence.toFixed(2)}</span></span>
              <span>source <SrcTag source={source} /></span>
            </div>
          </div>
        </div>
      </div>
    </EditSection>
  );
}

// ── Save bar (sticky) ─────────────────────────────────────────────────
function SaveBar({ count = 0 }) {
  const dirty = count > 0;
  return (
    <div style={{
      position: "sticky", bottom: 0, marginTop: 4, zIndex: 40,
      display: "flex", alignItems: "center", gap: 14, padding: "12px 18px",
      background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", borderRadius: 13,
      boxShadow: "0 -2px 0 var(--bg), 0 14px 36px rgba(0,0,0,0.28)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, flex: 1 }}>
        {dirty
          ? <><span style={{ width: 8, height: 8, borderRadius: 4, background: "var(--signal)" }} /><span style={{ fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>{count} unsaved change{count === 1 ? "" : "s"}</span></>
          : <span style={{ fontFamily: ADMIN_FONT, fontSize: 13, color: "var(--fg-subtle)" }}>No unsaved changes.</span>}
      </div>
      <AdminButton variant="ghost" disabled={!dirty}>Discard</AdminButton>
      <AdminButton variant="primary" icon="check" disabled={!dirty}>Save changes</AdminButton>
    </div>
  );
}

// ── Danger zone ───────────────────────────────────────────────────────
function DangerZone() {
  return (
    <div style={{ border: "1px solid color-mix(in oklab, var(--danger) 30%, transparent)", borderRadius: 13, background: "color-mix(in oklab, var(--danger) 5%, var(--bg-elevated))", padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <MonoLabel color="var(--danger)">danger zone</MonoLabel>
          <div style={{ fontFamily: ADMIN_FONT, fontSize: 13.5, fontWeight: 700, color: "var(--fg)", marginTop: 6 }}>Delete this event</div>
          <div style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)", marginTop: 2, maxWidth: 520, lineHeight: 1.5 }}>
            Removes it from the catalog and the consumer app, with any fan-submitted prices. Recorded in the audit log. Use Mark non-concert instead if it should stay in the system but leave the app.
          </div>
        </div>
        <AdminButton variant="danger" icon="x">Delete event…</AdminButton>
      </div>
    </div>
  );
}

// ── Editor header ─────────────────────────────────────────────────────
function EditorHeader({ ev }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ marginBottom: 7, display: "flex", alignItems: "center", gap: 10 }}>
          <MonoLabel>edit event · {ev.id}</MonoLabel>
        </div>
        <h1 style={{ margin: 0, fontFamily: ADMIN_FONT, fontSize: 26, fontWeight: 700, letterSpacing: "-0.025em", color: "var(--fg)", lineHeight: 1.1 }}>{ev.title}</h1>
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontFamily: ADMIN_FONT, fontSize: 13, color: "var(--fg-muted)" }}>{ev.venue} · {ev.date}{ev.time ? ` · ${ev.time}` : ""}</span>
          <LifecycleBadge status={ev.lifecycle} />
          <VerifyMark verified={ev.verified} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <AdminButton variant="outline" size="sm" icon="external">View detail</AdminButton>
      </div>
    </div>
  );
}

// ── Full-page editor (desktop) ────────────────────────────────────────
// props: ev, changeCount, errors {field: msg}, lifecycle, changed {field:true}, dangerOpen
function EventEditorPage(props = {}) {
  const ev = props.ev || ALL_EVENTS[2];
  const lifecycle = props.lifecycle || ev.lifecycle || "upcoming";
  const errors = props.errors || {};
  const changed = props.changed || {};
  const count = props.changeCount || 0;
  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 18, maxWidth: 920 }}>
      <EditorHeader ev={ev} />

      <EditSection n="01" title="Identity">
        <div style={{ ...editGrid }}>
          <EditField label="Title" value={errors.title ? "" : ev.title} placeholder="Event title" changed={changed.title} error={errors.title} full />
          <EditField label="Artist / lineup" value={ev.artist} placeholder="Headliner + support" changed={changed.artist} />
          <EditField label="Venue" type="select" value={ev.venue} changed={changed.venue} />
          <EditField label="Date" type="text" value={ev.date} placeholder="Jun 20" />
          <EditField label="Doors" type="time" value="7:00 PM" />
          <EditField label="Show" type="time" value={ev.time} placeholder="8:00 PM" error={errors.time} />
        </div>
      </EditSection>

      <EditSection n="02" title="Pricing">
        <div style={{ ...editGrid }}>
          <EditField label="Price low" type="number" prefix="$" value={ev.price ? String(ev.price.low) : ""} placeholder="35" changed={changed.priceLow} />
          <EditField label="Price high" type="number" prefix="$" value={ev.price ? String(ev.price.high) : "120"} placeholder="65" changed={changed.priceHigh} error={errors.priceHigh} />
          <EditField label="Source" type="readonly" value={<SrcTag source={ev.source} />} />
          <EditField label="Updated" type="mono" value="May 14 · 12:14 by crawl" />
        </div>
      </EditSection>

      <EditSection n="03" title="Classification">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <EditField label="Genre tags" type="tags" tags={ev.genres} changed={changed.genres} help={(!ev.genres || ev.genres.length === 0) ? "No genre yet — this event won't surface in genre browse." : null} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "12px 14px", background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 9 }}>
            <div>
              <div style={{ fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>Mark as non-concert</div>
              <div style={{ fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>Adds the <StatusBadge kind="neutral" mono>non-concert</StatusBadge> tag and unpublishes from the consumer app. Stays in the system.</div>
            </div>
            <AdminButton variant="outline" size="sm" icon="flag">Mark non-concert</AdminButton>
          </div>
        </div>
      </EditSection>

      <StatusSection lifecycle={lifecycle} soldOut={props.soldOut != null ? props.soldOut : ev.soldOut} verified={ev.verified} confidence={ev.confidence} source={ev.source} changed={changed.lifecycle} changedSoldOut={changed.soldOut} />

      <EditSection n="05" title="Identity art" action={<AdminButton variant="ghost" size="sm" icon="refresh">Regenerate</AdminButton>}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ width: 96, height: 96, borderRadius: 12, flexShrink: 0, background: "repeating-linear-gradient(135deg, var(--surface-1) 0 10px, var(--surface-2) 10px 20px)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: ADMIN_MONO, fontSize: 10, color: "var(--fg-subtle)", textAlign: "center", lineHeight: 1.4 }}>identity<br/>art</span>
          </div>
          <div style={{ fontFamily: ADMIN_FONT, fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.6, maxWidth: 460 }}>
            Generated from <span style={{ fontFamily: ADMIN_MONO, color: "var(--fg)" }}>artist · {ev.artist}</span>. Regenerate rerolls the seed. Swaps to a real press photo automatically when one lands (Phase 8).
          </div>
        </div>
      </EditSection>

      <DangerZone />
      <SaveBar count={count} />

      {props.dangerOpen && <DeleteEventConfirm ev={ev} />}
    </div>
  );
}

// ── Mobile editor ─────────────────────────────────────────────────────
function EventEditorMobile(props = {}) {
  const ev = props.ev || ALL_EVENTS[2];
  const lifecycle = props.lifecycle || ev.lifecycle || "upcoming";
  const count = props.changeCount || 0;
  const changed = props.changed || {};
  const errors = props.errors || {};
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 8 }}>
      <div>
        <MonoLabel>edit event · {ev.id}</MonoLabel>
        <h1 style={{ margin: "7px 0 0", fontFamily: ADMIN_FONT, fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--fg)", lineHeight: 1.15 }}>{ev.title}</h1>
        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <LifecycleBadge status={lifecycle} />
          <VerifyMark verified={ev.verified} />
        </div>
      </div>

      <EditSection n="01" title="Identity">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <EditField label="Title" value={ev.title} changed={changed.title} />
          <EditField label="Artist / lineup" value={ev.artist} />
          <EditField label="Venue" type="select" value={ev.venue} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <EditField label="Doors" type="time" value="7:00 PM" />
            <EditField label="Show" type="time" value={ev.time} placeholder="8:00 PM" />
          </div>
        </div>
      </EditSection>

      <EditSection n="02" title="Pricing">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <EditField label="Price low" type="number" prefix="$" value={ev.price ? String(ev.price.low) : ""} placeholder="35" />
          <EditField label="Price high" type="number" prefix="$" value={ev.price ? String(ev.price.high) : ""} placeholder="65" error={errors.priceHigh} />
        </div>
      </EditSection>

      <EditSection n="03" title="Classification">
        <EditField label="Genre tags" type="tags" tags={ev.genres} />
      </EditSection>

      <StatusSection lifecycle={lifecycle} soldOut={props.soldOut != null ? props.soldOut : ev.soldOut} verified={ev.verified} confidence={ev.confidence} source={ev.source} changed={changed.lifecycle} changedSoldOut={changed.soldOut} />

      <DangerZone />

      {/* sticky save bar handled by the phone shell overlay in the canvas */}
      <SaveBar count={count} />
    </div>
  );
}

Object.assign(window, {
  editBoxStyle, EditLabel, EditField, EditSegmented, EditSection, SrcTag,
  StatusSection, SaveBar, DangerZone, EditorHeader,
  EventEditorPage, EventEditorMobile,
});

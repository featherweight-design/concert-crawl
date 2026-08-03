// guide-admin.jsx — #764 admin surfaces
// The first-timer-guide block on the admin venue-edit page: chip picker
// (7 optional + accessibility locked/required), a field per selected chip, and
// the free-form vibe line. States: populated · empty · validation.
// Automation lives here, never on display — every chip is voice-passed before publish.
//
// Uses shared admin primitives (Panel, AdminButton, StatusBadge, MonoLabel,
// AdminIcon, Kbd) via window. Admin shares the consumer token system.

const AF = window.ADMIN_FONT, AM = window.ADMIN_MONO;
const { Panel, AdminButton, StatusBadge, MonoLabel, AdminIcon, Kbd } = window;
const { GuideIcon, CHIP_ORDER, CHIP_DEFS, ADMIN_COPY, V2_CHIPS } = window;

// ── Chip state dot — blank | authored | honest_placeholder ────────────────
function ChipStateDot({ state, size = 7 }) {
  const map = {
    blank: { c: "var(--fg-subtle)", fill: false },
    authored: { c: "var(--success)", fill: true },
    honest_placeholder: { c: "var(--warning)", fill: true },
  }[state] || { c: "var(--fg-subtle)", fill: false };
  return <span style={{ width: size, height: size, borderRadius: size, flexShrink: 0,
    background: map.fill ? map.c : "transparent",
    border: map.fill ? "none" : `1.5px solid ${map.c}`,
    boxShadow: map.fill ? `0 0 0 3px color-mix(in oklab, ${map.c} 20%, transparent)` : "none" }} />;
}

// ── Field label ────────────────────────────────────────────────────────────
function AFieldLabel({ icon, children, required, state, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 8 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: AF, fontSize: 12.5,
        fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.005em" }}>
        {icon && <span style={{ color: "var(--fg-muted)", display: "flex" }}><GuideIcon name={icon} size={14} /></span>}
        {children}
        {required && <span style={{ fontFamily: AM, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
          color: "var(--signal)" }}>REQUIRED</span>}
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        {state && <ChipStateDot state={state} />}
        {right}
      </span>
    </div>
  );
}

// ── Textarea (matches admin TextField chrome) ──────────────────────────────
function AdminTextarea({ value, onChange, placeholder, error, rows = 2, autoFocus }) {
  const [focused, setFocused] = React.useState(false);
  const border = error ? "var(--danger)" : focused ? "var(--signal)" : "var(--border-strong)";
  const ring = focused && !error ? "0 0 0 3px color-mix(in oklab, var(--signal) 22%, transparent)"
    : error ? "0 0 0 3px color-mix(in oklab, var(--danger) 18%, transparent)" : "none";
  return (
    <textarea value={value} rows={rows} autoFocus={autoFocus}
      onChange={(e) => onChange && onChange(e.target.value)}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      placeholder={placeholder}
      style={{ all: "unset", boxSizing: "border-box", display: "block", width: "100%",
        padding: "9px 12px", borderRadius: 8, border: `1px solid ${border}`,
        background: "var(--bg-elevated)", boxShadow: ring, transition: "border-color .12s, box-shadow .12s",
        fontFamily: AF, fontSize: 13, fontWeight: 500, color: "var(--fg)", lineHeight: 1.5,
        letterSpacing: "-0.005em", resize: "none", whiteSpace: "pre-wrap" }} />
  );
}

function FieldHelp({ children, error }) {
  return (
    <div style={{ marginTop: 6, display: "flex", alignItems: "flex-start", gap: 6, fontFamily: AF,
      fontSize: 11.5, lineHeight: 1.45, color: error ? "var(--danger)" : "var(--fg-muted)" }}>
      {error && <span style={{ flexShrink: 0, marginTop: 1 }}><AdminIcon name="alert" size={12} /></span>}
      <span>{children}</span>
    </div>
  );
}

// ── Chip picker (7 optional toggles + a peek at the growing pool) ──────────
function ChipPicker({ selected, onToggle }) {
  const opts = CHIP_ORDER.filter((k) => k !== "accessibility");
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
      {opts.map((k) => {
        const on = selected.includes(k);
        return (
          <button key={k} onClick={() => onToggle(k)} aria-pressed={on} style={{
            all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
            minHeight: 32, padding: "0 11px", borderRadius: 999, boxSizing: "border-box",
            fontFamily: AF, fontSize: 12, fontWeight: 600, letterSpacing: "-0.005em",
            background: on ? "color-mix(in oklab, var(--signal) 14%, transparent)" : "var(--surface-1)",
            color: on ? "var(--signal)" : "var(--fg-muted)",
            border: `1px solid ${on ? "color-mix(in oklab, var(--signal) 40%, transparent)" : "var(--border-strong)"}` }}>
            <GuideIcon name={CHIP_DEFS[k].icon} size={13} />
            {CHIP_DEFS[k].label}
            <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.8 }}>{on ? "−" : "+"}</span>
          </button>
        );
      })}
      {/* v2 pool (#997) — ghosted so the finite-but-growing model is legible */}
      {(V2_CHIPS || []).map((c) => (
        <span key={c.key} title="" style={{ display: "inline-flex", alignItems: "center", gap: 5,
          minHeight: 32, padding: "0 11px", borderRadius: 999, boxSizing: "border-box",
          fontFamily: AF, fontSize: 12, fontWeight: 500, color: "var(--fg-subtle)",
          border: "1px dashed var(--border)", opacity: 0.6 }}>{c.label}</span>
      ))}
      <span style={{ display: "inline-flex", alignItems: "center", fontFamily: AM, fontSize: 9.5,
        fontWeight: 700, letterSpacing: "0.08em", color: "var(--fg-subtle)", padding: "0 4px" }}>SOON · #997</span>
    </div>
  );
}

// ── One authored-chip field ────────────────────────────────────────────────
function ChipField({ chipKey, value, onChange, onRemove }) {
  const def = CHIP_DEFS[chipKey];
  return (
    <div>
      <AFieldLabel icon={def.icon} state={window.chipState(value)}
        right={<button onClick={onRemove} aria-label={`Remove ${def.label}`} style={{ all: "unset",
          cursor: "pointer", fontFamily: AM, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
          color: "var(--fg-subtle)" }}>REMOVE</button>}>
        {def.label}
      </AFieldLabel>
      <AdminTextarea value={value} onChange={onChange} placeholder={ADMIN_COPY.fieldPlaceholder[chipKey]} />
    </div>
  );
}

// ── Accessibility field — pinned, required, two-mode (author / placeholder) ─
function AccessField({ value, onChange, placeholderMode, onTogglePlaceholder, error }) {
  const state = placeholderMode ? "honest_placeholder" : window.chipState(value);
  return (
    <div style={{ padding: 14, borderRadius: 10, background: "var(--surface-1)",
      border: `1px solid ${error ? "var(--danger)" : "var(--border)"}` }}>
      <AFieldLabel icon="access" required state={state}>Accessibility</AFieldLabel>
      {placeholderMode ? (
        <div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--bg-elevated)",
          border: "1px dashed var(--border-strong)", fontFamily: AF, fontSize: 12.5, color: "var(--fg-muted)",
          lineHeight: 1.5 }}>
          Will show the honest placeholder on the venue page:
          <span style={{ display: "block", marginTop: 4, color: "var(--fg)", fontStyle: "italic" }}>
            “{window.PLACEHOLDER_COPY.accessibility}”
          </span>
        </div>
      ) : (
        <AdminTextarea value={value} onChange={onChange} placeholder={ADMIN_COPY.accessPlaceholder}
          error={error} rows={2} />
      )}
      <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <FieldHelp error={error}>
          {error ? "Accessibility is required to publish — author it or mark it not-yet-documented." : ADMIN_COPY.accessRequired}
        </FieldHelp>
        <button onClick={onTogglePlaceholder} style={{ all: "unset", cursor: "pointer", flexShrink: 0,
          display: "inline-flex", alignItems: "center", gap: 6, fontFamily: AF, fontSize: 11.5, fontWeight: 600,
          color: placeholderMode ? "var(--warning)" : "var(--fg-muted)" }}>
          <span style={{ width: 26, height: 15, borderRadius: 999, position: "relative", flexShrink: 0,
            background: placeholderMode ? "var(--warning)" : "var(--surface-3)", transition: "background .15s" }}>
            <span style={{ position: "absolute", top: 2, left: placeholderMode ? 13 : 2, width: 11, height: 11,
              borderRadius: 999, background: "var(--bg-elevated)", transition: "left .15s" }} />
          </span>
          Can't document yet
        </button>
      </div>
    </div>
  );
}

// ── Voice-reminder strip ────────────────────────────────────────────────────
function VoiceReminder() {
  return (
    <div style={{ display: "flex", gap: 9, padding: "10px 12px", borderRadius: 9,
      background: "color-mix(in oklab, var(--accent) 9%, transparent)",
      border: "1px solid color-mix(in oklab, var(--accent) 26%, transparent)" }}>
      <span style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }}><AdminIcon name="alertTri" size={14} /></span>
      <div style={{ fontFamily: AF, fontSize: 11.5, color: "var(--fg-muted)", lineHeight: 1.5 }}>
        {ADMIN_COPY.voiceReminder}
      </div>
    </div>
  );
}

// ── The block ────────────────────────────────────────────────────────────────
const SEED = {
  populated: {
    access: window.ROXY_GUIDE_COPY.accessibility, placeholder: false,
    selected: ["parking", "age", "coat", "transit"],
    values: {
      parking: window.ROXY_GUIDE_COPY.parking, age: window.ROXY_GUIDE_COPY.age,
      coat: window.ROXY_GUIDE_COPY.coat, transit: window.ROXY_GUIDE_COPY.transit,
    },
    vibe: window.ROXY_VIBE,
  },
  empty: { access: "", placeholder: false, selected: [], values: {}, vibe: "" },
  validation: {
    access: "", placeholder: false, selected: ["parking"],
    values: { parking: window.ROXY_GUIDE_COPY.parking }, vibe: "",
  },
};

// `tip`: which CCTip is open, for the review canvas. The header ⓘ carries the
// chip-state legend (the card that used to sit below this form), the "Add more
// chips" label carries the voice rules, and the publish footer carries the
// publish gate. Passing nothing renders the ⓘs closed, which is production.
function GuideAdminBlock({ variant = "populated", venueName = "The Roxy", tip = null }) {
  const seed = SEED[variant] || SEED.populated;
  const [access, setAccess] = React.useState(seed.access);
  const [placeholderMode, setPlaceholderMode] = React.useState(seed.placeholder);
  const [selected, setSelected] = React.useState(seed.selected);
  const [values, setValues] = React.useState(seed.values);
  const [vibe, setVibe] = React.useState(seed.vibe);
  const [showError, setShowError] = React.useState(variant === "validation");

  const accessSatisfied = placeholderMode || access.trim().length > 0;
  const accessError = showError && !accessSatisfied;

  const toggle = (k) => setSelected((s) => s.includes(k) ? s.filter((x) => x !== k) : [...s, k]);
  const setVal = (k, v) => setValues((m) => ({ ...m, [k]: v }));

  const publishState = accessSatisfied
    ? (placeholderMode ? { kind: "warning", label: "Publishable · access marked undocumented" } : { kind: "success", label: "Ready to publish" })
    : { kind: "danger", label: "Blocked · accessibility required" };

  return (
    <Panel
      title={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        {ADMIN_COPY.blockTitle}
        <MonoLabel color="var(--fg-subtle)">{venueName}</MonoLabel>
        <CCTip tip="chip-states" surface="desktop" size="sm" placement="bottom" align="start"
          defaultOpen={tip === "chip-states"} /></span>}
      action={<StatusBadge kind={publishState.kind} dot>{publishState.label}</StatusBadge>}
      padding={18}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontFamily: AF, fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.5, marginTop: -2 }}>
          {ADMIN_COPY.blockSub}
        </div>

        {/* Insider tip — surfaced HIGHEST. The hero of the guide; the thing that
            makes us read like we've actually been to the room. */}
        <div style={{ padding: 14, borderRadius: 10,
          background: "color-mix(in oklab, var(--accent) 9%, transparent)",
          border: "1px solid color-mix(in oklab, var(--accent) 28%, transparent)" }}>
          <AFieldLabel state={window.chipState(vibe)}
            right={<span style={{ fontFamily: AM, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
              color: "var(--accent)" }}>SURFACED FIRST</span>}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
                <circle cx="5" cy="14.5" r="1.5" fill="var(--accent)" opacity="0.55" />
                <circle cx="10" cy="10" r="2" fill="var(--accent)" opacity="0.8" />
                <circle cx="15" cy="5" r="2.6" fill="var(--signal)" /></svg>
              {ADMIN_COPY.vibeLabel}
            </span>
          </AFieldLabel>
          <AdminTextarea value={vibe} onChange={setVibe} placeholder={ADMIN_COPY.vibePlaceholder} rows={3} />
          <FieldHelp>{ADMIN_COPY.vibeHelp}</FieldHelp>
        </div>

        {showError && !accessSatisfied && (
          <div style={{ display: "flex", gap: 9, padding: "10px 12px", borderRadius: 9,
            background: "color-mix(in oklab, var(--danger) 12%, transparent)",
            border: "1px solid color-mix(in oklab, var(--danger) 34%, transparent)" }}>
            <span style={{ color: "var(--danger)", flexShrink: 0, marginTop: 1 }}><AdminIcon name="alert" size={14} /></span>
            <div style={{ fontFamily: AF, fontSize: 12, color: "var(--fg)", lineHeight: 1.5 }}>
              <strong style={{ fontWeight: 700 }}>Can't publish yet.</strong>{" "}
              <span style={{ color: "var(--fg-muted)" }}>Accessibility is the one field every venue needs. Fill it in, or flip “Can't document yet” to publish the honest placeholder.</span>
            </div>
          </div>
        )}

        <AccessField value={access} onChange={setAccess} placeholderMode={placeholderMode}
          onTogglePlaceholder={() => setPlaceholderMode((p) => !p)} error={accessError} />

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <MonoLabel>Add more chips</MonoLabel>
            <CCTip tip="guide-voice" surface="desktop" size="sm" placement="bottom" align="start"
              defaultOpen={tip === "guide-voice"} />
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontFamily: AM, fontSize: 10, color: "var(--fg-subtle)", letterSpacing: "0.04em" }}>
              {selected.length} of {CHIP_ORDER.length - 1}</span>
          </div>
          <ChipPicker selected={selected} onToggle={toggle} />
        </div>

        {selected.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 2 }}>
            {CHIP_ORDER.filter((k) => k !== "accessibility" && selected.includes(k)).map((k) => (
              <ChipField key={k} chipKey={k} value={values[k] || ""}
                onChange={(v) => setVal(k, v)} onRemove={() => toggle(k)} />
            ))}
          </div>
        )}

        <VoiceReminder />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          paddingTop: 4, borderTop: "1px solid var(--border)", marginTop: -2 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: AF, fontSize: 11.5,
            color: "var(--fg-subtle)" }}>
            <Kbd>⌘</Kbd><Kbd>↵</Kbd> publish
            <CCTip tip="publish-gate" surface="desktop" size="sm" placement="top" align="start"
              defaultOpen={tip === "publish-gate"} />
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <AdminButton variant="ghost" size="sm">Save draft</AdminButton>
            <AdminButton variant="primary" size="sm" icon="check"
              onClick={() => { if (!accessSatisfied) setShowError(true); }}>Publish guide</AdminButton>
          </div>
        </div>
      </div>
    </Panel>
  );
}

// ── Chip-state legend (blank / authored / honest_placeholder) ──────────────
function ChipStateLegend() {
  const rows = [
    { state: "blank", title: "Blank", body: "No content yet. Optional chips stay hidden on the venue page — never shown empty." },
    { state: "authored", title: "Authored", body: "A concert-goer-voice line the admin wrote and voice-passed. This is what ships to display." },
    { state: "honest_placeholder", title: "Honest placeholder", body: "Accessibility only. Satisfies the publish gate without faking content — shows “not documented yet, call the venue.”" },
  ];
  return (
    <div style={{ padding: 18, background: "var(--bg-elevated)", border: "1px solid var(--border)",
      borderRadius: 12, fontFamily: AF }}>
      <MonoLabel>Chip state indicators</MonoLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: 12 }}>
        {rows.map((r, i) => (
          <div key={r.state} style={{ display: "flex", gap: 12, padding: "12px 0",
            borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
            <div style={{ width: 20, display: "flex", justifyContent: "center", paddingTop: 3, flexShrink: 0 }}>
              <ChipStateDot state={r.state} size={9} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>{r.title}</div>
              <div style={{ fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.5, marginTop: 2 }}>{r.body}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  ChipStateDot, AdminTextarea, ChipPicker, ChipField, AccessField,
  GuideAdminBlock, ChipStateLegend,
});

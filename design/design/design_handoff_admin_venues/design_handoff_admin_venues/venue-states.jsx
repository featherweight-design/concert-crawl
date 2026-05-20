// venue-states.jsx — Engineering reference for field, button, submission states
// and the double-confirmation delete dialog. Renders four showcase artboards.

const VS_FONT = window.ADMIN_FONT;
const VS_MONO = window.ADMIN_MONO;

// ── Tiny helpers ───────────────────────────────────────────────────────

function StateLabel({ children, sub }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontFamily: VS_MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-subtle)" }}>{children}</div>
      {sub && <div style={{ marginTop: 2, fontFamily: VS_FONT, fontSize: 11.5, color: "var(--fg-muted)" }}>{sub}</div>}
    </div>
  );
}

function ShowcaseGrid({ cols = 2, gap = 24, children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gap }}>{children}</div>
  );
}

function ShowcaseHeader({ eyebrow, title, subtitle }) {
  return (
    <div style={{ marginBottom: 28, paddingBottom: 18, borderBottom: "1px solid var(--border)" }}>
      <div style={{ fontFamily: VS_MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--signal)" }}>{eyebrow}</div>
      <h1 style={{ margin: "6px 0 0", fontFamily: VS_FONT, fontSize: 28, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.02em" }}>{title}</h1>
      {subtitle && <div style={{ marginTop: 6, fontFamily: VS_FONT, fontSize: 14, color: "var(--fg-muted)", maxWidth: 720, lineHeight: 1.5 }}>{subtitle}</div>}
    </div>
  );
}

// ── DemoField: visually-forced field states ────────────────────────────

function DemoField({ state = "default", value = "", placeholder = "https://example.com/events/", helper, prefix, suffix, mono = true }) {
  const palette = {
    default:  { border: "var(--border-strong)", ring: "none",                                                         bg: "var(--bg-elevated)", color: "var(--fg)", phc: "var(--fg-subtle)" },
    hover:    { border: "color-mix(in oklab, var(--fg) 38%, var(--border-strong))", ring: "none",                     bg: "var(--bg-elevated)", color: "var(--fg)", phc: "var(--fg-subtle)" },
    focused:  { border: "var(--signal)", ring: "0 0 0 3px color-mix(in oklab, var(--signal) 22%, transparent)",      bg: "var(--bg-elevated)", color: "var(--fg)", phc: "var(--fg-subtle)" },
    filled:   { border: "var(--border-strong)", ring: "none",                                                         bg: "var(--bg-elevated)", color: "var(--fg)", phc: "var(--fg-subtle)" },
    success:  { border: "color-mix(in oklab, var(--success) 60%, transparent)", ring: "0 0 0 3px color-mix(in oklab, var(--success) 18%, transparent)", bg: "var(--bg-elevated)", color: "var(--fg)", phc: "var(--fg-subtle)" },
    error:    { border: "var(--danger)", ring: "0 0 0 3px color-mix(in oklab, var(--danger) 18%, transparent)",      bg: "var(--bg-elevated)", color: "var(--fg)", phc: "var(--fg-subtle)" },
    disabled: { border: "var(--border)", ring: "none",                                                                bg: "var(--surface-1)",   color: "var(--fg-subtle)", phc: "var(--fg-subtle)" },
    readonly: { border: "var(--border)", ring: "none",                                                                bg: "var(--surface-1)",   color: "var(--fg)", phc: "var(--fg-subtle)" },
  }[state];

  const fakeFocus = state === "focused";
  const dim = state === "disabled";

  return (
    <div style={{ opacity: dim ? 0.66 : 1 }}>
      <div style={{
        display: "flex", alignItems: "stretch", height: 38, borderRadius: 8,
        border: `1px solid ${palette.border}`,
        background: palette.bg,
        boxShadow: palette.ring,
        overflow: "hidden",
        transition: "border-color .12s, box-shadow .12s",
      }}>
        {prefix && (
          <div style={{ display: "flex", alignItems: "center", padding: "0 10px", color: "var(--fg-subtle)", borderRight: "1px solid var(--border)", background: "var(--surface-1)", fontFamily: VS_MONO, fontSize: 12 }}>{prefix}</div>
        )}
        <div style={{
          flex: 1, minWidth: 0, padding: "0 12px",
          display: "flex", alignItems: "center",
          fontFamily: mono ? VS_MONO : VS_FONT, fontSize: mono ? 12.5 : 13.5, fontWeight: 500,
          color: value ? palette.color : palette.phc,
          letterSpacing: mono ? "0.01em" : "-0.005em",
        }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value || placeholder}</span>
          {fakeFocus && <span style={{ marginLeft: 1, width: 1, height: 16, background: "var(--signal)", animation: "vsCaret 1s steps(2, end) infinite" }} />}
        </div>
        {suffix && (
          <div style={{ display: "flex", alignItems: "center", padding: "0 10px", color: "var(--fg-subtle)" }}>{suffix}</div>
        )}
      </div>
      {helper && (
        <div style={{
          marginTop: 6, fontFamily: VS_FONT, fontSize: 12, lineHeight: 1.4,
          color: state === "error" ? "var(--danger)" : state === "success" ? "var(--success)" : "var(--fg-muted)",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          {state === "error" && <AdminIcon name="alert" size={12} />}
          {state === "success" && <AdminIcon name="check" size={12} />}
          {helper}
        </div>
      )}
    </div>
  );
}

// ── Showcase: Field States ─────────────────────────────────────────────

function FieldStatesShowcase() {
  return (
    <div style={{ padding: "32px 36px", background: "var(--bg)", height: "100%", overflow: "auto" }}>
      <ShowcaseHeader
        eyebrow="Add Venue · form states"
        title="Field states"
        subtitle="Every text input in the Add Venue modal and the Edit page uses these states. Helpers and ring colors are token-driven — no hex codes baked in."
      />

      <ShowcaseGrid cols={2} gap={28}>
        <div>
          <StateLabel sub="No interaction yet. Placeholder visible.">Default · empty</StateLabel>
          <DemoField state="default" placeholder="https://www.bluebirdtheater.net/calendar/" mono />
        </div>
        <div>
          <StateLabel sub="Pointer over field. Border darkens 1 step.">Hover</StateLabel>
          <DemoField state="hover" placeholder="https://www.bluebirdtheater.net/calendar/" mono />
        </div>

        <div>
          <StateLabel sub="Signal border + 3px focus ring. Caret blinks.">Focused</StateLabel>
          <DemoField state="focused" value="https://www.bluebir" mono />
        </div>
        <div>
          <StateLabel sub="Has value, unfocused. Identical chrome to default.">Filled</StateLabel>
          <DemoField state="filled" value="https://www.bluebirdtheater.net/calendar/" mono helper="The events page we'll crawl daily at 3 AM MT." />
        </div>

        <div>
          <StateLabel sub="Validation pass. Used after async checks (robots, slug uniqueness).">Success</StateLabel>
          <DemoField state="success" value="bluebird-theater" mono
            prefix="concertcrawl.app/v/"
            helper="Slug is available." />
        </div>
        <div>
          <StateLabel sub="Inline validation failure. Danger ring + helper.">Error</StateLabel>
          <DemoField state="error" value="https://bluebird" mono
            helper="Enter a fully-qualified URL, including https://" />
        </div>

        <div>
          <StateLabel sub="Submitting or backend-locked. 66% opacity, no ring.">Disabled</StateLabel>
          <DemoField state="disabled" value="bluebird-theater" mono prefix="concertcrawl.app/v/" />
        </div>
        <div>
          <StateLabel sub="Surface-1 bg, no border emphasis. Cursor stays default.">Read-only</StateLabel>
          <DemoField state="readonly" value="ven_01HZK2PXMQT9R7XVE3CN8DGAW1" mono helper="System-generated. Used in audit logs and webhooks." />
        </div>
      </ShowcaseGrid>

      <div style={{ marginTop: 36, padding: "18px 20px", background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 12 }}>
        <div style={{ fontFamily: VS_MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-subtle)", marginBottom: 8 }}>Validation patterns</div>
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "8px 14px", fontFamily: VS_FONT, fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.5 }}>
          <div style={{ color: "var(--fg)", fontWeight: 600 }}>Name</div><div>Required. 2–80 chars. Trimmed on save.</div>
          <div style={{ color: "var(--fg)", fontWeight: 600 }}>Slug</div><div>Required. <span style={{ fontFamily: VS_MONO }}>/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/</span> · 2–60 chars · unique across venues.</div>
          <div style={{ color: "var(--fg)", fontWeight: 600 }}>Source URL</div><div>Required. Must parse as <span style={{ fontFamily: VS_MONO }}>https?://</span> URL. Live robots.txt check on blur/paste — non-blocking warning, never blocks save.</div>
          <div style={{ color: "var(--fg)", fontWeight: 600 }}>City</div><div>Required. 2–60 chars. Free text for now (no canonical list).</div>
        </div>
      </div>
      <style>{`@keyframes vsCaret { 0%, 50% { opacity: 1 } 50.01%, 100% { opacity: 0 } }`}</style>
    </div>
  );
}

// ── Showcase: Submission States (Add modal) ────────────────────────────

function MiniModal({ state }) {
  // A compact recreation of the Add modal footer + relevant chrome per state.
  const submitting = state === "submitting";
  const success = state === "success";
  const failure = state === "failure";
  const validating = state === "validating";

  return (
    <div style={{
      width: 460, background: "var(--bg-elevated)",
      border: "1px solid var(--border)", borderRadius: 14,
      boxShadow: "var(--shadow-lg)", overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid var(--border)" }}>
        <MonoLabel>new venue</MonoLabel>
        <h3 style={{ margin: "4px 0 0", fontFamily: VS_FONT, fontSize: 17, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.02em" }}>Add a crawl target</h3>
      </div>

      {/* Failure banner */}
      {failure && (
        <div style={{
          margin: "14px 18px 0", padding: "10px 12px",
          background: "color-mix(in oklab, var(--danger) 10%, transparent)",
          border: "1px solid color-mix(in oklab, var(--danger) 40%, transparent)",
          borderRadius: 8, display: "flex", gap: 10, alignItems: "flex-start",
        }}>
          <AdminIcon name="alert" size={14} color="var(--danger)" />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: VS_FONT, fontSize: 12.5, fontWeight: 700, color: "var(--danger)" }}>Couldn't save venue</div>
            <div style={{ fontFamily: VS_MONO, fontSize: 11, color: "var(--fg-muted)", marginTop: 2 }}>409 — A venue with slug <b style={{ color: "var(--fg)" }}>bluebird-theater</b> already exists.</div>
          </div>
        </div>
      )}

      {/* Body fields (abbreviated) */}
      <div style={{ padding: "14px 18px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <FieldLabel>Venue name</FieldLabel>
          <DemoField state={submitting || success ? "disabled" : "filled"} value="Bluebird Theater" mono={false} />
        </div>
        <div>
          <FieldLabel hint={validating ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: VS_MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-subtle)" }}><Spinner size={10} color="var(--fg-subtle)" /> checking</span> : <StatusBadge kind="success" mono>robots ok</StatusBadge>}>Source URL</FieldLabel>
          <DemoField state={validating ? "focused" : submitting || success ? "disabled" : failure ? "error" : "filled"} value="https://www.bluebirdtheater.net/calendar/" mono helper={failure ? null : null} />
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderTop: "1px solid var(--border)", background: "var(--surface-1)", gap: 12 }}>
        <span style={{ fontFamily: VS_FONT, fontSize: 11.5, color: "var(--fg-subtle)" }}>
          {success ? "Saved. Closing…" : submitting ? "Saving & queuing crawl…" : <span><Kbd>Esc</Kbd> cancel</span>}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <DemoBtn variant="ghost" state={success || submitting ? "disabled" : "default"}>Cancel</DemoBtn>
          <DemoBtn variant="outline" state={success || submitting ? "disabled" : "default"}>Save venue</DemoBtn>
          <DemoBtn variant="primary" icon={submitting ? "spinner" : success ? "check" : "play"}
            state={submitting ? "loading" : success ? "success" : "default"}
            trailing={<span style={{ display: "inline-flex", gap: 2, opacity: 0.75 }}><Kbd>⌘</Kbd><Kbd>↵</Kbd></span>}>
            {submitting ? "Saving…" : success ? "Saved" : "Save & crawl now"}
          </DemoBtn>
        </div>
      </div>
    </div>
  );
}

function SuccessToast() {
  return (
    <div style={{
      marginTop: 14,
      display: "inline-flex", alignItems: "center", gap: 12,
      padding: "8px 8px 8px 12px",
      background: "var(--ink)", color: "var(--paper)",
      borderRadius: 999, boxShadow: "var(--shadow-lg)",
    }}>
      {/* Success swatch: --fg-on-accent flips per theme so the check always
          renders with ≥4.5:1 on the success fill — dark glyph on light green
          (Electric/Jade), light glyph on dark green (Light). */}
      <span style={{ width: 18, height: 18, borderRadius: 999, background: "var(--success)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <AdminIcon name="check" size={11} color="var(--fg-on-accent)" strokeWidth={3} />
      </span>
      <span style={{ fontFamily: VS_FONT, fontSize: 13, fontWeight: 600 }}>Bluebird Theater added</span>
      <span style={{ fontFamily: VS_MONO, fontSize: 11, opacity: 0.6, letterSpacing: "0.04em" }}>·  crawl queued</span>
      {/* High-contrast inset button — inverts back to page surface so it reads as
          a clear action regardless of theme. Min 4.5:1 against the ink bar. */}
      <a href="#" style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "5px 11px", marginLeft: 4,
        borderRadius: 999,
        background: "var(--paper)", color: "var(--ink)",
        fontFamily: VS_FONT, fontSize: 12, fontWeight: 700, letterSpacing: "-0.005em",
        textDecoration: "none",
      }}>View<AdminIcon name="chevR" size={11} /></a>
    </div>
  );
}

function SubmissionStatesShowcase() {
  return (
    <div style={{ padding: "32px 36px", background: "var(--bg)", height: "100%", overflow: "auto" }}>
      <ShowcaseHeader
        eyebrow="Add Venue · submission flow"
        title="Submission states"
        subtitle="Form-level states from the moment the user clicks Save through success or failure. The primary button always shows its current state — disabled, loading spinner, or check on success."
      />

      <ShowcaseGrid cols={2} gap={32}>
        <div>
          <StateLabel sub="Async robots.txt or slug-uniqueness check in flight. Inputs stay editable; only the affected field shows a checking chip.">1 · Validating (async)</StateLabel>
          <MiniModal state="validating" />
        </div>
        <div>
          <StateLabel sub="POST in flight. All fields disabled. Primary button shows spinner + 'Saving…'. Cancel disabled to prevent abort mid-write.">2 · Submitting</StateLabel>
          <MiniModal state="submitting" />
        </div>
        <div>
          <StateLabel sub="Server returned 4xx/5xx. Banner at top names the failure; affected field gets error state. Buttons re-enable.">3 · Failure</StateLabel>
          <MiniModal state="failure" />
        </div>
        <div>
          <StateLabel sub="201 Created. Button flips to ✓ Saved for ~400ms, modal dismisses, success toast appears on the Venues table.">4 · Success</StateLabel>
          <MiniModal state="success" />
          <SuccessToast />
        </div>
      </ShowcaseGrid>

      <div style={{ marginTop: 36, padding: "18px 20px", background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 12 }}>
        <div style={{ fontFamily: VS_MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-subtle)", marginBottom: 10 }}>Keyboard</div>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 14px", fontFamily: VS_FONT, fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.5 }}>
          <div style={{ display: "flex", gap: 4 }}><Kbd>Esc</Kbd></div><div>Cancels the modal (discards unsaved input).</div>
          <div style={{ display: "flex", gap: 4 }}><Kbd>↵</Kbd></div><div>From a focused field, advances to the next required field. From the last field, focuses <b style={{ color: "var(--fg)" }}>Save venue</b>.</div>
          <div style={{ display: "flex", gap: 4 }}><Kbd>⌘</Kbd><Kbd>↵</Kbd></div><div>Triggers the <b style={{ color: "var(--fg)" }}>primary</b> action — <span style={{ fontFamily: VS_MONO, color: "var(--fg)" }}>Save &amp; crawl now</span> in the Add modal. Hint sits inside the primary button so the binding is unambiguous.</div>
        </div>
      </div>
    </div>
  );
}

// ── DemoBtn: visually-forced button states ─────────────────────────────

function DemoBtn({ variant = "primary", state = "default", icon, iconRight, trailing, size = "md", children }) {
  const sizes = {
    sm: { h: 28, px: 11, fs: 12,   gap: 6 },
    md: { h: 36, px: 14, fs: 13,   gap: 8 },
    lg: { h: 42, px: 18, fs: 14,   gap: 8 },
  }[size];

  // Base palettes per variant
  const variants = {
    primary: {
      base:    { bg: "var(--signal)", color: "var(--fg-on-accent)", border: "var(--signal)", ring: "none", shadow: "var(--shadow-sm)" },
      hover:   { bg: "color-mix(in oklab, var(--signal) 88%, var(--fg))", color: "var(--fg-on-accent)", border: "color-mix(in oklab, var(--signal) 88%, var(--fg))", ring: "none", shadow: "var(--shadow-md)" },
      focus:   { bg: "var(--signal)", color: "var(--fg-on-accent)", border: "var(--signal)", ring: "0 0 0 3px color-mix(in oklab, var(--signal) 35%, transparent)", shadow: "none" },
      pressed: { bg: "color-mix(in oklab, var(--signal) 78%, var(--ink))", color: "var(--fg-on-accent)", border: "color-mix(in oklab, var(--signal) 78%, var(--ink))", ring: "none", shadow: "none" },
      loading: { bg: "color-mix(in oklab, var(--signal) 78%, var(--ink))", color: "var(--fg-on-accent)", border: "color-mix(in oklab, var(--signal) 78%, var(--ink))", ring: "none", shadow: "none" },
      success: { bg: "var(--success)", color: "var(--fg-on-accent)", border: "var(--success)", ring: "none", shadow: "none" },
      disabled:{ bg: "var(--surface-2)", color: "var(--fg-subtle)", border: "var(--border)", ring: "none", shadow: "none" },
    },
    outline: {
      base:    { bg: "transparent", color: "var(--fg)", border: "var(--border-strong)", ring: "none", shadow: "none" },
      hover:   { bg: "var(--overlay-hover)", color: "var(--fg)", border: "var(--border-strong)", ring: "none", shadow: "none" },
      focus:   { bg: "transparent", color: "var(--fg)", border: "var(--signal)", ring: "0 0 0 3px color-mix(in oklab, var(--signal) 22%, transparent)", shadow: "none" },
      pressed: { bg: "color-mix(in oklab, var(--fg) 8%, transparent)", color: "var(--fg)", border: "var(--border-strong)", ring: "none", shadow: "none" },
      loading: { bg: "transparent", color: "var(--fg-muted)", border: "var(--border-strong)", ring: "none", shadow: "none" },
      disabled:{ bg: "transparent", color: "var(--fg-subtle)", border: "var(--border)", ring: "none", shadow: "none" },
    },
    ghost: {
      base:    { bg: "transparent", color: "var(--fg-muted)", border: "transparent", ring: "none", shadow: "none" },
      hover:   { bg: "var(--overlay-hover)", color: "var(--fg)", border: "transparent", ring: "none", shadow: "none" },
      focus:   { bg: "transparent", color: "var(--fg)", border: "transparent", ring: "0 0 0 3px color-mix(in oklab, var(--signal) 22%, transparent)", shadow: "none" },
      pressed: { bg: "color-mix(in oklab, var(--fg) 8%, transparent)", color: "var(--fg)", border: "transparent", ring: "none", shadow: "none" },
      loading: { bg: "transparent", color: "var(--fg-subtle)", border: "transparent", ring: "none", shadow: "none" },
      disabled:{ bg: "transparent", color: "var(--fg-subtle)", border: "transparent", ring: "none", shadow: "none" },
    },
    danger: {
      base:    { bg: "var(--danger)", color: "white", border: "var(--danger)", ring: "none", shadow: "var(--shadow-sm)" },
      hover:   { bg: "color-mix(in oklab, var(--danger) 88%, var(--ink))", color: "white", border: "color-mix(in oklab, var(--danger) 88%, var(--ink))", ring: "none", shadow: "var(--shadow-md)" },
      focus:   { bg: "var(--danger)", color: "white", border: "var(--danger)", ring: "0 0 0 3px color-mix(in oklab, var(--danger) 35%, transparent)", shadow: "none" },
      pressed: { bg: "color-mix(in oklab, var(--danger) 76%, var(--ink))", color: "white", border: "color-mix(in oklab, var(--danger) 76%, var(--ink))", ring: "none", shadow: "none" },
      loading: { bg: "color-mix(in oklab, var(--danger) 76%, var(--ink))", color: "white", border: "color-mix(in oklab, var(--danger) 76%, var(--ink))", ring: "none", shadow: "none" },
      disabled:{ bg: "var(--surface-2)", color: "var(--fg-subtle)", border: "var(--border)", ring: "none", shadow: "none" },
    },
    "danger-outline": {
      base:    { bg: "transparent", color: "var(--danger)", border: "color-mix(in oklab, var(--danger) 50%, var(--border-strong))", ring: "none", shadow: "none" },
      hover:   { bg: "color-mix(in oklab, var(--danger) 10%, transparent)", color: "var(--danger)", border: "var(--danger)", ring: "none", shadow: "none" },
      focus:   { bg: "transparent", color: "var(--danger)", border: "var(--danger)", ring: "0 0 0 3px color-mix(in oklab, var(--danger) 22%, transparent)", shadow: "none" },
      pressed: { bg: "color-mix(in oklab, var(--danger) 18%, transparent)", color: "var(--danger)", border: "var(--danger)", ring: "none", shadow: "none" },
      loading: { bg: "transparent", color: "var(--fg-muted)", border: "var(--border-strong)", ring: "none", shadow: "none" },
      disabled:{ bg: "transparent", color: "var(--fg-subtle)", border: "var(--border)", ring: "none", shadow: "none" },
    },
    inverse: {
      // For the dark save bar — light button on dark ink surface
      base:    { bg: "var(--paper)", color: "var(--ink)", border: "var(--paper)", ring: "none", shadow: "none" },
      hover:   { bg: "color-mix(in oklab, var(--paper) 86%, var(--ink))", color: "var(--ink)", border: "color-mix(in oklab, var(--paper) 86%, var(--ink))", ring: "none", shadow: "none" },
      focus:   { bg: "var(--paper)", color: "var(--ink)", border: "var(--paper)", ring: "0 0 0 3px color-mix(in oklab, var(--signal) 50%, transparent)", shadow: "none" },
      pressed: { bg: "color-mix(in oklab, var(--paper) 72%, var(--ink))", color: "var(--ink)", border: "color-mix(in oklab, var(--paper) 72%, var(--ink))", ring: "none", shadow: "none" },
      loading: { bg: "color-mix(in oklab, var(--paper) 72%, var(--ink))", color: "var(--ink)", border: "color-mix(in oklab, var(--paper) 72%, var(--ink))", ring: "none", shadow: "none" },
      disabled:{ bg: "color-mix(in oklab, var(--paper) 40%, transparent)", color: "color-mix(in oklab, var(--ink) 50%, transparent)", border: "transparent", ring: "none", shadow: "none" },
    },
  };

  const stateKey = state === "default" ? "base" : state;
  const p = variants[variant][stateKey] || variants[variant].base;

  const showIcon = state === "loading" ? "spinner" : state === "success" ? "check" : icon;

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: sizes.gap,
      height: sizes.h, padding: `0 ${sizes.px}px`,
      borderRadius: 8,
      background: p.bg, color: p.color,
      border: `1px solid ${p.border}`, boxShadow: p.ring !== "none" ? p.ring : p.shadow,
      fontFamily: VS_FONT, fontSize: sizes.fs, fontWeight: 700, letterSpacing: "-0.005em",
      cursor: state === "disabled" || state === "loading" ? "not-allowed" : "pointer",
      transition: "background .12s, border-color .12s, box-shadow .12s",
      whiteSpace: "nowrap",
    }}>
      {showIcon === "spinner" ? <Spinner size={sizes.fs} color="currentColor" /> : showIcon ? <AdminIcon name={showIcon} size={sizes.fs} /> : null}
      <span>{children}</span>
      {iconRight && state !== "loading" && state !== "success" && <AdminIcon name={iconRight} size={sizes.fs} />}
      {trailing && state !== "loading" && state !== "success" && <span style={{ marginLeft: 2 }}>{trailing}</span>}
    </span>
  );
}

// ── Showcase: Button States ────────────────────────────────────────────

function ButtonStatesShowcase() {
  const STATES = ["default", "hover", "focus", "pressed", "loading", "disabled"];

  const Row = ({ label, sub, variant, icon, iconRight, children, size = "md" }) => (
    <div style={{
      display: "grid", gridTemplateColumns: "180px repeat(6, minmax(0, 1fr))",
      alignItems: "center", gap: 14,
      padding: "16px 18px",
      borderTop: "1px solid var(--border)",
    }}>
      <div>
        <div style={{ fontFamily: VS_FONT, fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>{label}</div>
        {sub && <div style={{ fontFamily: VS_MONO, fontSize: 10.5, color: "var(--fg-subtle)", marginTop: 3, letterSpacing: "0.02em" }}>{sub}</div>}
      </div>
      {STATES.map((s) => (
        <div key={s} style={{ display: "flex", justifyContent: "flex-start" }}>
          <DemoBtn variant={variant} state={s} icon={icon} iconRight={iconRight} size={size}>{children}</DemoBtn>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ padding: "32px 36px", background: "var(--bg)", height: "100%", overflow: "auto" }}>
      <ShowcaseHeader
        eyebrow="Venue Details · action states"
        title="Button states"
        subtitle="Each row is one button used on the Add or Edit screens. Columns are interaction states. Focus uses a 3px signal-tinted ring; pressed darkens the fill; loading swaps icon → spinner and disables clicks."
      />

      <div style={{
        background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12,
        overflow: "hidden",
      }}>
        {/* Header row */}
        <div style={{
          display: "grid", gridTemplateColumns: "180px repeat(6, minmax(0, 1fr))",
          alignItems: "center", gap: 14,
          padding: "10px 18px", background: "var(--surface-1)",
        }}>
          <div style={{ fontFamily: VS_MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fg-subtle)" }}>button</div>
          {STATES.map((s) => (
            <div key={s} style={{ fontFamily: VS_MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fg-subtle)" }}>{s}</div>
          ))}
        </div>

        <Row label="Trigger crawl" sub="Edit · primary" variant="primary" icon="refresh">Trigger crawl</Row>
        <Row label="View public page" sub="Edit · header right" variant="outline" icon="external">View public page</Row>
        <Row label="Save changes" sub="Sticky save bar · primary" variant="inverse">Save changes</Row>
        <Row label="Discard" sub="Sticky save bar · ghost" variant="ghost">Discard</Row>
        <Row label="Pause venue" sub="Danger zone · outline" variant="outline" size="sm">Pause</Row>
        <Row label="Unverify venue" sub="Verification card · ghost" variant="ghost" icon="x" size="sm">Unverify venue</Row>
        <Row label="Delete…" sub="Danger zone · danger" variant="danger" size="sm">Delete…</Row>
        <Row label="Confirm delete" sub="Dialog · final danger" variant="danger" icon="alert">Delete venue</Row>
      </div>

      <div style={{ marginTop: 28, padding: "18px 20px", background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 12 }}>
        <div style={{ fontFamily: VS_MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-subtle)", marginBottom: 10 }}>State transitions</div>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 14px", fontFamily: VS_FONT, fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.5 }}>
          <div style={{ color: "var(--fg)", fontWeight: 600 }}>120ms</div><div>Background, border, and box-shadow transitions on hover and pressed.</div>
          <div style={{ color: "var(--fg)", fontWeight: 600 }}>Focus ring</div><div>3px <span style={{ fontFamily: VS_MONO }}>color-mix(in oklab, var(--signal) 22%, transparent)</span> — visible on keyboard nav only (use <span style={{ fontFamily: VS_MONO }}>:focus-visible</span>).</div>
          <div style={{ color: "var(--fg)", fontWeight: 600 }}>Loading</div><div>Disables pointer events. Icon swaps to spinner. Label may change to gerund ("Saving…", "Crawling…").</div>
          <div style={{ color: "var(--fg)", fontWeight: 600 }}>Success</div><div>Optional ~400ms checkmark flash before navigating or closing. Used only for save-style actions.</div>
        </div>
      </div>
    </div>
  );
}

// ── Delete Venue · double confirmation dialog ──────────────────────────

function DeleteVenueDialog({ venueName = "Bluebird Theater", typed = "" }) {
  const armed = typed === venueName;
  return (
    <div style={{
      width: 520,
      background: "var(--bg-elevated)",
      border: "1px solid color-mix(in oklab, var(--danger) 30%, var(--border))",
      borderRadius: 14,
      boxShadow: "var(--shadow-lg)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "20px 22px 16px", display: "flex", gap: 14, alignItems: "flex-start", borderBottom: "1px solid var(--border)" }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: "color-mix(in oklab, var(--danger) 14%, transparent)",
          border: "1px solid color-mix(in oklab, var(--danger) 40%, transparent)",
          display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <AdminIcon name="alert" size={18} color="var(--danger)" />
        </div>
        <div style={{ minWidth: 0 }}>
          <MonoLabel color="var(--danger)">danger · permanent</MonoLabel>
          <h3 style={{ margin: "4px 0 0", fontFamily: VS_FONT, fontSize: 20, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.02em" }}>Delete {venueName}?</h3>
        </div>
      </div>

      {/* Consequences */}
      <div style={{ padding: "16px 22px 4px" }}>
        <div style={{ fontFamily: VS_FONT, fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.55, marginBottom: 14 }}>
          This will <b style={{ color: "var(--fg)" }}>permanently delete</b> the venue and detach all events that reference it. This cannot be undone.
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { icon: "x", text: <><b style={{ color: "var(--fg)" }}>1 venue</b> deleted from <span style={{ fontFamily: VS_MONO, color: "var(--fg)" }}>venues</span> table.</> },
            { icon: "inbox", text: <><b style={{ color: "var(--fg)" }}>247 events</b> will have their <span style={{ fontFamily: VS_MONO, color: "var(--fg)" }}>venue_id</span> nulled. Events remain published.</> },
            { icon: "refresh", text: <>All scheduled crawls for this venue stop immediately.</> },
            { icon: "external", text: <>Public page at <span style={{ fontFamily: VS_MONO, color: "var(--fg)" }}>concertcrawl.app/v/bluebird-theater</span> will 404.</> },
          ].map((row, i) => (
            <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontFamily: VS_FONT, fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.5 }}>
              <span style={{ width: 22, height: 22, borderRadius: 6, background: "var(--surface-1)", border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--fg-subtle)" }}>
                <AdminIcon name={row.icon} size={11} />
              </span>
              <span>{row.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Confirmation input */}
      <div style={{ padding: "16px 22px 4px" }}>
        <FieldLabel>Type <span style={{ fontFamily: VS_MONO, color: "var(--fg)", background: "var(--surface-2)", padding: "1px 6px", borderRadius: 4, fontSize: 11.5 }}>{venueName}</span> to confirm</FieldLabel>
        <DemoField state={armed ? "success" : typed ? "error" : "focused"} value={typed} placeholder={venueName} mono={false}
          helper={armed ? "Match — delete is now enabled." : typed ? `Doesn't match "${venueName}". Type exactly, including capitalization.` : null} />
      </div>

      {/* Footer */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 22px", marginTop: 16, borderTop: "1px solid var(--border)",
        background: "color-mix(in oklab, var(--danger) 5%, var(--surface-1))",
        gap: 12,
      }}>
        <span style={{ fontFamily: VS_FONT, fontSize: 11.5, color: "var(--fg-subtle)" }}>
          <Kbd>Esc</Kbd> cancel
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <DemoBtn variant="ghost">Cancel</DemoBtn>
          <DemoBtn variant="danger" state={armed ? "default" : "disabled"} icon="alert">Delete venue</DemoBtn>
        </div>
      </div>
    </div>
  );
}

function DeleteDialogShowcase() {
  return (
    <div style={{ padding: "32px 36px", background: "var(--bg)", height: "100%", overflow: "auto" }}>
      <ShowcaseHeader
        eyebrow="Venue Details · delete flow"
        title="Delete venue · double-confirmation"
        subtitle="Triggered from Danger zone → Delete…. The dialog lists exactly what will change, then requires the user to type the venue name verbatim. Final action is destructive and unrecoverable."
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, alignItems: "flex-start" }}>
        <div>
          <StateLabel sub="Dialog opens. Confirmation field is focused but empty. Primary delete button is disabled.">1 · Opened (delete disabled)</StateLabel>
          <DeleteVenueDialog typed="" />
        </div>
        <div>
          <StateLabel sub="User typed the name but case or spelling doesn't match. Field shows error helper. Primary still disabled.">2 · Mismatch (still disabled)</StateLabel>
          <DeleteVenueDialog typed="bluebird theater" />
        </div>
        <div style={{ gridColumn: "1 / -1", maxWidth: 540 }}>
          <StateLabel sub="Exact match. Field flips to success, primary button arms. ⌘↵ also triggers — no extra confirmation; the typed name *is* the second confirmation.">3 · Armed (delete enabled)</StateLabel>
          <DeleteVenueDialog typed="Bluebird Theater" />
        </div>
      </div>

      <div style={{ marginTop: 36, padding: "18px 20px", background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 12 }}>
        <div style={{ fontFamily: VS_MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-subtle)", marginBottom: 10 }}>Behavior notes</div>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 14px", fontFamily: VS_FONT, fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.5 }}>
          <div style={{ color: "var(--fg)", fontWeight: 600 }}>Type-to-confirm</div><div>Case-sensitive, whitespace-trimmed. Compares against the venue's display name (not slug).</div>
          <div style={{ color: "var(--fg)", fontWeight: 600 }}>On submit</div><div>POST <span style={{ fontFamily: VS_MONO }}>DELETE /admin/venues/:id</span>. Button shows loading state. On 2xx: dialog closes, user returns to <span style={{ fontFamily: VS_MONO }}>/admin/venues</span> with a toast "Venue deleted. 247 events detached.".</div>
          <div style={{ color: "var(--fg)", fontWeight: 600 }}>Audit log</div><div>Action recorded with actor, venue id, event count detached, and pre-delete snapshot of venue row.</div>
          <div style={{ color: "var(--fg)", fontWeight: 600 }}>Escape hatch</div><div><Kbd>Esc</Kbd> and clicking the scrim both cancel safely — no submit on backdrop click.</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  FieldStatesShowcase,
  SubmissionStatesShowcase,
  ButtonStatesShowcase,
  DeleteDialogShowcase,
  DeleteVenueDialog,
  DemoField,
  DemoBtn,
});

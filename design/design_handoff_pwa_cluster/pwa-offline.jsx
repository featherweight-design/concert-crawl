// pwa-offline.jsx — #970 offline-state polish
// Header pill (role=status) + full-page offline fallback with a cached-shortcuts
// list driven by SW cache state, plus the honest empty state. Tokens only.

const { PWA_FONT: OF, PWA_MONO: OM } = window;
const { Eyebrow, PrimaryButton, Icon } = window;
const { AppChrome } = window;
const { OFFLINE_COPY, CACHED_EVENTS, CACHED_VENUES } = window;

// ── Header offline pill — announced politely, --warning dot (not --danger) ──
function OfflinePill({ compact = false }) {
  return (
    <div role="status" aria-live="polite" aria-label={OFFLINE_COPY.pillAria}
      style={{ display: "inline-flex", alignItems: "center", gap: 7, minHeight: 40,
        padding: compact ? "0 11px" : "0 12px", borderRadius: 999,
        background: "color-mix(in oklab, var(--warning) 14%, transparent)",
        border: "1px solid color-mix(in oklab, var(--warning) 34%, transparent)",
        boxSizing: "border-box" }}>
      <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 999,
        background: "var(--warning)", boxShadow: "0 0 0 3px color-mix(in oklab, var(--warning) 22%, transparent)",
        flexShrink: 0 }} />
      <span style={{ fontFamily: OM, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
        textTransform: "uppercase", color: "var(--warning)", whiteSpace: "nowrap" }}>
        {OFFLINE_COPY.pillLabel}</span>
    </div>
  );
}

// ── Small cached art tile (deterministic tint, no network) ─────────────────
function CacheTile({ name, size = 46 }) {
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const hues = [280, 200, 340, 160, 30, 220, 310, 180];
  const hue = hues[hash % hues.length];
  return (
    <div style={{ width: size, height: size, borderRadius: 8, flexShrink: 0,
      background: `linear-gradient(135deg, oklch(0.34 0.08 ${hue}), oklch(0.22 0.06 ${hue + 40}))`,
      display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <span style={{ fontFamily: OF, fontWeight: 800, fontSize: size * 0.4,
        color: `oklch(0.78 0.12 ${hue})`, opacity: 0.75 }}>{name.charAt(0).toUpperCase()}</span>
    </div>
  );
}

// ── Cached shortcuts list ──────────────────────────────────────────────────
function CachedShortcuts() {
  return (
    <div style={{ marginTop: 26 }}>
      <Eyebrow style={{ marginBottom: 10 }}>{OFFLINE_COPY.fallback.shortcutsLabel}</Eyebrow>

      <Eyebrow color="var(--fg-subtle)" size={9} style={{ marginBottom: 8 }}>Recent shows</Eyebrow>
      <div style={{ borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden",
        background: "var(--surface-1)" }}>
        {CACHED_EVENTS.map((e, i) => (
          <a key={i} href="#" onClick={(ev) => ev.preventDefault()} style={{ all: "unset",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 12, padding: "11px 13px",
            borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
            <CacheTile name={e.artist} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: OF, fontWeight: 700, fontSize: 14, color: "var(--fg)",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.artist}</div>
              <div style={{ fontFamily: OM, fontSize: 9.5, color: "var(--fg-muted)", marginTop: 2 }}>
                {e.venue} · {e.when}</div>
            </div>
            <span style={{ fontFamily: OF, fontWeight: 800, fontSize: 13, color: "var(--fg-muted)",
              flexShrink: 0 }}>{e.price}</span>
          </a>
        ))}
      </div>

      <Eyebrow color="var(--fg-subtle)" size={9} style={{ margin: "16px 0 8px" }}>Venues</Eyebrow>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {CACHED_VENUES.map((v, i) => (
          <a key={i} href="#" onClick={(ev) => ev.preventDefault()} style={{ all: "unset",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: "11px 13px",
            borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface-1)" }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: "var(--surface-3)",
              color: "var(--fg-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="pin" size={17} color="var(--fg-muted)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: OF, fontWeight: 700, fontSize: 14, color: "var(--fg)" }}>{v.name}</div>
              <div style={{ fontFamily: OM, fontSize: 9.5, color: "var(--fg-muted)", marginTop: 2 }}>{v.meta}</div>
            </div>
            <Icon name="chevron" size={15} color="var(--fg-subtle)" />
          </a>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16, padding: "11px 13px", borderRadius: 10,
        background: "var(--surface-1)", border: "1px solid var(--border)" }}>
        <Icon name="cloudoff" size={15} color="var(--fg-subtle)" />
        <span style={{ fontFamily: OF, fontSize: 12, color: "var(--fg-subtle)", lineHeight: 1.45,
          textWrap: "pretty" }}>{OFFLINE_COPY.fallback.authNote}</span>
      </div>
    </div>
  );
}

// ── Empty cached state — honest, not defeatist ─────────────────────────────
function CachedEmpty() {
  const c = OFFLINE_COPY.fallback.empty;
  return (
    <div style={{ marginTop: 26, padding: "26px 20px", borderRadius: 14, textAlign: "center",
      background: "var(--surface-1)", border: "1px dashed var(--border-strong)" }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, margin: "0 auto 14px",
        background: "var(--surface-3)", color: "var(--fg-subtle)",
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name="cloudoff" size={24} color="var(--fg-subtle)" />
      </div>
      <div style={{ fontFamily: OF, fontWeight: 800, fontSize: 17, color: "var(--fg)",
        letterSpacing: "-0.02em" }}>{c.title}</div>
      <p style={{ margin: "8px auto 0", maxWidth: 320, fontFamily: OF, fontSize: 13.5,
        color: "var(--fg-muted)", lineHeight: 1.5, textWrap: "pretty" }}>{c.sub}</p>
    </div>
  );
}

// ── Full offline fallback page ─────────────────────────────────────────────
function OfflineFallback({ empty = false, desktop = false, tight = false }) {
  const c = OFFLINE_COPY.fallback;
  const maxW = desktop ? 640 : "100%";
  return (
    <div style={{ background: "var(--bg)", color: "var(--fg)", fontFamily: OF, minHeight: "100%" }}>
      <AppChrome slot={<OfflinePill compact />} desktop={desktop} tight={tight} />
      <div style={{ maxWidth: maxW, margin: "0 auto", padding: desktop ? "40px 24px 48px" : "26px 18px 32px" }}>
        <div style={{ width: 52, height: 52, borderRadius: 14,
          background: "color-mix(in oklab, var(--warning) 14%, transparent)", color: "var(--warning)",
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <Icon name="cloudoff" size={26} color="var(--warning)" />
        </div>
        <Eyebrow color="var(--warning)" style={{ marginBottom: 8 }}>{c.eyebrow}</Eyebrow>
        <h1 style={{ margin: 0, fontFamily: OF, fontWeight: 900, fontSize: desktop ? 34 : 26,
          letterSpacing: "-0.03em", color: "var(--fg)", lineHeight: 1.12, textWrap: "pretty" }}>{c.title}</h1>
        <p style={{ margin: "10px 0 0", maxWidth: 460, fontFamily: OF, fontSize: 14.5,
          color: "var(--fg-muted)", lineHeight: 1.5, textWrap: "pretty" }}>{c.sub}</p>
        <div style={{ marginTop: 18 }}>
          <PrimaryButton full={!desktop} style={desktop ? { minWidth: 200 } : undefined}>
            <Icon name="retry" size={17} color="var(--fg-on-accent)" />{c.retry}
          </PrimaryButton>
        </div>

        {empty ? <CachedEmpty /> : <CachedShortcuts />}

        {empty && (
          <div style={{ marginTop: 18, textAlign: "center" }}>
            <a href="#" onClick={(e) => e.preventDefault()} style={{ fontFamily: OM, fontSize: 11,
              fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
              color: "var(--signal)", textDecoration: "none" }}>{c.empty.link} →</a>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { OfflinePill, OfflineFallback, CachedShortcuts, CachedEmpty, CacheTile });

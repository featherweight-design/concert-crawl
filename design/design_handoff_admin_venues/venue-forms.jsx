// venue-forms.jsx — Concert Crawl admin: Add Venue (modal) + Venue Details (full page Edit)
// Reuses admin design system primitives loaded from ../design_handoff_admin_ui/

const VF_FONT = window.ADMIN_FONT;
const VF_MONO = window.ADMIN_MONO;

// ── Small atoms ─────────────────────────────────────────────────────────

function FieldLabel({ children, optional, hint }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
      <span style={{ fontFamily: VF_FONT, fontSize: 12, fontWeight: 600, color: "var(--fg)", letterSpacing: "-0.005em" }}>
        {children}
        {optional && <span style={{ color: "var(--fg-subtle)", fontWeight: 500, marginLeft: 6 }}>optional</span>}
      </span>
      {hint && (
        <span style={{ fontFamily: VF_MONO, fontSize: 10, color: "var(--fg-subtle)", letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 700 }}>
          {hint}
        </span>
      )}
    </div>
  );
}

function TextField({ value, onChange, placeholder, prefix, suffix, error, helper, mono, autoFocus, readOnly, style }) {
  const [focused, setFocused] = React.useState(false);
  const borderColor = error ? "var(--danger)" : focused ? "var(--signal)" : "var(--border-strong)";
  const ring = focused && !error ? `0 0 0 3px color-mix(in oklab, var(--signal) 22%, transparent)` : error ? `0 0 0 3px color-mix(in oklab, var(--danger) 18%, transparent)` : "none";
  return (
    <div>
      <div style={{
        display: "flex", alignItems: "stretch",
        height: 38, borderRadius: 8,
        border: `1px solid ${borderColor}`,
        background: "var(--bg-elevated)",
        boxShadow: ring,
        transition: "border-color .12s, box-shadow .12s",
        overflow: "hidden",
        ...style,
      }}>
        {prefix && (
          <div style={{ display: "flex", alignItems: "center", padding: "0 10px", color: "var(--fg-subtle)", borderRight: "1px solid var(--border)", background: "var(--surface-1)" }}>
            {prefix}
          </div>
        )}
        <input
          autoFocus={autoFocus}
          readOnly={readOnly}
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          style={{
            all: "unset", boxSizing: "border-box",
            flex: 1, minWidth: 0, padding: "0 12px",
            fontFamily: mono ? VF_MONO : VF_FONT,
            fontSize: mono ? 12.5 : 13.5, fontWeight: 500,
            color: "var(--fg)", letterSpacing: mono ? "0.01em" : "-0.005em",
            cursor: readOnly ? "default" : "text",
          }}
        />
        {suffix && (
          <div style={{ display: "flex", alignItems: "center", padding: "0 6px", color: "var(--fg-subtle)" }}>
            {suffix}
          </div>
        )}
      </div>
      {(error || helper) && (
        <div style={{
          marginTop: 6, fontFamily: VF_FONT, fontSize: 12, lineHeight: 1.4,
          color: error ? "var(--danger)" : "var(--fg-muted)",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          {error && <AdminIcon name="alert" size={12} />}
          {error || helper}
        </div>
      )}
    </div>
  );
}

// Slug auto-generator
function slugify(s) {
  return (s || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/['']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Favicon preview
function FaviconChip({ url }) {
  const host = React.useMemo(() => { try { return new URL(url.startsWith("http") ? url : `https://${url}`).hostname; } catch { return null; } }, [url]);
  if (!host) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 8px 3px 4px", borderRadius: 999,
      background: "var(--surface-1)", border: "1px solid var(--border)",
      fontFamily: VF_MONO, fontSize: 11, fontWeight: 600, color: "var(--fg-muted)",
      letterSpacing: "0.02em",
    }}>
      <img src={`https://www.google.com/s2/favicons?domain=${host}&sz=32`} alt="" width="14" height="14" style={{ borderRadius: 3 }} onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
      {host}
    </span>
  );
}

// robots.txt check chip — visual only
function RobotsChip({ state }) {
  if (state === "checking") return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: VF_MONO, fontSize: 11, color: "var(--fg-muted)", fontWeight: 600, letterSpacing: "0.04em" }}>
      <Spinner size={11} color="var(--fg-muted)" /> checking robots.txt…
    </span>
  );
  if (state === "allowed") return <StatusBadge kind="success" mono>robots.txt · allowed</StatusBadge>;
  if (state === "disallowed") return <StatusBadge kind="danger" mono>robots.txt · disallowed</StatusBadge>;
  if (state === "unknown") return <StatusBadge kind="neutral" mono>robots.txt · unchecked</StatusBadge>;
  return null;
}

// ── Add Venue (modal) ──────────────────────────────────────────────────

function AddVenueModal({ onClose }) {
  const [name, setName] = React.useState("");
  const [slugDirty, setSlugDirty] = React.useState(false);
  const [slug, setSlug] = React.useState("");
  const [source, setSource] = React.useState("");
  const [city, setCity] = React.useState("Denver");
  const [robots, setRobots] = React.useState(null);

  // demo: auto-derive slug
  React.useEffect(() => { if (!slugDirty) setSlug(slugify(name)); }, [name, slugDirty]);
  // demo: simulate robots.txt check
  React.useEffect(() => {
    if (!source) { setRobots(null); return; }
    setRobots("checking");
    const t = setTimeout(() => setRobots("allowed"), 900);
    return () => clearTimeout(t);
  }, [source]);

  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "color-mix(in oklab, var(--ink) 55%, transparent)",
      backdropFilter: "blur(2px)",
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      paddingTop: 64,
      zIndex: 50,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 580, maxWidth: "calc(100% - 48px)",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        boxShadow: "var(--shadow-lg)",
        overflow: "hidden",
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          padding: "20px 22px 14px", borderBottom: "1px solid var(--border)",
        }}>
          <div>
            <MonoLabel>new venue</MonoLabel>
            <h2 style={{ margin: "6px 0 0", fontFamily: VF_FONT, fontSize: 20, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.02em" }}>Add a crawl target</h2>
            <div style={{ marginTop: 4, fontFamily: VF_FONT, fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.5 }}>
              Point us at an events page. We'll respect robots.txt and crawl daily at 3 AM MT.
            </div>
          </div>
          <button onClick={onClose} style={{
            all: "unset", cursor: "pointer", padding: 6, borderRadius: 6,
            color: "var(--fg-subtle)", display: "flex",
          }}><AdminIcon name="x" size={16} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <FieldLabel>Venue name</FieldLabel>
            <TextField value={name} onChange={setName} placeholder="e.g. Bluebird Theater" autoFocus />
          </div>

          <div>
            <FieldLabel hint="auto-generated">Slug</FieldLabel>
            <TextField
              value={slug}
              onChange={(v) => { setSlug(slugify(v)); setSlugDirty(true); }}
              placeholder="bluebird-theater"
              prefix={<span style={{ fontFamily: VF_MONO, fontSize: 12, color: "var(--fg-subtle)", letterSpacing: "0.02em" }}>concertcrawl.app/v/</span>}
              suffix={
                <button onClick={() => { setSlug(slugify(name)); setSlugDirty(false); }} title="Regenerate from name" style={{
                  all: "unset", cursor: "pointer", padding: 6, borderRadius: 6, color: "var(--fg-subtle)", display: "flex",
                }}><AdminIcon name="refresh" size={13} /></button>
              }
              mono
              helper="Used in the public URL. Auto-derived from the venue name."
            />
          </div>

          <div>
            <FieldLabel hint={source ? <RobotsChipInline state={robots} /> : null}>Source URL</FieldLabel>
            <TextField
              value={source}
              onChange={setSource}
              placeholder="https://www.bluebirdtheater.net/calendar/"
              suffix={source && robots !== "checking" ? <FaviconChip url={source} /> : null}
              mono
              helper="The events page we'll crawl. Usually a /calendar, /events, or /shows path."
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 14 }}>
            <div>
              <FieldLabel>City</FieldLabel>
              <TextField value={city} onChange={setCity} placeholder="Denver" />
            </div>
            <div>
              <FieldLabel>Initial status</FieldLabel>
              <SegToggle options={[{ key: "active", label: "Active" }, { key: "paused", label: "Paused" }]} value="active" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px 14px 22px", borderTop: "1px solid var(--border)",
          background: "var(--surface-1)", gap: 12,
        }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: VF_FONT, fontSize: 11.5, color: "var(--fg-subtle)" }}>
            <Kbd>Esc</Kbd> cancel
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AdminButton variant="ghost" onClick={onClose}>Cancel</AdminButton>
            <AdminButton variant="outline">Save venue</AdminButton>
            <AdminButton variant="primary" icon="play" iconRight="chevR">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                Save & crawl now
                <span style={{ display: "inline-flex", gap: 2, opacity: 0.7, marginLeft: 2 }}><Kbd>⌘</Kbd><Kbd>↵</Kbd></span>
              </span>
            </AdminButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function RobotsChipInline({ state }) {
  if (!state) return null;
  if (state === "checking") return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: VF_MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-subtle)" }}>
      <Spinner size={10} color="var(--fg-subtle)" /> checking
    </span>
  );
  const map = { allowed: { kind: "success", text: "robots ok" }, disallowed: { kind: "danger", text: "robots blocked" }, unknown: { kind: "neutral", text: "unchecked" } };
  const m = map[state];
  return <StatusBadge kind={m.kind} mono>{m.text}</StatusBadge>;
}

function SegToggle({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", padding: 3, background: "var(--surface-1)", borderRadius: 8, border: "1px solid var(--border)", height: 38, boxSizing: "border-box" }}>
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button key={o.key} onClick={() => onChange && onChange(o.key)} style={{
            all: "unset", cursor: "pointer", flex: 1,
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
            borderRadius: 5,
            fontFamily: VF_FONT, fontSize: 12.5, fontWeight: 600,
            color: active ? "var(--fg-on-accent)" : "var(--fg-muted)",
            background: active ? "var(--signal)" : "transparent",
            transition: "background .12s, color .12s",
          }}>{o.label}</button>
        );
      })}
    </div>
  );
}

// ── Venue Details (full-page edit) ──────────────────────────────────────

const SAMPLE_VENUE = {
  id: "blu",
  name: "Bluebird Theater",
  slug: "bluebird-theater",
  source: "https://www.bluebirdtheater.net/calendar/",
  city: "Denver",
  status: "active",
  verified: true,
  verifiedBy: "Hugh",
  verifiedAt: "Apr 12, 2026",
  health7d: 0.92,
  health7dSpark: [1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1],
  avgDuration: "8.4s",
  lastCrawl: "37m ago",
  events: 65,
  consecutiveFails: 0,
};

const SAMPLE_RUNS = [
  { ts: "May 10, 3:20 PM",  status: "success", strategy: "llm", found: 67, inserted: 2, duration: "8.6s",  error: null },
  { ts: "May 10, 11:06 AM", status: "failed",  strategy: "—",   found: 0,  inserted: 0, duration: "33.9s", error: "TimeoutError: page.goto timeout 30000ms" },
  { ts: "May 9, 3:02 AM",   status: "failed",  strategy: "—",   found: 0,  inserted: 0, duration: "39.1s", error: "TimeoutError: page.goto timeout 30000ms" },
  { ts: "May 9, 1:21 AM",   status: "success", strategy: "llm", found: 67, inserted: 67, duration: "35.5s", error: null },
];

function HealthSparkline({ data, height = 28, width = 200 }) {
  const stepX = width / (data.length - 1 || 1);
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: "block", height }}>
      {data.map((v, i) => (
        <rect key={i} x={i * stepX + 1} y={v === 1 ? 8 : 18} width={Math.max(2, stepX - 3)} height={v === 1 ? 16 : 6} rx={1.5}
          fill={v === 1 ? "var(--success)" : "var(--danger)"} opacity={v === 1 ? 0.9 : 0.85} />
      ))}
    </svg>
  );
}

function MetaCard({ title, action, children, danger }) {
  return (
    <div style={{
      background: "var(--bg-elevated)",
      border: `1px solid ${danger ? "color-mix(in oklab, var(--danger) 32%, var(--border))" : "var(--border)"}`,
      borderRadius: 12,
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px",
        background: danger ? "color-mix(in oklab, var(--danger) 8%, transparent)" : "var(--surface-1)",
        borderBottom: "1px solid var(--border)",
      }}>
        <MonoLabel color={danger ? "var(--danger)" : "var(--fg-subtle)"}>{title}</MonoLabel>
        {action}
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

function VenueDetailsPage({ layout = "meta", venue = SAMPLE_VENUE }) {
  const [name, setName] = React.useState(venue.name);
  const [slug, setSlug] = React.useState(venue.slug);
  const [source, setSource] = React.useState(venue.source);
  const [city, setCity] = React.useState(venue.city);
  const dirty = name !== venue.name || slug !== venue.slug || source !== venue.source || city !== venue.city;

  // Form column
  const Form = (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Panel title="Details" padding={20}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {layout === "two" ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <FieldLabel>Venue name</FieldLabel>
                <TextField value={name} onChange={setName} />
              </div>
              <div>
                <FieldLabel hint="auto-generated">Slug</FieldLabel>
                <TextField value={slug} onChange={(v) => setSlug(slugify(v))} mono
                  prefix={<span style={{ fontFamily: VF_MONO, fontSize: 12, color: "var(--fg-subtle)" }}>/v/</span>}
                  suffix={<button onClick={() => setSlug(slugify(name))} title="Regenerate" style={{ all: "unset", cursor: "pointer", padding: 6, color: "var(--fg-subtle)", display: "flex" }}><AdminIcon name="refresh" size={13} /></button>} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <FieldLabel hint={<RobotsChipInline state="allowed" />}>Source URL</FieldLabel>
                <TextField value={source} onChange={setSource} mono suffix={<FaviconChip url={source} />}
                  helper="The events page we crawl daily." />
              </div>
              <div>
                <FieldLabel>City</FieldLabel>
                <TextField value={city} onChange={setCity} />
              </div>
              <div>
                <FieldLabel>Status</FieldLabel>
                <SegToggle options={[{ key: "active", label: "Active" }, { key: "paused", label: "Paused" }]} value="active" />
              </div>
            </div>
          ) : (
            <>
              <div>
                <FieldLabel>Venue name</FieldLabel>
                <TextField value={name} onChange={setName} />
              </div>
              <div>
                <FieldLabel hint="auto-generated">Slug</FieldLabel>
                <TextField value={slug} onChange={(v) => setSlug(slugify(v))} mono
                  prefix={<span style={{ fontFamily: VF_MONO, fontSize: 12, color: "var(--fg-subtle)" }}>concertcrawl.app/v/</span>}
                  suffix={<button onClick={() => setSlug(slugify(name))} title="Regenerate" style={{ all: "unset", cursor: "pointer", padding: 6, color: "var(--fg-subtle)", display: "flex" }}><AdminIcon name="refresh" size={13} /></button>} />
              </div>
              <div>
                <FieldLabel hint={<RobotsChipInline state="allowed" />}>Source URL</FieldLabel>
                <TextField value={source} onChange={setSource} mono suffix={<FaviconChip url={source} />}
                  helper="The events page we crawl daily." />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 14 }}>
                <div>
                  <FieldLabel>City</FieldLabel>
                  <TextField value={city} onChange={setCity} />
                </div>
                <div>
                  <FieldLabel>Status</FieldLabel>
                  <SegToggle options={[{ key: "active", label: "Active" }, { key: "paused", label: "Paused" }]} value="active" />
                </div>
              </div>
            </>
          )}
        </div>
      </Panel>

      {/* In one/two-col layout: surface meta inline; in "meta" layout, it goes to the right column */}
      {layout !== "meta" && <InlineMeta venue={venue} />}
    </div>
  );

  // Right meta column
  const Meta = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <MetaCard
        title="Health · 7 days"
        action={<MonoLabel color="var(--success)">{Math.round(venue.health7d * 100)}%</MonoLabel>}
      >
        <HealthSparkline data={venue.health7dSpark} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
          <Stat label="Last crawl" value={venue.lastCrawl} />
          <Stat label="Avg duration" value={venue.avgDuration} />
          <Stat label="Events tracked" value={String(venue.events)} />
          <Stat label="Consecutive fails" value="0" kind="success" />
        </div>
      </MetaCard>

      <MetaCard
        title="Verification"
        action={<StatusBadge kind="success" dot>Verified</StatusBadge>}
      >
        <div style={{ fontFamily: VF_FONT, fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.5 }}>
          Verified by <span style={{ color: "var(--fg)", fontWeight: 600 }}>{venue.verifiedBy}</span> on{" "}
          <span style={{ fontFamily: VF_MONO, color: "var(--fg)" }}>{venue.verifiedAt}</span>.
          Verified venues appear on the public Browse page.
        </div>
        <div style={{ marginTop: 12 }}>
          <AdminButton variant="ghost" size="sm" icon="x">Unverify venue</AdminButton>
        </div>
      </MetaCard>

      <MetaCard
        title="Recent runs"
        action={<a href="#" style={{ fontFamily: VF_FONT, fontSize: 11, fontWeight: 600, color: "var(--signal)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3 }}>View all <AdminIcon name="chevR" size={11} /></a>}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {SAMPLE_RUNS.slice(0, 3).map((r, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
              padding: "10px 0", borderBottom: i < 2 ? "1px solid var(--border)" : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: r.status === "success" ? "var(--success)" : "var(--danger)", flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: VF_MONO, fontSize: 11.5, fontWeight: 600, color: "var(--fg)", letterSpacing: "0.02em" }}>{r.ts}</div>
                  {r.error
                    ? <div style={{ fontFamily: VF_MONO, fontSize: 10.5, color: "var(--danger)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.error}</div>
                    : <div style={{ fontFamily: VF_FONT, fontSize: 11, color: "var(--fg-muted)", marginTop: 2 }}>{r.found} found · {r.inserted} inserted</div>}
                </div>
              </div>
              <MonoLabel color="var(--fg-subtle)">{r.duration}</MonoLabel>
            </div>
          ))}
        </div>
      </MetaCard>

      <MetaCard title="Danger zone" danger>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <DangerRow title="Pause this venue" body="Stops daily crawls. Existing events stay published." action={<AdminButton variant="outline" size="sm">Pause</AdminButton>} />
          <DangerRow title="Delete venue" body="Removes the venue and detaches its events. Cannot be undone." action={<AdminButton variant="danger" size="sm">Delete…</AdminButton>} />
        </div>
      </MetaCard>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 80, position: "relative" }}>
      <SectionHead
        eyebrow="Venue details"
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {venue.name}
            <StatusBadge kind="success" dot>Verified</StatusBadge>
          </span>
        }
        subtitle={<span style={{ display: "inline-flex", alignItems: "center", gap: 10, fontFamily: VF_MONO, fontSize: 12, letterSpacing: "0.02em" }}>
          <AdminIcon name="venues" size={12} color="var(--fg-subtle)" /> {venue.city}
          <span style={{ color: "var(--fg-subtle)" }}>·</span>
          <a href={venue.source} target="_blank" rel="noopener" style={{ color: "var(--signal)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>{new URL(venue.source).hostname}<AdminIcon name="external" size={10} /></a>
          <span style={{ color: "var(--fg-subtle)" }}>·</span>
          <span>last crawled {venue.lastCrawl}</span>
        </span>}
        actions={
          <>
            <AdminButton variant="outline" icon="external">View public page</AdminButton>
            <AdminButton variant="primary" icon="refresh">Trigger crawl</AdminButton>
          </>
        }
      />

      {layout === "meta" ? (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 360px", gap: 20, alignItems: "flex-start" }}>
          {Form}
          {Meta}
        </div>
      ) : (
        <div style={{ maxWidth: layout === "one" ? 640 : 820 }}>{Form}</div>
      )}

      {/* Sticky save bar when dirty */}
      {dirty && <SaveBar onDiscard={() => { setName(venue.name); setSlug(venue.slug); setSource(venue.source); setCity(venue.city); }} />}
    </div>
  );
}

function Stat({ label, value, kind = "neutral" }) {
  return (
    <div>
      <MonoLabel>{label}</MonoLabel>
      <div style={{ marginTop: 4, fontFamily: VF_MONO, fontSize: 15, fontWeight: 700, color: kind === "neutral" ? "var(--fg)" : `var(--${kind})`, letterSpacing: "0.01em", fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

function DangerRow({ title, body, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: VF_FONT, fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>{title}</div>
        <div style={{ fontFamily: VF_FONT, fontSize: 12, color: "var(--fg-muted)", marginTop: 2, lineHeight: 1.4 }}>{body}</div>
      </div>
      {action}
    </div>
  );
}

function InlineMeta({ venue }) {
  return (
    <Panel title="Health & recent runs" padding={0}>
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", borderTop: "none" }}>
        <div style={{ padding: 18, borderRight: "1px solid var(--border)" }}>
          <MonoLabel>health · 7 days</MonoLabel>
          <div style={{ marginTop: 8, fontFamily: VF_MONO, fontSize: 24, fontWeight: 700, color: "var(--success)", letterSpacing: "-0.01em" }}>{Math.round(venue.health7d * 100)}%</div>
          <div style={{ marginTop: 8 }}><HealthSparkline data={venue.health7dSpark} /></div>
        </div>
        <div style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <MonoLabel>recent runs</MonoLabel>
            <a href="#" style={{ fontFamily: VF_FONT, fontSize: 11, fontWeight: 600, color: "var(--signal)", textDecoration: "none" }}>View all →</a>
          </div>
          {SAMPLE_RUNS.slice(0, 3).map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < 2 ? "1px solid var(--border)" : "none" }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: r.status === "success" ? "var(--success)" : "var(--danger)" }} />
              <span style={{ fontFamily: VF_MONO, fontSize: 11.5, fontWeight: 600, color: "var(--fg)", minWidth: 140 }}>{r.ts}</span>
              <span style={{ fontFamily: VF_FONT, fontSize: 12, color: "var(--fg-muted)", flex: 1 }}>{r.error || `${r.found} found · ${r.inserted} inserted`}</span>
              <MonoLabel color="var(--fg-subtle)">{r.duration}</MonoLabel>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function SaveBar({ onDiscard }) {
  return (
    <div style={{
      position: "sticky", bottom: 0, marginTop: 8,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 18px",
      background: "var(--ink)",
      color: "var(--paper)",
      borderRadius: 12, boxShadow: "var(--shadow-lg)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 7, height: 7, borderRadius: 4, background: "var(--warning)" }} />
        <span style={{ fontFamily: VF_FONT, fontSize: 13, fontWeight: 600 }}>Unsaved changes</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onDiscard} style={{ all: "unset", cursor: "pointer", padding: "8px 14px", borderRadius: 8, fontFamily: VF_FONT, fontSize: 13, fontWeight: 600, color: "var(--paper)", opacity: 0.7 }}>Discard</button>
        <button style={{ all: "unset", cursor: "pointer", padding: "8px 14px", borderRadius: 8, fontFamily: VF_FONT, fontSize: 13, fontWeight: 700, color: "var(--fg-on-accent)", background: "var(--signal)" }}>Save changes</button>
      </div>
    </div>
  );
}

Object.assign(window, {
  AddVenueModal, VenueDetailsPage,
  TextField, FieldLabel, SegToggle, slugify, FaviconChip, RobotsChip, RobotsChipInline,
});

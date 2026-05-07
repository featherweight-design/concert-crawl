// admin-events.jsx — Event review queue (/admin/events).
// Layout:
//   • Filter rail (status pills + venue + date)
//   • Split: queue list (left) + event inspector (right) with diff vs. published
//   • Bulk action bar (sticky bottom when items selected)

const PENDING_EVENTS = [
  {
    id: "evt-2841", title: "Bright Eyes",                 venue: "Bluebird Theater",  date: "May 14",  time: "8:00 PM",
    confidence: 0.58, source: "llm",        flag: "low_confidence",  duplicate: "evt-2802 (same title, ±1 day)",
    discovered: "12:31 PM today", priceLow: 38, priceHigh: 65,
  },
  {
    id: "evt-2840", title: "Khruangbin",                  venue: "Mission Ballroom",  date: "May 16",  time: "9:00 PM",
    confidence: 0.92, source: "structured", flag: null,              duplicate: null,
    discovered: "12:38 PM today", priceLow: 55, priceHigh: 95,
  },
  {
    id: "evt-2839", title: "Dijon",                       venue: "Bluebird Theater",  date: "May 18",  time: "8:30 PM",
    confidence: 0.61, source: "llm",        flag: "low_confidence",  duplicate: null,
    discovered: "12:31 PM today", priceLow: 32, priceHigh: 32,
  },
  {
    id: "evt-2838", title: "Wednesday + MJ Lenderman",    venue: "Gothic Theatre",     date: "May 20",  time: "8:00 PM",
    confidence: 0.74, source: "llm",        flag: null,              duplicate: null,
    discovered: "12:02 PM today", priceLow: 28, priceHigh: 35,
  },
  {
    id: "evt-2837", title: "boygenius (acoustic)",        venue: "Bluebird Theater",  date: "May 22",  time: "9:00 PM",
    confidence: 0.49, source: "llm",        flag: "low_confidence",  duplicate: null,
    discovered: "12:31 PM today", priceLow: 0, priceHigh: 0, missingPrice: true,
  },
  {
    id: "evt-2836", title: "Geese",                       venue: "Ogden Theatre",      date: "May 24",  time: "8:00 PM",
    confidence: 0.88, source: "structured", flag: null,              duplicate: null,
    discovered: "12:14 PM today", priceLow: 30, priceHigh: 30,
  },
  {
    id: "evt-2835", title: "Cigarettes After Sex",        venue: "Mission Ballroom",  date: "May 27",  time: "8:30 PM",
    confidence: 0.95, source: "structured", flag: null,              duplicate: null,
    discovered: "12:38 PM today", priceLow: 65, priceHigh: 110,
  },
];

function ConfidenceBar({ value }) {
  const kind = value >= 0.8 ? "success" : value >= 0.7 ? "signal" : value >= 0.6 ? "warning" : "danger";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 96 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: "var(--surface-2)", overflow: "hidden" }}>
        <div style={{ width: `${value * 100}%`, height: "100%", background: `var(--${kind})` }} />
      </div>
      <span style={{
        fontFamily: ADMIN_MONO, fontSize: 11, fontWeight: 700,
        color: `var(--${kind})`, fontVariantNumeric: "tabular-nums",
      }}>{value.toFixed(2)}</span>
    </div>
  );
}

function EventFilterRail() {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      padding: "12px 14px",
      background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 10,
    }}>
      <div style={{ display: "flex", gap: 4, padding: 2, background: "var(--surface-1)", borderRadius: 6, border: "1px solid var(--border)" }}>
        {[
          { k: "pending",    label: "Pending",    count: 12, active: true,  kind: "signal" },
          { k: "low",        label: "Low conf.",  count: 5,  active: false, kind: "warning" },
          { k: "duplicates", label: "Duplicates", count: 2,  active: false, kind: "warning" },
          { k: "approved",   label: "Approved",   count: 218,active: false, kind: "success" },
          { k: "rejected",   label: "Rejected",   count: 14, active: false, kind: "danger" },
        ].map(t => (
          <button key={t.k} style={{
            all: "unset", cursor: "pointer",
            padding: "6px 12px", borderRadius: 4,
            display: "flex", alignItems: "center", gap: 8,
            background: t.active ? `color-mix(in oklab, var(--${t.kind}) 18%, transparent)` : "transparent",
            color: t.active ? `var(--${t.kind})` : "var(--fg-muted)",
            fontFamily: ADMIN_FONT, fontSize: 12, fontWeight: t.active ? 700 : 500,
          }}>
            {t.label}
            <span style={{
              padding: "1px 6px", borderRadius: 999,
              fontFamily: ADMIN_MONO, fontSize: 10, fontWeight: 700,
              background: t.active ? `var(--${t.kind})` : "var(--surface-2)",
              color: t.active ? "var(--fg-on-accent)" : "var(--fg-muted)",
              fontVariantNumeric: "tabular-nums",
            }}>{t.count}</span>
          </button>
        ))}
      </div>
      <div style={{ flex: 1, display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <AdminButton variant="outline" size="sm" icon="filter" iconRight="chevR">All venues</AdminButton>
        <AdminButton variant="outline" size="sm" icon="filter" iconRight="chevR">Date · next 30d</AdminButton>
        <AdminButton variant="outline" size="sm" icon="filter" iconRight="chevR">Source · any</AdminButton>
      </div>
    </div>
  );
}

function EventQueueSplit({ events = PENDING_EVENTS, selectedId = "evt-2841" }) {
  const sel = events.find(e => e.id === selectedId) || events[0];
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "minmax(0, 480px) minmax(0, 1fr)",
      border: "1px solid var(--border)", borderRadius: 12,
      background: "var(--bg-elevated)", overflow: "hidden", minHeight: 620,
    }}>
      {/* Queue list */}
      <div style={{ borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
        <div style={{
          padding: "10px 14px", borderBottom: "1px solid var(--border)",
          background: "var(--surface-1)", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" style={{ accentColor: "var(--signal)" }} />
            <MonoLabel>12 pending · sort: discovered ↓</MonoLabel>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {events.map(e => {
            const active = e.id === selectedId;
            return (
              <div key={e.id} style={{
                padding: "12px 14px",
                background: active ? "var(--surface-2)" : "transparent",
                borderLeft: active ? "2px solid var(--signal)" : "2px solid transparent",
                borderBottom: "1px solid var(--border)",
                cursor: "pointer",
                display: "grid", gridTemplateColumns: "16px 1fr",
                gap: 12, alignItems: "flex-start",
              }}>
                <input type="checkbox" defaultChecked={active} style={{ marginTop: 2, accentColor: "var(--signal)" }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 600, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</span>
                    <ConfidenceBar value={e.confidence} />
                  </div>
                  <div style={{ marginTop: 4, display: "flex", gap: 8, alignItems: "center", fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)" }}>
                    <span>{e.venue}</span>
                    <span style={{ color: "var(--fg-subtle)" }}>·</span>
                    <span style={{ fontFamily: ADMIN_MONO, fontSize: 11 }}>{e.date} · {e.time}</span>
                  </div>
                  {(e.flag || e.duplicate || e.missingPrice) && (
                    <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {e.flag === "low_confidence" && <StatusBadge kind="warning" mono>low conf.</StatusBadge>}
                      {e.duplicate && <StatusBadge kind="warning" mono>possible dupe</StatusBadge>}
                      {e.missingPrice && <StatusBadge kind="danger" mono>no price</StatusBadge>}
                      {e.source === "structured" && <StatusBadge kind="signal" variant="outline" mono>structured</StatusBadge>}
                      {e.source === "llm" && <StatusBadge kind="accent" variant="outline" mono>llm</StatusBadge>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inspector */}
      <EventInspector event={sel} />
    </div>
  );
}

function EventInspector({ event }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border)", background: "var(--surface-1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <MonoLabel>{event.id}</MonoLabel>
          <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, color: "var(--fg-subtle)" }}>·</span>
          <StatusBadge kind="warning" dot>Pending review</StatusBadge>
          {event.flag === "low_confidence" && <StatusBadge kind="warning" mono>low confidence</StatusBadge>}
          {event.duplicate && <StatusBadge kind="warning" mono>possible duplicate</StatusBadge>}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: ADMIN_FONT, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--fg)" }}>{event.title}</h2>
            <div style={{ marginTop: 6, fontFamily: ADMIN_FONT, fontSize: 13, color: "var(--fg-muted)" }}>
              {event.venue} · {event.date} · {event.time}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <AdminButton variant="ghost" size="sm" icon="x">Reject</AdminButton>
            <AdminButton variant="outline" size="sm" icon="edit">Edit</AdminButton>
            <AdminButton variant="success" size="sm" icon="check">Approve</AdminButton>
          </div>
        </div>
      </div>

      {/* Vitals strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderBottom: "1px solid var(--border)" }}>
        {[
          { l: "Confidence", v: <ConfidenceBar value={event.confidence} />, ren: true },
          { l: "Source",     v: event.source === "structured" ? "schema.org/Event" : "Haiku 4.5 (LLM)", mono: true },
          { l: "Discovered", v: event.discovered, mono: true },
          { l: "Price range", v: event.missingPrice ? "—" : (event.priceLow === event.priceHigh ? `$${event.priceLow}` : `$${event.priceLow} – $${event.priceHigh}`), mono: true,
            color: event.missingPrice ? "var(--danger)" : "var(--fg)" },
        ].map((s, i) => (
          <div key={i} style={{ padding: "14px 18px", borderRight: i < 3 ? "1px solid var(--border)" : "none" }}>
            <MonoLabel>{s.l}</MonoLabel>
            <div style={{
              marginTop: 6, fontFamily: s.mono ? ADMIN_MONO : ADMIN_FONT, fontSize: 13, fontWeight: 600,
              color: s.color || "var(--fg)", fontVariantNumeric: "tabular-nums",
            }}>{s.ren ? s.v : s.v}</div>
          </div>
        ))}
      </div>

      {/* Body: 2-col diff layout */}
      <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 22 }}>
        {/* Duplicate banner */}
        {event.duplicate && (
          <div style={{
            padding: "12px 14px", borderRadius: 8,
            background: "color-mix(in oklab, var(--warning) 10%, var(--bg-elevated))",
            border: "1px solid color-mix(in oklab, var(--warning) 30%, transparent)",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <AdminIcon name="alert" size={16} color="var(--warning)" />
            <div style={{ flex: 1, fontFamily: ADMIN_FONT, fontSize: 13, color: "var(--fg)" }}>
              <span style={{ fontWeight: 600 }}>Possible duplicate of {event.duplicate}</span>
              <span style={{ color: "var(--fg-muted)", marginLeft: 6 }}>· same artist, ±1 day window</span>
            </div>
            <AdminButton variant="ghost" size="sm" iconRight="chevR">Compare</AdminButton>
            <AdminButton variant="outline" size="sm">Merge</AdminButton>
          </div>
        )}

        {/* Extracted vs. raw */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Extracted (editable) */}
          <div>
            <MonoLabel>extracted (editable)</MonoLabel>
            <div style={{ marginTop: 10, padding: 16, border: "1px solid var(--border)", borderRadius: 10, display: "flex", flexDirection: "column", gap: 12, background: "var(--surface-1)" }}>
              <FieldRow label="Title" value={event.title} />
              <FieldRow label="Artist" value={event.title} />
              <FieldRow label="Venue" value={event.venue} />
              <FieldRow label="Date" value={event.date} mono />
              <FieldRow label="Doors" value="7:00 PM" mono />
              <FieldRow label="Show" value={event.time} mono />
              <FieldRow label="Price low"  value={event.missingPrice ? "—" : `$${event.priceLow}`}  mono warn={event.missingPrice} />
              <FieldRow label="Price high" value={event.missingPrice ? "—" : `$${event.priceHigh}`} mono warn={event.missingPrice} />
              <FieldRow label="Tags" value={["indie", "folk-rock"]} />
            </div>
          </div>
          {/* Raw source */}
          <div>
            <MonoLabel>raw source · llm input</MonoLabel>
            <div style={{
              marginTop: 10, padding: 14, borderRadius: 10,
              border: "1px solid var(--border)", background: "var(--bg)",
              fontFamily: ADMIN_MONO, fontSize: 11.5, lineHeight: 1.65,
              color: "var(--fg-muted)",
              whiteSpace: "pre-wrap", maxHeight: 360, overflow: "auto",
            }}>
{`<div class="event-card">
  <h3>Bright Eyes</h3>
  <p class="meta">Wed, May 14 · doors 7pm / show 8pm</p>
  <p class="venue">at the Bluebird Theater</p>
  `}<span style={{ background: "color-mix(in oklab, var(--warning) 22%, transparent)", color: "var(--fg)", padding: "1px 4px", borderRadius: 3 }}>{`<p class="price">tickets from $38</p>`}</span>{`
  <a href="/tickets/bright-eyes-2024">Buy tickets</a>
</div>`}
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--border)" }}>
                <div style={{ color: "var(--fg-subtle)", marginBottom: 6 }}>// llm reasoning</div>
                <div style={{ color: "var(--fg-muted)" }}>
                  Title and venue extracted with high confidence. Upper price bound not<br/>
                  stated → defaulted to low. Confidence reduced to 0.58.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer meta */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingTop: 14, borderTop: "1px dashed var(--border)",
        }}>
          <div style={{ display: "flex", gap: 16 }}>
            <Meta label="Run" value="r-9419" mono />
            <Meta label="LLM cost" value={<CostText value={0.04} size={12} weight={600} />} />
            <Meta label="Tokens" value="1,842 → 412" mono />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Kbd>J</Kbd><Kbd>K</Kbd>
            <span style={{ fontFamily: ADMIN_FONT, fontSize: 11, color: "var(--fg-muted)", alignSelf: "center" }}>navigate</span>
            <span style={{ width: 8 }} />
            <Kbd>A</Kbd>
            <span style={{ fontFamily: ADMIN_FONT, fontSize: 11, color: "var(--fg-muted)", alignSelf: "center" }}>approve</span>
            <span style={{ width: 8 }} />
            <Kbd>R</Kbd>
            <span style={{ fontFamily: ADMIN_FONT, fontSize: 11, color: "var(--fg-muted)", alignSelf: "center" }}>reject</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldRow({ label, value, mono, warn }) {
  const isArr = Array.isArray(value);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "92px 1fr", gap: 12, alignItems: "center" }}>
      <span style={{ fontFamily: ADMIN_MONO, fontSize: 10, fontWeight: 700, color: "var(--fg-subtle)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      {isArr ? (
        <div style={{ display: "flex", gap: 6 }}>
          {value.map(t => <StatusBadge key={t} kind="neutral" mono>{t}</StatusBadge>)}
          <button style={{ all: "unset", cursor: "pointer", padding: "2px 8px", borderRadius: 4, fontFamily: ADMIN_MONO, fontSize: 10, color: "var(--fg-subtle)", border: "1px dashed var(--border)" }}>+ tag</button>
        </div>
      ) : (
        <div style={{
          padding: "6px 10px", borderRadius: 6,
          background: warn ? "color-mix(in oklab, var(--danger) 12%, transparent)" : "var(--bg-elevated)",
          border: warn ? "1px solid color-mix(in oklab, var(--danger) 32%, transparent)" : "1px solid var(--border)",
          fontFamily: mono ? ADMIN_MONO : ADMIN_FONT, fontSize: 13,
          color: warn ? "var(--danger)" : "var(--fg)",
          fontVariantNumeric: "tabular-nums",
        }}>{value}</div>
      )}
    </div>
  );
}

function Meta({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontFamily: ADMIN_MONO, fontSize: 9.5, fontWeight: 700, color: "var(--fg-subtle)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 2, fontFamily: mono ? ADMIN_MONO : ADMIN_FONT, fontSize: 12, color: "var(--fg)", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function BulkActionBar({ count = 3 }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "10px 16px",
      background: "var(--ink)", color: "var(--paper)",
      borderRadius: 12,
      boxShadow: "var(--shadow-lg)",
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 6,
        background: "var(--signal)", color: "var(--fg-on-accent)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: ADMIN_MONO, fontSize: 12, fontWeight: 700,
        fontVariantNumeric: "tabular-nums",
      }}>{count}</div>
      <span style={{ fontFamily: ADMIN_FONT, fontSize: 13, fontWeight: 600 }}>events selected</span>
      <span style={{ width: 1, height: 18, background: "rgba(255,255,255,0.18)" }} />
      <button style={{ all: "unset", cursor: "pointer", padding: "6px 10px", borderRadius: 6, display: "flex", alignItems: "center", gap: 6, fontFamily: ADMIN_FONT, fontSize: 12, fontWeight: 600 }}>
        <AdminIcon name="check" size={13} /> Approve all
      </button>
      <button style={{ all: "unset", cursor: "pointer", padding: "6px 10px", borderRadius: 6, display: "flex", alignItems: "center", gap: 6, fontFamily: ADMIN_FONT, fontSize: 12, fontWeight: 600, opacity: 0.85 }}>
        <AdminIcon name="x" size={13} /> Reject
      </button>
      <button style={{ all: "unset", cursor: "pointer", padding: "6px 10px", borderRadius: 6, display: "flex", alignItems: "center", gap: 6, fontFamily: ADMIN_FONT, fontSize: 12, fontWeight: 600, opacity: 0.85 }}>
        <AdminIcon name="filter" size={13} /> Re-tag
      </button>
      <span style={{ flex: 1 }} />
      <button style={{ all: "unset", cursor: "pointer", padding: 6, borderRadius: 6, opacity: 0.7 }}>
        <AdminIcon name="x" size={14} />
      </button>
    </div>
  );
}

function AdminEventsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <SectionHead
        eyebrow="Phase 7 · Curation"
        title="Event review"
        subtitle="Hugh approves the queue. The newsletter only sends what's been touched here."
        actions={
          <>
            <AdminButton variant="outline" icon="filter">Saved views</AdminButton>
            <AdminButton variant="primary" icon="plus">New event</AdminButton>
          </>
        }
      />
      <EventFilterRail />
      <EventQueueSplit />
      <div style={{ display: "flex", justifyContent: "center" }}>
        <BulkActionBar count={3} />
      </div>
    </div>
  );
}

Object.assign(window, { AdminEventsPage, EventFilterRail, EventQueueSplit, EventInspector, BulkActionBar, ConfidenceBar, PENDING_EVENTS });

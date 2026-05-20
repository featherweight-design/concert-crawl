// ============================================================
// PROFILE / SETTINGS — Phase 8.x design pass
// Concert Crawl · 2026-05
//
// Dedicated /settings route. Hub-and-detail on mobile, sidebar
// on desktop. Identity is anonymous-by-default; opting into a
// handle exposes you publicly on submissions you've already made.
// ============================================================

const PS_CCWordmark    = window.CCWordmark;
const PS_CCClusterMark = window.CCClusterMark;

// ─── Sample data ──────────────────────────────────────────────

const SAMPLE_SUBMISSIONS = [
  { id: "s1", artist: "Habstrakt",       venue: "Red Rocks",       date: "May 7",  floor: 35, ceiling: 75, tier: "GA",       status: "confirmed", confirms: 3, ago: "3d" },
  { id: "s2", artist: "Mannequin Pussy", venue: "Bluebird",        date: "May 7",  floor: 28, ceiling: 28, tier: "GA",       status: "pending",   confirms: 1, ago: "5h" },
  { id: "s3", artist: "Goose",           venue: "Mission Ballroom",date: "May 12", floor: 65, ceiling: 95, tier: "Reserved", status: "disputed",  confirms: 0, ago: "1d" },
  { id: "s4", artist: "Phoebe Bridgers", venue: "Red Rocks",       date: "Apr 22", floor: 70, ceiling: 120,tier: "Reserved", status: "confirmed", confirms: 4, ago: "2w" },
  { id: "s5", artist: "Geese",           venue: "Hi-Dive",         date: "Apr 18", floor: 18, ceiling: 18, tier: "GA",       status: "confirmed", confirms: 2, ago: "3w" },
  { id: "s6", artist: "Yard Act",        venue: "Gothic",          date: "Apr 11", floor: 32, ceiling: 32, tier: "GA",       status: "confirmed", confirms: 2, ago: "4w" },
  { id: "s7", artist: "JPEGMAFIA",       venue: "Ogden",           date: "Mar 30", floor: 45, ceiling: 80, tier: "GA",       status: "confirmed", confirms: 5, ago: "5w" },
  { id: "s8", artist: "Black Country, New Road", venue: "Bluebird",date: "Mar 15", floor: 30, ceiling: 30, tier: "GA",       status: "confirmed", confirms: 3, ago: "7w" },
];

const SAMPLE_USER_HANDLE = { handle: "hugh", email: "hugh@concertcrawl.fm", joined: "Apr 2026", city: "Denver", plan: "founder", role: "fan", avatarColor: "signal" };
const SAMPLE_USER_ANON   = { handle: null,   email: "fan-3a82@concertcrawl.fm", joined: "May 2026", city: "Denver", plan: "founder", role: "fan", avatarColor: null };

// ─── Avatar — generated "concert poster" monogram ─────────────
// No user uploads. Glyph + 2-color palette derived deterministically from
// handle (or email for anon). Square w/ rounded corners, like a flyer.

function ps_hash(s) {
  let h = 5381; const str = String(s || "?");
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}
const PS_TONES = ["signal", "accent", "success", "warning"];
const PS_AVATAR_COLORS = PS_TONES;
function ps_pickAvatarTone(seed) { return PS_TONES[ps_hash(seed) % PS_TONES.length]; }

function MonogramPoster({ user, size = 40, ringed = false, anonymous = false, colorKey = null }) {
  const isAnon = anonymous || !user.handle;
  const seed = user.handle || user.email || "anon";
  const tone = colorKey || user.avatarColor || ps_pickAvatarTone(seed);
  const letter = isAnon ? "?" : (user.handle.replace(/[^a-z0-9]/gi, "")[0] || user.handle[0] || "?").toUpperCase();
  const tintBg = `color-mix(in oklch, var(--${tone}) 22%, var(--surface-1))`;
  const tintBorder = `color-mix(in oklch, var(--${tone}) 50%, transparent)`;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0, position: "relative",
      background: isAnon ? "var(--surface-2)" : tintBg,
      border: isAnon ? "1px dashed var(--border-strong)" : `1.5px solid ${tintBorder}`,
      boxShadow: ringed && !isAnon ? `0 0 0 3px color-mix(in oklch, var(--${tone}) 14%, transparent)` : "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Inter, system-ui",
      fontWeight: 800,
      fontSize: Math.round(size * 0.46),
      letterSpacing: "-0.02em",
      lineHeight: 1,
      color: isAnon ? "var(--fg-subtle)" : `var(--${tone})`,
    }}>{letter}</div>
  );
}

// Backwards-compat alias — old call sites use <Avatar/>
const Avatar = MonogramPoster;

function ProfileEntryAvatar({ user = SAMPLE_USER_HANDLE, onClick = () => {} }) {
  return (
    <button type="button" onClick={onClick} style={{ all: "unset", cursor: "pointer", borderRadius: "50%" }}>
      <MonogramPoster user={user} size={36} anonymous={!user.handle} ringed />
    </button>
  );
}

// ─── Atomic primitives ────────────────────────────────────────

function PSLabel({ children }) {
  return <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fg-subtle)", marginBottom: 8 }}>{children}</div>;
}

function PSCard({ children, padding = "14px 14px", danger = false, accent = false, style }) {
  return (
    <div style={{
      background: danger ? "rgba(255,122,138,0.04)" : accent ? "rgba(255,123,212,0.04)" : "var(--surface-1)",
      border: danger ? "1px solid var(--danger)" : accent ? "1px solid var(--accent)" : "1px solid var(--border)",
      borderRadius: 12, padding, ...style,
    }}>{children}</div>
  );
}

function PSDivider() { return <div style={{ height: 1, background: "var(--border)", opacity: 0.7 }} />; }

function PSChevron() {
  return <svg width="14" height="14" viewBox="0 0 16 16" style={{ flexShrink: 0 }}><path d="M6 4l4 4-4 4" stroke="var(--fg-subtle)" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function PSExternalArrow() {
  return <svg width="12" height="12" viewBox="0 0 16 16" style={{ flexShrink: 0 }}><path d="M5 11l6-6M6 5h5v5" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function PSPrimaryButton({ children, onClick, disabled, fullWidth = false }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{
      all: "unset", cursor: disabled ? "not-allowed" : "pointer", textAlign: "center",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      gap: 8, height: 48, padding: "0 20px",
      width: fullWidth ? "100%" : "auto", boxSizing: "border-box",
      background: disabled ? "var(--surface-2)" : "var(--signal)",
      color: disabled ? "var(--fg-subtle)" : "var(--fg-on-accent)",
      borderRadius: 10, fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 14.5,
      letterSpacing: "-0.005em",
      boxShadow: disabled ? "none" : "0 12px 32px -12px var(--signal)",
    }}>{children}</button>
  );
}

function PSSecondaryButton({ children, onClick, small = false, fullWidth = false }) {
  return (
    <button type="button" onClick={onClick} style={{
      all: "unset", cursor: "pointer", textAlign: "center",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      gap: 6, height: small ? 36 : 44, padding: small ? "0 14px" : "0 18px",
      width: fullWidth ? "100%" : "auto", boxSizing: "border-box",
      background: "transparent", color: "var(--fg)",
      border: "1px solid var(--border-strong)", borderRadius: 8,
      fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: small ? 13 : 14,
      letterSpacing: "-0.005em",
    }}>{children}</button>
  );
}

function PSDangerButton({ children, onClick, small = false, solid = false, fullWidth = false }) {
  return (
    <button type="button" onClick={onClick} style={{
      all: "unset", cursor: "pointer", textAlign: "center",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      gap: 6, height: small ? 36 : 44, padding: small ? "0 14px" : "0 18px",
      width: fullWidth ? "100%" : "auto", boxSizing: "border-box",
      background: solid ? "var(--danger)" : "transparent",
      color: solid ? "#fff" : "var(--danger)",
      border: "1px solid var(--danger)",
      borderRadius: 8, fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: small ? 13 : 14,
      letterSpacing: "-0.005em", opacity: solid ? 1 : 0.85,
    }}>{children}</button>
  );
}

function SettingsRow({ label, value, chevron = true, danger = false, onClick = () => {}, leading, trailing, last = false }) {
  return (
    <button type="button" onClick={onClick} style={{
      all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
      padding: "14px 14px", borderBottom: last ? "none" : "1px solid var(--border)",
      width: "100%", boxSizing: "border-box",
    }}>
      {leading && <span style={{ flexShrink: 0, display: "inline-flex" }}>{leading}</span>}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ fontFamily: "Inter, system-ui", fontSize: 14.5, fontWeight: 600, color: danger ? "var(--danger)" : "var(--fg)", letterSpacing: "-0.005em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
        {value && <div style={{ fontFamily: "Inter, system-ui", fontSize: 12.5, fontWeight: 500, color: "var(--fg-muted)", letterSpacing: "-0.005em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>}
      </div>
      {trailing}
      {chevron && !trailing && <PSChevron />}
    </button>
  );
}

function SettingsRowGroup({ children }) {
  return <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>{children}</div>;
}

const PSIcon = {
  user:  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="6" r="2.6" stroke="currentColor" strokeWidth="1.5"/><path d="M2.5 13.5c.6-2.3 2.7-3.5 5.5-3.5s4.9 1.2 5.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  mail:  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2.5" y="3.5" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M3 5l5 4 5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  star:  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2.5l1.7 3.4 3.8.6-2.7 2.6.6 3.7L8 11.1l-3.4 1.7.6-3.7L2.5 6.5l3.8-.6L8 2.5z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/></svg>,
  card:  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="4" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M2 7h12" stroke="currentColor" strokeWidth="1.5"/></svg>,
  paint: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="6" cy="6" r=".9" fill="currentColor"/><circle cx="10" cy="6" r=".9" fill="currentColor"/><circle cx="11" cy="9" r=".9" fill="currentColor"/></svg>,
  list:  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M5 4h8M5 8h8M5 12h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
  shield:<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2L3 4v4.5c0 3.3 2.5 5.4 5 6 2.5-.6 5-2.7 5-6V4L8 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  signout:<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M9 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h5M11 5l3 3-3 3M14 8H7" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  trash: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 5h10M6 5V3.5h4V5M5 5l.7 8.5h4.6L11 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

// ─── Profile hero ────────────────────────────────────────────

function ProfileHero({ user, onEdit = () => {}, dense = false }) {
  const isAnon = !user.handle;
  const role = user.role || "fan";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 0 }}>
      <MonogramPoster user={user} size={dense ? 56 : 68} anonymous={isAnon} ringed />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <div style={{ fontFamily: "Inter, system-ui", fontSize: dense ? 18 : 22, fontWeight: 900, color: "var(--fg)", letterSpacing: "-0.02em", lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
            {isAnon ? "anonymous fan" : <><span style={{ color: "var(--fg-muted)", fontWeight: 700 }}>@</span>{user.handle}</>}
          </div>
          {role !== "fan" && <RoleBadge role={role} compact />}
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: "var(--fg-muted)", letterSpacing: "0.04em" }}>{user.city || "—"} · joined {user.joined}</div>
        {isAnon && (
          <div style={{ fontFamily: "Inter, system-ui", fontSize: 12, color: "var(--fg-subtle)", lineHeight: 1.45, letterSpacing: "-0.005em", marginTop: 2 }}>
            Submissions show as <em>anonymous fan</em>. Pick a handle if you want credit.
          </div>
        )}
      </div>
      {!dense && (
        <button type="button" onClick={onEdit} style={{
          all: "unset", cursor: "pointer", padding: "7px 12px", borderRadius: 8,
          background: "var(--surface-2)", border: "1px solid var(--border-strong)",
          fontFamily: "Inter, system-ui", fontSize: 12.5, fontWeight: 700,
          color: "var(--fg)", letterSpacing: "-0.005em",
        }}>Edit</button>
      )}
    </div>
  );
}

// ─── Roles (RBAC) ──────────────────────────────────
// Future RBAC. `role` is orthogonal to `plan` (subscription) —
// fan/founder-team can be paid or free; editor/admin are typically founder-team.

const ROLE_COPY = {
  fan:           { label: "fan",           tone: "signal",  blurb: "Default. Browse, submit, watch." },
  editor:        { label: "editor",        tone: "accent",  blurb: "Edit venue & event metadata. Cannot delete." },
  moderator:     { label: "moderator",     tone: "warning", blurb: "Review queue, flag, hide bad submissions." },
  admin:         { label: "admin",         tone: "danger",  blurb: "Full ops surface — crawls, costs, invites." },
  founder_team:  { label: "founder team",  tone: "accent",  blurb: "Concert Crawl staff. All admin powers + secret stuff." },
  partner:       { label: "venue partner", tone: "success", blurb: "Claimed venue — can mark prices, post promos." },
};

function RoleBadge({ role = "fan", compact = false }) {
  const c = ROLE_COPY[role] || ROLE_COPY.fan;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: compact ? "2px 6px" : "3px 8px", borderRadius: 4,
      background: `color-mix(in oklch, var(--${c.tone}) 14%, transparent)`,
      border: `1px solid var(--${c.tone})`,
      color: `var(--${c.tone})`,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: compact ? 9 : 10, fontWeight: 700,
      letterSpacing: "0.12em", textTransform: "uppercase",
      flexShrink: 0,
      whiteSpace: "nowrap",
    }}>
      <span aria-hidden style={{ width: 4, height: 4, borderRadius: 2, background: `var(--${c.tone})` }} />
      {c.label}
    </span>
  );
}

function RoleCard({ role = "fan" }) {
  const c = ROLE_COPY[role] || ROLE_COPY.fan;
  return (
    <div style={{
      background: "var(--surface-1)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "14px 14px",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <RoleBadge role={role} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "Inter, system-ui", fontSize: 13, lineHeight: 1.45, color: "var(--fg-muted)", letterSpacing: "-0.005em" }}>
          {c.blurb}
        </div>
      </div>
    </div>
  );
}

// ─── Plan card ───────────────────────────────────────────────

const PLAN_COPY = {
  founder: { pill: "founder", pillTone: "accent", headline: "Free for life.", body: "You showed up during the private beta — you keep Concert Crawl free, forever. No card needed.", foot: "Yes, even when we charge new users." },
  paid:    { pill: "plus",    pillTone: "signal", headline: "$5 / month",     body: "Concert Crawl Plus — full access to price history, watch alerts, and friend activity.", foot: null },
  trial:   { pill: "trial",   pillTone: "warning",headline: "12 days left.",  body: "Your trial of Concert Crawl Plus ends May 20. Add a card to keep going — or don't, the free tier still works.", foot: null },
  pastDue: { pill: "past due",pillTone: "danger", headline: "We couldn't charge your card.", body: "Update payment to keep Plus features. We'll downgrade you to free in 5 days if not.", foot: null },
};

function PlanCard({ state = "founder", onAction = () => {} }) {
  const c = PLAN_COPY[state];
  const tone = c.pillTone;
  const isFounder = state === "founder";
  return (
    <div style={{
      background: isFounder ? "linear-gradient(135deg, color-mix(in oklch, var(--accent) 8%, var(--surface-1)), var(--surface-1) 65%)" : "var(--surface-1)",
      border: state === "pastDue" ? "1px solid var(--danger)" : isFounder ? "1px solid var(--accent)" : "1px solid var(--border)",
      borderRadius: 12, padding: "16px 16px",
      display: "flex", flexDirection: "column", gap: 10,
      position: "relative", overflow: "hidden",
    }}>
      {isFounder && <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 90% 0%, color-mix(in oklch, var(--accent) 18%, transparent), transparent 60%)", pointerEvents: "none" }} />}
      <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
        <span style={{
          padding: "3px 8px", borderRadius: 999,
          background: `color-mix(in oklch, var(--${tone}) 12%, transparent)`,
          border: `1px solid var(--${tone})`, color: `var(--${tone})`,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
        }}>{c.pill}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: "var(--fg-subtle)", letterSpacing: "0.10em", textTransform: "uppercase" }}>your plan</span>
      </div>
      <div style={{ position: "relative" }}>
        <div style={{ fontFamily: "Inter, system-ui", fontSize: 24, fontWeight: 900, color: "var(--fg)", letterSpacing: "-0.025em", lineHeight: 1.1 }}>{c.headline}</div>
        <div style={{ marginTop: 6, fontFamily: "Inter, system-ui", fontSize: 13.5, lineHeight: 1.5, color: "var(--fg-muted)", letterSpacing: "-0.005em" }}>{c.body}</div>
      </div>
      {c.foot && <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, color: tone === "accent" ? "var(--accent)" : "var(--fg-subtle)", letterSpacing: "0.06em", position: "relative", fontStyle: "italic" }}>— {c.foot}</div>}
      {state === "trial" && <div style={{ display: "flex", gap: 8, position: "relative", marginTop: 4 }}><PSPrimaryButton onClick={onAction}>Add a card</PSPrimaryButton><PSSecondaryButton onClick={onAction}>Stay free</PSSecondaryButton></div>}
      {state === "pastDue" && <div style={{ display: "flex", gap: 8, position: "relative", marginTop: 4 }}><PSPrimaryButton onClick={onAction}>Update payment</PSPrimaryButton><PSSecondaryButton onClick={onAction}>Downgrade</PSSecondaryButton></div>}
      {state === "paid" && <div style={{ display: "flex", gap: 8, position: "relative", marginTop: 4 }}><PSSecondaryButton onClick={onAction}>Manage in Stripe</PSSecondaryButton></div>}
    </div>
  );
}

// ─── Theme picker ────────────────────────────────────────────

function ThemeSwatch({ themeKey, active, onClick }) {
  const theme = (window.CC_THEMES || {})[themeKey];
  if (!theme) return null;
  const t = theme.tokens;
  return (
    <button type="button" onClick={onClick} style={{
      all: "unset", cursor: "pointer", flex: 1, minWidth: 0,
      borderRadius: 12, padding: 10, background: t.bg,
      border: active ? `2px solid ${t.signal}` : `1px solid ${t["border-strong"]}`,
      boxShadow: active ? `0 0 0 4px color-mix(in oklch, ${t.signal} 14%, transparent)` : "none",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 10, height: 10, borderRadius: 5, background: t.signal }} />
        <span style={{ width: 10, height: 10, borderRadius: 5, background: t.accent }} />
        <span style={{ width: 10, height: 10, borderRadius: 5, background: t["fg-muted"], opacity: 0.6 }} />
        {active && <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 700, color: t.signal, letterSpacing: "0.14em", textTransform: "uppercase" }}>active</span>}
      </div>
      <div style={{ background: t["surface-1"], border: `1px solid ${t.border}`, borderRadius: 6, padding: "6px 8px", display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ fontFamily: "Inter, system-ui", fontSize: 11, fontWeight: 800, color: t.fg, letterSpacing: "-0.01em" }}>Habstrakt</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 600, color: t["fg-muted"], letterSpacing: "0.04em" }}>$35 · GA</div>
      </div>
      <div style={{ fontFamily: "Inter, system-ui", fontSize: 12, fontWeight: 700, color: t.fg, letterSpacing: "-0.005em" }}>{theme.label}</div>
    </button>
  );
}

function ThemePickerInline({ value, onChange = () => {}, futureSlots = 0 }) {
  const keys = window.CC_THEME_KEYS || ["electric", "jade", "light"];
  return (
    <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "var(--fg-muted)" }}>{PSIcon.paint}</span>
        <div style={{ fontFamily: "Inter, system-ui", fontSize: 14, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.005em" }}>Theme</div>
        <div style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: "var(--fg-subtle)", letterSpacing: "0.06em" }}>tap to switch</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 8 }}>
        {keys.map(k => <ThemeSwatch key={k} themeKey={k} active={value === k} onClick={() => onChange(k)} />)}
        {Array.from({ length: futureSlots }).map((_, i) => (
          <div key={"slot" + i} style={{
            borderRadius: 12, padding: 10, minHeight: 78,
            border: "1px dashed var(--border-strong)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
            color: "var(--fg-subtle)",
          }}>
            <span style={{ fontSize: 14 }}>+</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase" }}>future</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Submissions ─────────────────────────────────────────────

function StatusPill({ status }) {
  const map = {
    confirmed: { tone: "success", label: "confirmed" },
    pending:   { tone: "warning", label: "pending"   },
    disputed:  { tone: "danger",  label: "disputed"  },
  };
  const c = map[status] || map.pending;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 7px", borderRadius: 999,
      background: `color-mix(in oklch, var(--${c.tone}) 10%, transparent)`,
      border: `1px solid var(--${c.tone})`, color: `var(--${c.tone})`,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase",
    }}>{c.label}</span>
  );
}

function SubmissionItem({ s, onClick = () => {}, last = false }) {
  return (
    <button type="button" onClick={onClick} style={{
      all: "unset", cursor: "pointer", display: "flex", flexDirection: "column", gap: 6,
      padding: "12px 14px", borderBottom: last ? "none" : "1px solid var(--border)",
      width: "100%", boxSizing: "border-box",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <StatusPill status={s.status} />
        <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--fg-subtle)", letterSpacing: "0.04em" }}>{s.ago} ago</span>
      </div>
      <div style={{ fontFamily: "Inter, system-ui", fontSize: 14, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.artist}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "Inter, system-ui", fontSize: 16, fontWeight: 900, color: "var(--fg)", letterSpacing: "-0.02em" }}>${s.floor}{s.ceiling && s.ceiling !== s.floor ? `–${s.ceiling}` : ""}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: "var(--fg-subtle)", letterSpacing: "0.10em", textTransform: "uppercase" }}>{s.tier}</span>
        <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--fg-muted)", letterSpacing: "0.04em" }}>{s.venue} · {s.date}</span>
      </div>
      {s.confirms > 0 && <div style={{ fontFamily: "Inter, system-ui", fontSize: 12, color: "var(--fg-muted)", letterSpacing: "-0.005em" }}>{s.confirms} other fan{s.confirms === 1 ? "" : "s"} confirmed.</div>}
      {s.status === "disputed" && <div style={{ fontFamily: "Inter, system-ui", fontSize: 12, color: "var(--danger)", letterSpacing: "-0.005em" }}>Someone disputed this. Tap to see what they saw.</div>}
    </button>
  );
}

function MySubmissionsList({ submissions = [], onItem = () => {}, max = null }) {
  if (submissions.length === 0) {
    return (
      <PSCard padding="22px 18px">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
          <div style={{ fontFamily: "Inter, system-ui", fontSize: 15, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.01em" }}>You haven't submitted any prices yet.</div>
          <div style={{ fontFamily: "Inter, system-ui", fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.5, letterSpacing: "-0.005em" }}>The next show you go to, drop the price you saw. Two fans confirm and it goes live.</div>
        </div>
      </PSCard>
    );
  }
  const list = max ? submissions.slice(0, max) : submissions;
  return (
    <SettingsRowGroup>
      {list.map((s, i) => <SubmissionItem key={s.id} s={s} onClick={() => onItem(s)} last={i === list.length - 1} />)}
    </SettingsRowGroup>
  );
}

// ─── Danger zone ─────────────────────────────────────────────

function DangerZone({ onSignOut = () => {}, onDelete = () => {} }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <SettingsRowGroup>
        <SettingsRow
          leading={<span style={{ color: "var(--fg-muted)" }}>{PSIcon.signout}</span>}
          label="Sign out"
          value="Burn your tokens. We'll remember you."
          chevron={false}
          onClick={onSignOut}
          last
        />
      </SettingsRowGroup>
      <PSCard danger padding="14px 14px">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "var(--danger)" }}>{PSIcon.trash}</span>
            <div style={{ fontFamily: "Inter, system-ui", fontSize: 14, fontWeight: 800, color: "var(--danger)", letterSpacing: "-0.005em" }}>Delete account</div>
          </div>
          <div style={{ fontFamily: "Inter, system-ui", fontSize: 12.5, lineHeight: 1.5, color: "var(--fg-muted)", letterSpacing: "-0.005em" }}>
            <strong style={{ color: "var(--fg)" }}>This is permanent.</strong> Your handle, email, and profile will be deleted. Prices you've submitted stay in the public record but are anonymized — your name is removed. You can't undo it.
          </div>
          <div style={{ marginTop: 4 }}>
            <PSDangerButton small onClick={onDelete}>Delete my account</PSDangerButton>
          </div>
        </div>
      </PSCard>
    </div>
  );
}

// ─── Delete confirm ──────────────────────────────────────────

function DeleteAccountConfirm({ onCancel = () => {}, onConfirm = () => {}, initialPhase = "type" }) {
  const [typed, setTyped] = React.useState(initialPhase === "armed" ? "DELETE" : "");
  const [phase, setPhase] = React.useState(initialPhase);
  const armed = typed === "DELETE";
  React.useEffect(() => { setPhase(armed ? "armed" : "type"); }, [armed]);
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", background: "var(--scrim)" }}>
      <div onClick={onCancel} style={{ flex: 1 }} />
      <div style={{
        background: "var(--bg-elevated)",
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        borderTop: "1px solid var(--danger)",
        padding: "16px 18px 22px",
        display: "flex", flexDirection: "column", gap: 14,
        boxShadow: "0 -24px 60px -10px rgba(0,0,0,0.5)",
      }}>
        <div style={{ width: 44, height: 4, borderRadius: 2, background: "var(--border-strong)", alignSelf: "center" }} />
        <div style={{ fontFamily: "Inter, system-ui", fontSize: 20, fontWeight: 900, color: "var(--fg)", letterSpacing: "-0.02em", lineHeight: 1.15 }}>Delete your account?</div>
        <div style={{ fontFamily: "Inter, system-ui", fontSize: 13, lineHeight: 1.55, color: "var(--fg-muted)", letterSpacing: "-0.005em" }}>
          This <strong style={{ color: "var(--danger)" }}>can't be undone</strong>. Your handle <code style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--accent)" }}>@hugh</code>, email, plan, and {SAMPLE_SUBMISSIONS.length} submitted prices are gone the moment you tap delete.
        </div>
        <div style={{ fontFamily: "Inter, system-ui", fontSize: 12.5, fontWeight: 600, color: "var(--fg)", letterSpacing: "-0.005em" }}>
          Type <strong style={{ color: "var(--danger)" }}>DELETE</strong> to confirm.
        </div>
        <div style={{ background: "var(--surface-1)", border: armed ? "1.5px solid var(--danger)" : "1px solid var(--border-strong)", borderRadius: 10, padding: "0 12px" }}>
          <input type="text" value={typed} onChange={e => setTyped(e.target.value)} placeholder="DELETE" style={{
            all: "unset", boxSizing: "border-box", width: "100%", padding: "12px 0",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700,
            color: "var(--fg)", letterSpacing: "0.06em",
          }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <PSSecondaryButton onClick={onCancel} fullWidth>Keep my account</PSSecondaryButton>
          <PSDangerButton onClick={armed ? onConfirm : () => {}} solid fullWidth>{phase === "deleting" ? "Deleting…" : "Delete forever"}</PSDangerButton>
        </div>
      </div>
    </div>
  );
}

// ─── Edit profile route ──────────────────────────────────────

function EditField({ label, value, onChange, placeholder, prefix, hint, disabled, error }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontFamily: "Inter, system-ui", fontSize: 13, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.005em" }}>{label}</div>
      <div style={{
        display: "flex", alignItems: "center",
        background: "var(--surface-1)",
        border: error ? "1.5px solid var(--danger)" : "1px solid var(--border-strong)",
        borderRadius: 10, padding: prefix ? "0 0 0 12px" : "0 12px",
        opacity: disabled ? 0.5 : 1,
      }}>
        {prefix && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: "var(--fg-muted)" }}>{prefix}</span>}
        <input type="text" value={value} onChange={e => onChange && onChange(e.target.value)} placeholder={placeholder} disabled={disabled} style={{
          all: "unset", boxSizing: "border-box", flex: 1, minWidth: 0,
          padding: "12px 12px",
          fontFamily: "Inter, system-ui", fontSize: 15, fontWeight: 600,
          color: "var(--fg)", letterSpacing: "-0.005em",
        }} />
      </div>
      {error && <div style={{ fontFamily: "Inter, system-ui", fontSize: 12, fontWeight: 600, color: "var(--danger)", letterSpacing: "-0.005em" }}>{error}</div>}
      {!error && hint && <div style={{ fontFamily: "Inter, system-ui", fontSize: 12, lineHeight: 1.45, color: "var(--fg-muted)", letterSpacing: "-0.005em" }}>{hint}</div>}
    </div>
  );
}

function EditProfileRoute({ user = SAMPLE_USER_HANDLE, initialPhase = "edit", initialHandle = null, onCancel = () => {}, onSave = () => {} }) {
  const [handle, setHandle] = React.useState(initialHandle != null ? initialHandle : (user.handle || ""));
  const [city, setCity] = React.useState(user.city || "");
  const [avatarColor, setAvatarColor] = React.useState(user.avatarColor || "signal");
  const [phase] = React.useState(initialPhase);
  const RESERVED = ["admin", "concertcrawl", "crawl", "support", "hugh", "founder"];
  const TAKEN_DEMO = ["phoebe", "casey", "riley"];
  const lower = handle.toLowerCase();
  const invalid = handle.length > 0 && /[^a-z0-9_]/i.test(handle);
  const tooShort = handle.length > 0 && handle.length < 3 && !invalid;
  const reserved = RESERVED.includes(lower) && (user.handle || "").toLowerCase() !== lower;
  const taken = TAKEN_DEMO.includes(lower) && (user.handle || "").toLowerCase() !== lower;
  const error = invalid ? "Letters, numbers, and underscores only."
             : tooShort ? "Handles need at least 3 characters."
             : reserved ? "@" + lower + " is reserved."
             : taken    ? "@" + lower + " is taken. Try something else."
             : null;
  const isAnonInit = !user.handle;
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)", display: "flex", flexDirection: "column", fontFamily: "Inter, system-ui", overflow: "hidden" }}>
      <header style={{ flexShrink: 0, padding: "16px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
        <button type="button" onClick={onCancel} style={{ all: "unset", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: "var(--fg-muted)", letterSpacing: "0.10em", textTransform: "uppercase" }}>← Cancel</button>
        <div style={{ fontFamily: "Inter, system-ui", fontSize: 14, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.005em" }}>{isAnonInit ? "Pick a handle" : "Edit profile"}</div>
        <button type="button" onClick={() => !error && onSave({ handle, city })} style={{ all: "unset", cursor: error ? "not-allowed" : "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: error ? "var(--fg-subtle)" : "var(--signal)", letterSpacing: "0.10em", textTransform: "uppercase" }}>{phase === "saving" ? "Saving…" : "Save"}</button>
      </header>
      <main style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar user={{ handle: handle || null, avatarColor }} colorKey={avatarColor} size={68} anonymous={!handle} ringed />
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontFamily: "Inter, system-ui", fontSize: 13, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.005em" }}>Avatar color</div>
            <div style={{ display: "flex", gap: 8 }}>
              {["signal", "accent", "success", "warning"].map(c => {
                const selected = avatarColor === c;
                return (
                  <button key={c} type="button" onClick={() => setAvatarColor(c)}
                    aria-label={"Pick " + c + " avatar color"}
                    aria-pressed={selected}
                    style={{
                      all: "unset", cursor: "pointer", width: 28, height: 28, borderRadius: "50%",
                      background: `color-mix(in oklch, var(--${c}) 36%, var(--surface-1))`,
                      border: `1.5px solid var(--${c})`,
                      boxShadow: selected ? `0 0 0 3px color-mix(in oklch, var(--${c}) 24%, transparent)` : "none",
                      transition: "box-shadow 120ms ease",
                    }} />
                );
              })}
            </div>
          </div>
        </div>
        <EditField
          label="Handle" value={handle} onChange={setHandle} prefix="@" placeholder="pick something"
          hint={isAnonInit ? "Other fans see this on prices you submit. You can stay anonymous — leave it blank." : "Other fans see this on every price you've ever submitted. Change it any time."}
          error={(phase === "error" || handle.length > 0) && error}
        />
        <EditField label="City" value={city} onChange={setCity} placeholder="Denver, CO" hint="Optional. Used to surface shows nearby. Never shown publicly." />
        {!isAnonInit && (
          <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fg-subtle)" }}>Going anonymous</div>
            <div style={{ fontFamily: "Inter, system-ui", fontSize: 12.5, lineHeight: 1.5, color: "var(--fg-muted)", letterSpacing: "-0.005em" }}>Clear your handle to drop back to <em>anonymous fan</em>. Existing submissions get reattributed retroactively — they're yours, but no one sees your name on them anymore.</div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Settings hub — MOBILE ───────────────────────────────────

function SettingsRoute({
  user = SAMPLE_USER_HANDLE,
  submissions = SAMPLE_SUBMISSIONS,
  planState = "founder",
  themeKey = "electric",
  onChangeTheme = () => {},
  showDeleteSheet = false,
  onSignOut = () => {},
  onDelete = () => {},
  onEditProfile = () => {},
  onClose = () => {},
}) {
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)", display: "flex", flexDirection: "column", fontFamily: "Inter, system-ui", overflow: "hidden", position: "relative" }}>
      <header style={{ flexShrink: 0, padding: "16px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button type="button" onClick={onClose} style={{ all: "unset", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: "var(--fg-muted)", letterSpacing: "0.10em", textTransform: "uppercase" }}>← Done</button>
        <div style={{ fontFamily: "Inter, system-ui", fontSize: 14, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.005em" }}>Settings</div>
        <div style={{ width: 50 }} />
      </header>
      <main style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "8px 20px 28px", display: "flex", flexDirection: "column", gap: 22 }}>
        <ProfileHero user={user} onEdit={onEditProfile} />
        <div><PSLabel>Your plan</PSLabel><PlanCard state={planState} /></div>
        <div><PSLabel>Appearance</PSLabel><ThemePickerInline value={themeKey} onChange={onChangeTheme} /></div>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
            <PSLabel>My submissions</PSLabel>
            {submissions.length > 0 && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: "var(--fg-subtle)", letterSpacing: "0.06em" }}>{submissions.length} total</span>}
          </div>
          <MySubmissionsList submissions={submissions} max={3} />
          {submissions.length > 3 && (
            <button type="button" style={{ all: "unset", cursor: "pointer", marginTop: 10, padding: "10px 0", width: "100%", textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: "var(--signal)", letterSpacing: "0.10em", textTransform: "uppercase" }}>See all {submissions.length} →</button>
          )}
        </div>
        <div>
          <PSLabel>Account</PSLabel>
          <SettingsRowGroup>
            <SettingsRow leading={<span style={{ color: "var(--fg-muted)" }}>{PSIcon.mail}</span>} label="Email" value={user.email} />
            <SettingsRow leading={<span style={{ color: "var(--fg-muted)" }}>{PSIcon.shield}</span>} label="Password" value="Last changed 3 weeks ago" trailing={<span style={{ color: "var(--fg-subtle)", display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase" }}>Clerk <PSExternalArrow /></span>} chevron={false} last />
          </SettingsRowGroup>
        </div>
        <div><PSLabel>Lists</PSLabel><WatchingTeaser /></div>
        <div><PSLabel>Danger zone</PSLabel><DangerZone onSignOut={onSignOut} onDelete={onDelete} /></div>
        <div style={{ paddingTop: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600, color: "var(--fg-subtle)", letterSpacing: "0.10em", textTransform: "uppercase", textAlign: "center" }}>concertcrawl · v0.1 beta · Denver pilot</div>
      </main>
      {showDeleteSheet && <DeleteAccountConfirm />}
    </div>
  );
}

// ─── Watching teaser ("soon" indicator beefed up) ────────
function WatchingTeaser({ compact = false }) {
  return (
    <div style={{
      position: "relative", overflow: "hidden",
      background: "linear-gradient(135deg, color-mix(in oklch, var(--accent) 8%, var(--surface-1)), var(--surface-1) 70%)",
      border: "1px solid var(--border-strong)",
      borderRadius: 12, padding: "14px 14px",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 100% 0%, color-mix(in oklch, var(--accent) 20%, transparent), transparent 60%)", pointerEvents: "none" }} />
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: "color-mix(in oklch, var(--accent) 14%, transparent)",
        border: "1px solid var(--accent)",
        color: "var(--accent)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        position: "relative",
      }}>
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M8 1.5l1.94 3.93 4.34.63-3.14 3.06.74 4.32L8 11.4l-3.88 2.04.74-4.32L1.72 6.06l4.34-.63z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontFamily: "Inter, system-ui", fontSize: 14, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.005em" }}>Watching</div>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "3px 7px", borderRadius: 999,
            background: "var(--accent)", color: "var(--bg)",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase",
          }}>
            <span aria-hidden style={{ width: 5, height: 5, borderRadius: 3, background: "var(--bg)" }} />
            Coming soon
          </span>
        </div>
        {!compact && <div style={{ fontFamily: "Inter, system-ui", fontSize: 12.5, lineHeight: 1.45, color: "var(--fg-muted)", letterSpacing: "-0.005em" }}>Star a show — we'll ping you when prices drop or new tickets surface. Lands with notifications.</div>}
      </div>
    </div>
  );
}

// ─── Settings hub — MOBILE single-scroll variant ─────────────

function SettingsScrollVariant(props) { return <SettingsRoute {...props} />; }

// ─── Settings hub — DESKTOP ──────────────────────────────────

function SectionTitle({ title, subtitle }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontFamily: "Inter, system-ui", fontSize: 22, fontWeight: 900, color: "var(--fg)", letterSpacing: "-0.025em", lineHeight: 1.15 }}>{title}</div>
      {subtitle && <div style={{ fontFamily: "Inter, system-ui", fontSize: 13.5, lineHeight: 1.5, color: "var(--fg-muted)", letterSpacing: "-0.005em" }}>{subtitle}</div>}
    </div>
  );
}

function SettingsRouteDesktop({
  user = SAMPLE_USER_HANDLE,
  submissions = SAMPLE_SUBMISSIONS,
  planState = "founder",
  themeKey = "electric",
  onChangeTheme = () => {},
  activeSection = "profile",
  onSignOut = () => {},
  onDelete = () => {},
  onEditProfile = () => {},
}) {
  const sections = [
    { key: "profile",     label: "Profile",         icon: PSIcon.user },
    { key: "plan",        label: "Plan",            icon: PSIcon.card },
    { key: "submissions", label: "My submissions",  icon: PSIcon.list, count: submissions.length },
    { key: "appearance",  label: "Appearance",      icon: PSIcon.paint },
    { key: "account",     label: "Account",         icon: PSIcon.shield },
    { key: "danger",      label: "Danger zone",     icon: PSIcon.trash, danger: true },
  ];
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)", display: "flex", flexDirection: "column", fontFamily: "Inter, system-ui", overflow: "hidden" }}>
      <header style={{ flexShrink: 0, padding: "18px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {PS_CCClusterMark && <PS_CCClusterMark size={22} color="var(--signal)" glow="var(--accent)" />}
          {PS_CCWordmark && <PS_CCWordmark size={16} />}
        </div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: "var(--fg-muted)", letterSpacing: "0.10em", textTransform: "uppercase" }}>← Back to browse</span>
      </header>
      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <aside style={{ flexShrink: 0, width: 260, borderRight: "1px solid var(--border)", padding: "26px 18px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
          <ProfileHero user={user} dense onEdit={onEditProfile} />
          <PSDivider />
          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {sections.map(s => {
              const active = s.key === activeSection;
              return (
                <button key={s.key} type="button" style={{
                  all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", borderRadius: 8,
                  background: active ? "var(--overlay-hover)" : "transparent",
                  border: active ? "1px solid var(--border-strong)" : "1px solid transparent",
                  color: s.danger ? "var(--danger)" : active ? "var(--fg)" : "var(--fg-muted)",
                  fontFamily: "Inter, system-ui", fontSize: 13.5, fontWeight: active ? 700 : 600, letterSpacing: "-0.005em",
                }}>
                  <span style={{ display: "inline-flex", color: s.danger ? "var(--danger)" : (active ? "var(--signal)" : "var(--fg-subtle)") }}>{s.icon}</span>
                  <span style={{ flex: 1 }}>{s.label}</span>
                  {s.count != null && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: "var(--fg-subtle)", letterSpacing: "0.04em" }}>{s.count}</span>}
                </button>
              );
            })}
          </nav>
        </aside>
        <main style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "32px 40px" }}>
          <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 22 }}>
            {activeSection === "profile" && (
              <>
                <SectionTitle title="Profile" subtitle="What other fans see when you submit a price." />
                <ProfileHero user={user} onEdit={onEditProfile} />
                {!user.handle ? (
                  <PSCard padding="14px 16px">
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ fontFamily: "Inter, system-ui", fontSize: 14, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.005em" }}>Submitting as <em>anonymous fan</em>.</div>
                      <div style={{ fontFamily: "Inter, system-ui", fontSize: 12.5, lineHeight: 1.5, color: "var(--fg-muted)", letterSpacing: "-0.005em" }}>That's fine — most fans stay anonymous. If you want credit on your prices (and the option to be tagged when someone confirms one), pick a handle.</div>
                      <div style={{ marginTop: 4 }}><PSPrimaryButton onClick={onEditProfile}>Pick a handle</PSPrimaryButton></div>
                    </div>
                  </PSCard>
                ) : (
                  <PSCard padding="14px 16px">
                    <div style={{ fontFamily: "Inter, system-ui", fontSize: 12.5, lineHeight: 1.5, color: "var(--fg-muted)", letterSpacing: "-0.005em" }}>
                      Other fans see <strong style={{ color: "var(--accent)" }}>@{user.handle}</strong> on every price you've submitted, and can tag you on confirmations. Drop the handle any time to go anonymous — your existing submissions get reattributed.
                    </div>
                  </PSCard>
                )}
              </>
            )}
            {activeSection === "plan" && (<><SectionTitle title="Plan" subtitle="What you're paying us. (Spoiler: nothing.)" /><PlanCard state={planState} /></>)}
            {activeSection === "submissions" && (<><SectionTitle title="My submissions" subtitle={`${submissions.length} total · ${submissions.filter(s => s.status === "confirmed").length} confirmed by other fans.`} /><MySubmissionsList submissions={submissions} /></>)}
            {activeSection === "appearance" && (<><SectionTitle title="Appearance" subtitle="Three flavors. Pick the one that hurts your eyes least." /><ThemePickerInline value={themeKey} onChange={onChangeTheme} /></>)}
            {activeSection === "account" && (
              <>
                <SectionTitle title="Account" subtitle="The actual login bits. Lives in Clerk, not here." />
                <SettingsRowGroup>
                  <SettingsRow leading={<span style={{ color: "var(--fg-muted)" }}>{PSIcon.mail}</span>} label="Email" value={user.email} />
                  <SettingsRow leading={<span style={{ color: "var(--fg-muted)" }}>{PSIcon.shield}</span>} label="Password" value="Last changed 3 weeks ago" trailing={<span style={{ color: "var(--fg-subtle)", display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase" }}>Clerk <PSExternalArrow /></span>} chevron={false} last />
                </SettingsRowGroup>
              </>
            )}
            {activeSection === "danger" && (<><SectionTitle title="Danger zone" subtitle="The exits." /><DangerZone onSignOut={onSignOut} onDelete={onDelete} /></>)}
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Exports ─────────────────────────────────────────────────

Object.assign(window, {
  SettingsRoute, SettingsRouteDesktop, SettingsScrollVariant,
  EditProfileRoute, DeleteAccountConfirm,
  ProfileHero, ProfileEntryAvatar, PlanCard, ThemePickerInline,
  MySubmissionsList, DangerZone, Avatar, MonogramPoster, StatusPill,
  RoleBadge, RoleCard, WatchingTeaser,
  PS_ROLE_KEYS: Object.keys(ROLE_COPY),
  PS_SAMPLE_SUBMISSIONS: SAMPLE_SUBMISSIONS,
  PS_SAMPLE_USER_HANDLE: SAMPLE_USER_HANDLE,
  PS_SAMPLE_USER_ANON:   SAMPLE_USER_ANON,
});

// Sentinel — the inline boot script polls this before first render so it doesn't
// race the async @babel/standalone pipeline. This file is the last in the chain.
window.__ps_ready = true;

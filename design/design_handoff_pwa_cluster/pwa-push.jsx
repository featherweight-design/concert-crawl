// pwa-push.jsx — #971 web push (Tier C)
// Post-watch permission sheet (+ iOS-not-installed variant) and per-category
// notification cards. The Settings → Notifications surface lives in the real
// settings screen (profile-settings-screens.jsx · NotificationsSection) — it is
// a section of that screen, not a separate page. This file owns only the push
// *moments* + notification *content*. Tokens only. No auto re-asks after "Not
// now" — Settings manual enable only. Switch here is shared with that section.

const { PWA_FONT: PF, PWA_MONO: PM } = window;
const { CCMark, Eyebrow, BottomSheet, PrimaryButton, GhostButton, Icon } = window;
const { PUSH_COPY } = window;

// ── Post-watch permission sheet ────────────────────────────────────────────
// variant: "default" — eng wires "Turn on" to `Notification.requestPermission()`;
// the prototype stubs it as close-only since the browser dialog can't render in
// a static handoff. "ios" (non-installed iOS Safari — becomes install-first).
function PostWatchSheet({ open, onClose, variant = "default", onShowInstall }) {
  const ios = variant === "ios";
  const c = ios ? PUSH_COPY.iosNotInstalled : PUSH_COPY.postWatch;
  return (
    <BottomSheet open={open} onClose={onClose} labelId="push-sheet-title" maxH="80%">
      <Eyebrow color="var(--accent)" style={{ marginBottom: 10 }}>{c.eyebrow}</Eyebrow>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 11,
          background: "color-mix(in oklab, var(--accent) 16%, transparent)",
          display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
          <Icon name={ios ? "share" : "bell"} size={21} color="var(--accent)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 id="push-sheet-title" style={{ margin: 0, fontFamily: PF, fontWeight: 900,
            fontSize: 20, letterSpacing: "-0.02em", color: "var(--fg)", lineHeight: 1.18,
            textWrap: "pretty" }}>{c.title}</h2>
          <p style={{ margin: "8px 0 0", fontFamily: PF, fontSize: 13.5, color: "var(--fg-muted)",
            lineHeight: 1.5, textWrap: "pretty" }}>{c.sub}</p>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 22 }}>
        <PrimaryButton full onClick={ios ? onShowInstall : onClose}>
          {ios ? c.showMe : c.turnOn}</PrimaryButton>
        <GhostButton full onClick={onClose}>{c.notNow}</GhostButton>
      </div>
      {!ios && (
        <p style={{ margin: "12px 0 0", textAlign: "center", fontFamily: PM, fontSize: 10,
          color: "var(--fg-subtle)", letterSpacing: "0.02em" }}>{c.footnote}</p>
      )}
    </BottomSheet>
  );
}

// ── Toggle (role=switch) — shared with the settings NotificationsSection ────
function Switch({ on, disabled, label, onClick }) {
  return (
    <button type="button" role="switch" aria-checked={!!on} aria-label={label} disabled={disabled}
      onClick={onClick} style={{ all: "unset", cursor: disabled ? "not-allowed" : "pointer",
        width: 46, height: 28, borderRadius: 999, flexShrink: 0, position: "relative",
        background: on ? "var(--signal)" : "var(--surface-3)",
        opacity: disabled ? 0.5 : 1, transition: "background .15s",
        boxShadow: "inset 0 0 0 1px var(--border-strong)" }}>
      <span style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 22, height: 22,
        borderRadius: 999, background: on ? "var(--fg-on-accent)" : "var(--fg-muted)",
        transition: "left .15s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
    </button>
  );
}

// ── OS-level notification card (per category) ──────────────────────────────
function NotificationCard({ item, time = "now" }) {
  return (
    <div style={{ display: "flex", gap: 11, padding: "12px 13px", borderRadius: 18,
      background: "var(--surface-1)", border: "1px solid var(--border)",
      boxShadow: "0 6px 20px rgba(0,0,0,0.18)" }}>
      <div style={{ width: 38, height: 38, borderRadius: 9, overflow: "hidden", flexShrink: 0 }}>
        <CCMark size={38} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{ fontFamily: PM, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "var(--fg-subtle)" }}>CONCERT CRAWL</span>
          <span style={{ fontFamily: PF, fontSize: 11, color: "var(--fg-subtle)", marginLeft: "auto" }}>{time}</span>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", padding: "2px 7px", borderRadius: 5,
          background: "color-mix(in oklab, var(--signal) 14%, transparent)", marginBottom: 5 }}>
          <span style={{ fontFamily: PM, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.06em",
            textTransform: "uppercase", color: "var(--signal)" }}>{item.tag}</span>
        </div>
        <div style={{ fontFamily: PF, fontWeight: 700, fontSize: 13.5, color: "var(--fg)",
          lineHeight: 1.3, letterSpacing: "-0.01em", textWrap: "pretty" }}>{item.title}</div>
        <div style={{ fontFamily: PF, fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.4,
          marginTop: 2, textWrap: "pretty" }}>{item.body}</div>
      </div>
    </div>
  );
}

// Stack of all category cards (for the anatomy artboard)
function NotificationStack() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {PUSH_COPY.notifications.map((n) => <NotificationCard key={n.key} item={n} />)}
    </div>
  );
}

Object.assign(window, {
  PostWatchSheet, NotificationCard, NotificationStack, PushSwitch: Switch,
});

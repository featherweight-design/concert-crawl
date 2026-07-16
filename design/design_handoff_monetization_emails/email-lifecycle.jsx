// email-lifecycle.jsx — #783 · cancellation acknowledgment + win-back
//
// CANCELLATION (brief §4 locked): confirmation surface, NOT a sales pitch.
//   No win-back hook, no urgency, no "last chance". Confirm the cancel, state
//   the access-until date clearly, reassure that nothing saved is lost.
// WIN-BACK (basic shape only): single hero copy block + single CTA. No
//   "we miss you" saccharine, no countdown, no discount gimmick.
//
// Exports (window): CancellationEmail({ periodEnd }), WinbackEmail,
//   LIFECYCLE_COPY, cancellationPlain, winbackPlain

const { ME, EmShell, EmPreheader, EmHeader, EmLede, EmButton, EmDivider,
        EmFeatureList, EmCallout, EmFooter, EmMonoEyebrow } = window;

const LC_FONT = "Inter, -apple-system, 'Segoe UI', Arial, sans-serif";
const LC_MONO = "'JetBrains Mono', 'SFMono-Regular', Menlo, monospace";

const LIFECYCLE_COPY = {
  cancel: {
    subject: "Your Premium's set to wind down.",
    preheader: "You're good through Aug 15. No hooks, no hard feelings.",
  },
  winback: {
    subject: "Denver's been busy since you left.",
    preheader: "Here's what Premium would hand back. No pressure, no countdown.",
  },
};

const WINBACK_FEATURES = [
  "Concert history — every show you attend, logged",
  "Calendar export — Apple + Google, one tap",
  "Follow artists + new-show alerts",
  "Price-drop alerts + Spotify sync",
];

// ── Cancellation acknowledgment ──────────────────────────────
function CancellationEmail({ periodEnd = "Aug 15, 2026" }) {
  return (
    <EmShell>
      <EmPreheader>{LIFECYCLE_COPY.cancel.preheader}</EmPreheader>
      <EmHeader eyebrow="Subscription" />

      <tr><td style={{ padding: "24px 26px 0" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: 7, background: ME.muted, display: "inline-block" }} />
          <EmMonoEyebrow color={ME.muted}>Cancelled</EmMonoEyebrow>
        </div>
      </td></tr>

      <EmLede
        title="Cancelled. No more charges."
        sub={`Done — we won't bill you again. Premium keeps working right up until ${periodEnd}, then your account drops back to Free.`}
        titleSize={26}
      />

      {/* Access-until, stated plainly */}
      <tr><td style={{ padding: "20px 26px 0" }}>
        <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style={{ background: ME.surf, borderRadius: 12, border: `1px solid ${ME.border}` }}><tbody><tr>
          <td style={{ padding: "16px 18px" }}>
            <EmMonoEyebrow color={ME.subtle} style={{ marginBottom: 7 }}>Premium works until</EmMonoEyebrow>
            <div style={{ fontFamily: LC_FONT, fontWeight: 900, fontSize: 24, color: ME.fg, letterSpacing: "-0.03em" }}>{periodEnd}</div>
          </td>
        </tr></tbody></table>
      </td></tr>

      {/* What changes — neutral, no fear, no pitch */}
      <tr><td style={{ padding: "18px 26px 0" }}>
        <EmMonoEyebrow color={ME.subtle} style={{ marginBottom: 10 }}>What changes after that</EmMonoEyebrow>
        <div style={{ fontFamily: LC_FONT, fontSize: 13.5, color: ME.muted, lineHeight: 1.6 }}>
          History, alerts, calendar export, and Spotify sync go quiet. Browse, search, filters, watching a show, and community prices stay free — same as always. <span style={{ color: ME.fg, fontWeight: 600 }}>Everything you've saved stays saved.</span>
        </div>
      </td></tr>

      {/* Neutral affordance — NOT a comeback pitch */}
      <tr><td style={{ padding: "22px 26px 8px" }}>
        <EmButton tone="ghost">Manage subscription</EmButton>
      </td></tr>

      <EmFooter family="billing" showManage={false} note="If this cancel was a surprise, reply to this email and we'll sort it out." />
    </EmShell>
  );
}

// ── Win-back — single hero block + single CTA ────────────────
function WinbackEmail() {
  return (
    <EmShell>
      <EmPreheader>{LIFECYCLE_COPY.winback.preheader}</EmPreheader>
      <EmHeader eyebrow="Concert Crawl" />

      <EmLede
        eyebrow="Whenever you want"
        title="Denver's been busy."
        sub="Since you switched back to Free, Premium's quietly picked up a few things. Whenever you want them back, they're one tap away — no countdown, no discount gimmick. Just here when you are."
        titleSize={27}
      />

      <tr><td style={{ padding: "20px 26px 0" }}>
        <EmCallout accent={ME.signal}>
          <EmMonoEyebrow color={ME.signal} style={{ marginBottom: 12 }}>What you'd get back</EmMonoEyebrow>
          <EmFeatureList items={WINBACK_FEATURES} accent={ME.signal} />
        </EmCallout>
      </td></tr>

      {/* single CTA */}
      <tr><td style={{ padding: "20px 26px 8px" }}>
        <EmButton tone="signal">Turn Premium back on</EmButton>
      </td></tr>

      <tr><td style={{ padding: "2px 26px 6px", textAlign: "center" }}>
        <EmMonoEyebrow color={ME.subtle} size={9}>Still $5/mo · cancel any time · no hard sell</EmMonoEyebrow>
      </td></tr>

      <EmFooter family="product" showManage={false} />
    </EmShell>
  );
}

// ── Plain-text fallbacks ─────────────────────────────────────
function cancellationPlain(periodEnd = "Aug 15, 2026") {
  return `CONCERT CRAWL — Subscription cancelled
========================================

Cancelled. No more charges.
Done — we won't bill you again. Premium keeps
working right up until ${periodEnd}, then your
account drops back to Free.

  PREMIUM WORKS UNTIL:  ${periodEnd}

WHAT CHANGES AFTER THAT
History, alerts, calendar export, and Spotify
sync go quiet. Browse, search, filters, watching
a show, and community prices stay free — same as
always. Everything you've saved stays saved.

Manage subscription:
  https://concertcrawl.app/account/plan

If this cancel was a surprise, reply to this
email and we'll sort it out.

----------------------------------------
Turn off billing emails:  {unsubscribe_url}
All email settings:       {email_settings_url}
Concert Crawl · Denver, CO`;
}

function winbackPlain() {
  const feats = WINBACK_FEATURES.map(f => `  - ${f}`).join("\n");
  return `CONCERT CRAWL — Denver's been busy.
========================================

Since you switched back to Free, Premium's
quietly picked up a few things. Whenever you
want them back, they're one tap away — no
countdown, no discount gimmick. Just here when
you are.

WHAT YOU'D GET BACK
${feats}

Turn Premium back on:
  https://concertcrawl.app/account/plan

Still $5/mo. Cancel any time. No hard sell.

----------------------------------------
Turn off product emails:  {unsubscribe_url}
All email settings:       {email_settings_url}
Concert Crawl · Denver, CO`;
}

Object.assign(window, { CancellationEmail, WinbackEmail, LIFECYCLE_COPY, cancellationPlain, winbackPlain });

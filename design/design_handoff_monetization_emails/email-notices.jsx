// email-notices.jsx — #783 · two account notices the brand pass missed
// Both fire today from the daily billing job on the old un-branded Resend shell.
// They inherit the existing DNA (email-primitives.jsx) — no new shell.
//
//   card_expiring_soon  — card on file expires soon (NOT failed). One template,
//     3 trigger windows (30/14/7d) driven by a `days` variable; singular "in 1
//     day" handled. Tier-aware accent. Payment relationship → manage allowed.
//   gifting_ending_notice — comped Premium wraps in ~7d, then slides to Free.
//     Gifted accent (pink), NO billing affordance (mirrors welcome_gifted).
//
// Both are HEADS-UPS, not failures — no amber-alarm treatment (that's dunning).
//
// Exports (window): CardExpiringEmail({ tier, tierName, days }),
//   GiftEndingEmail({ gifterName, giftEndsAt }), NOTICES_COPY,
//   cardExpiringPlain, giftEndingPlain

const { ME, TIER_ACCENT, TIER_META, EmShell, EmPreheader, EmHeader, EmLede,
        EmButton, EmTierBadge, EmFeatureList, EmCallout, EmFooter,
        EmMonoEyebrow } = window;

const NT_FONT = "Inter, -apple-system, 'Segoe UI', Arial, sans-serif";
const NT_MONO = "'JetBrains Mono', 'SFMono-Regular', Menlo, monospace";

// timeframe microcopy — flexes on daysRemaining, singular at 1
function daysPhrase(n) { return n === 1 ? "in 1 day" : `in ${n} days`; }

const NOTICES_COPY = {
  cardExpiring: {
    subject: "Heads up — your card's about to expire.",
    preheader: "Update it before your next renewal. Takes about 30 seconds, no interruption.",
  },
  giftEnding: {
    subject: "Your gifted Premium is wrapping up.",
    preheader: "About a week left. Nothing gets deleted — here's what happens next.",
  },
};

// ── Template 1 · card_expiring_soon ──────────────────────────
// tier drives the accent + badge; tierName is the display label (null → "your
// plan"). days ∈ 30 | 14 | 7 (or 1) drives the timeframe copy.
function CardExpiringEmail({ tier = "premium", tierName, days = 14 }) {
  const accent = TIER_ACCENT[tier] || ME.signal;
  const planLabel = tierName || (tier && TIER_META[tier] ? TIER_META[tier].label : "your plan");
  const planPhrase = tierName || (tier && TIER_META[tier] ? TIER_META[tier].label : "your plan");

  return (
    <EmShell>
      <EmPreheader>{NOTICES_COPY.cardExpiring.preheader}</EmPreheader>
      <EmHeader eyebrow="Billing" />

      {/* neutral heads-up dot — NOT the amber dunning treatment */}
      <tr><td style={{ padding: "24px 26px 0" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: 7, background: accent, display: "inline-block" }} />
          <EmMonoEyebrow color={accent}>Billing · heads up</EmMonoEyebrow>
        </div>
      </td></tr>

      <EmLede
        title={`Your card expires ${daysPhrase(days)}.`}
        sub={`The card on file runs out before your next ${planPhrase} renewal. Drop in a fresh one and nothing skips a beat — no interruption, no dropped features.`}
        titleSize={26}
      />

      {/* card-on-file chip + tier badge */}
      <tr><td style={{ padding: "18px 26px 0" }}>
        <table role="presentation" width="100%" cellPadding="0" cellSpacing="0"><tbody><tr>
          <td style={{ verticalAlign: "middle" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "9px 13px", borderRadius: 10, background: ME.surf, border: `1px solid ${ME.border}` }}>
              <svg width="20" height="14" viewBox="0 0 20 14" style={{ flexShrink: 0 }}><rect x="0.5" y="0.5" width="19" height="13" rx="2" fill="none" stroke={ME.subtle} strokeWidth="1" /><rect x="0.5" y="3" width="19" height="3" fill={ME.subtle} opacity="0.5" /></svg>
              <span style={{ fontFamily: NT_MONO, fontSize: 11.5, color: ME.fg, letterSpacing: "0.04em" }}>Visa ·· 4242</span>
              <span style={{ fontFamily: NT_MONO, fontSize: 10.5, color: ME.subtle, letterSpacing: "0.06em" }}>exp 08/26</span>
            </span>
          </td>
          <td style={{ textAlign: "right", verticalAlign: "middle" }}>
            {tier && <EmTierBadge tier={tier} />}
          </td>
        </tr></tbody></table>
      </td></tr>

      {/* CTA — plan page to update the card */}
      <tr><td style={{ padding: "22px 26px 8px" }}>
        <EmButton tone="signal">Update your card</EmButton>
      </td></tr>

      <tr><td style={{ padding: "2px 26px 6px", textAlign: "center" }}>
        <EmMonoEyebrow color={ME.subtle} size={9}>Nothing's wrong yet · this is just a nudge</EmMonoEyebrow>
      </td></tr>

      <EmFooter family="billing" showManage note="Already updated it? You're set — ignore this one." />
    </EmShell>
  );
}

// ── Template 2 · gifting_ending_notice ───────────────────────
// gifterName (null → "A friend of the crawl"); giftEndsAt (null → "in about a
// week"). Gifted accent (pink), no billing affordance.
function GiftEndingEmail({ gifterName, giftEndsAt }) {
  const gifter = gifterName || "A friend of the crawl";
  const endsPhrase = giftEndsAt ? `on ${giftEndsAt}` : "in about a week";

  return (
    <EmShell>
      <EmPreheader>{NOTICES_COPY.giftEnding.preheader}</EmPreheader>
      <EmHeader eyebrow="Gifted Premium · ending" />

      <EmLede
        eyebrow="Your gift's almost up"
        title="It's been a good run."
        sub={`${gifter} put you on Premium — and the gift wraps up ${endsPhrase}. After that your account slides back to Free. No charge, no surprise.`}
        titleSize={27}
      />

      <tr><td style={{ padding: "8px 26px 0" }}>
        <div style={{ fontFamily: NT_MONO, fontStyle: "italic", fontSize: 12.5, color: ME.accent, letterSpacing: "0.02em" }}>—— Hope it showed you a few good nights.</div>
      </td></tr>

      {/* what happens — neutral, no fear */}
      <tr><td style={{ padding: "18px 26px 0" }}>
        <EmMonoEyebrow color={ME.subtle} style={{ marginBottom: 10 }}>When it ends</EmMonoEyebrow>
        <div style={{ fontFamily: NT_FONT, fontSize: 13.5, color: ME.muted, lineHeight: 1.6 }}>
          History, alerts, calendar export, and Spotify sync go quiet. Browse, search, filters, watching a show, and community prices stay free — same as always. <span style={{ color: ME.fg, fontWeight: 600 }}>Everything you've saved stays saved.</span>
        </div>
      </td></tr>

      {/* what you'd keep — gentle, not a hard sell */}
      <tr><td style={{ padding: "18px 26px 0" }}>
        <EmCallout accent={ME.accent} soft={ME.accentSoft}>
          <EmMonoEyebrow color={ME.accent} style={{ marginBottom: 12 }}>Want to keep it going?</EmMonoEyebrow>
          <EmFeatureList items={[
            "Concert history — every show you attend, logged",
            "Calendar export + Spotify sync",
            "Follow artists + price-drop alerts",
          ]} accent={ME.accent} />
        </EmCallout>
      </td></tr>

      {/* CTA — convert to paid (plan page) */}
      <tr><td style={{ padding: "20px 26px 8px" }}>
        <EmButton tone="signal">Keep Premium — $5/mo</EmButton>
      </td></tr>

      <tr><td style={{ padding: "2px 26px 6px", textAlign: "center" }}>
        <EmMonoEyebrow color={ME.subtle} size={9}>No card on file · nothing gets deleted · only if you want to</EmMonoEyebrow>
      </td></tr>

      {/* no manage-subscription — comped, no payment relationship */}
      <EmFooter family="product" showManage={false} />
    </EmShell>
  );
}

// ── Plain-text fallbacks ─────────────────────────────────────
function cardExpiringPlain(tier = "premium", tierName, days = 14) {
  const planPhrase = tierName || (tier && TIER_META[tier] ? TIER_META[tier].label : "your plan");
  return `CONCERT CRAWL — Card expiring soon
========================================

Your card expires ${daysPhrase(days)}.
The card on file runs out before your next
${planPhrase} renewal. Drop in a fresh one and
nothing skips a beat — no interruption, no
dropped features.

  ON FILE:  Visa ·· 4242 · exp 08/26

Update your card:
  https://concertcrawl.app/account/billing

Nothing's wrong yet — this is just a nudge.
Already updated it? You're set, ignore this one.

----------------------------------------
Turn off billing emails:  {link}
All email settings:       {link}
Manage subscription:      {link}
Concert Crawl · Denver, CO`;
}

function giftEndingPlain(gifterName, giftEndsAt) {
  const gifter = gifterName || "A friend of the crawl";
  const endsPhrase = giftEndsAt ? `on ${giftEndsAt}` : "in about a week";
  return `CONCERT CRAWL — Your gift's almost up
========================================

It's been a good run.
${gifter} put you on Premium — and the gift wraps
up ${endsPhrase}. After that your account slides
back to Free. No charge, no surprise.

  —— Hope it showed you a few good nights.

WHEN IT ENDS
History, alerts, calendar export, and Spotify
sync go quiet. Browse, search, filters, watching
a show, and community prices stay free — same as
always. Everything you've saved stays saved.

Keep Premium — $5/mo:
  https://concertcrawl.app/account/plan

No card on file. Nothing gets deleted. Only if
you want to.

----------------------------------------
Turn off product emails:  {link}
All email settings:       {link}
Concert Crawl · Denver, CO`;
}

Object.assign(window, { CardExpiringEmail, GiftEndingEmail, NOTICES_COPY, cardExpiringPlain, giftEndingPlain, daysPhrase });

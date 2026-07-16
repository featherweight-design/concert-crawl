// email-welcome.jsx — #783 · welcome family
// welcome_paid renders 3 tier visual variants (premium / supporter / founder);
// welcome_gifted is a distinct template (gratitude, no manage-sub CTA).
// Each tier earns its own emotional beat (Hugh, 2026-07-15):
//   founder    = the moment ($3 locked forever + seat #N of 100), understated
//   gifted     = gratitude + no manage-subscription CTA
//   supporter  = "thanks for backing" — badge only, no paywalls moved
//   premium    = full feature acknowledgment
//
// Exports (window): WelcomeEmail({ tier, seat }), WELCOME_COPY, welcomePlain

const { ME, EmShell, EmPreheader, EmHeader, EmLede, EmButton, EmDivider,
        EmTierBadge, EmFeatureList, EmPricePromise, EmSeatStamp, EmFooter,
        EmMonoEyebrow, EmCallout } = window;

const WE_FONT = "Inter, -apple-system, 'Segoe UI', Arial, sans-serif";
const WE_MONO = "'JetBrains Mono', 'SFMono-Regular', Menlo, monospace";

const PREMIUM_FEATURES = [
  "Concert history — every show you attend, logged",
  "Calendar export — Apple + Google, one tap",
  "Follow artists + new-show alerts",
  "Price-drop alerts + Spotify sync",
  { text: "More coming — you're early", future: true },
];

// Subject / preheader lock (Sour Patch; carries the "You're in —" shape) ──
const WELCOME_COPY = {
  premium: {
    subject: "You're in — Premium is live on your account.",
    preheader: "Everything Premium, switched on. Here's what you just unlocked.",
  },
  supporter: {
    subject: "You're in — and you're keeping the lights on.",
    preheader: "Your badge is live. No paywalls moved — that's the point.",
  },
  founder: {
    subject: "You're Founder #37. Locked in at $3, forever.",
    preheader: "First 100 only. $3/mo never goes up. Here's your seat.",
  },
  gifted: {
    subject: "You're in — Premium's on us.",
    preheader: "Lifetime Premium, no card, nothing to manage. Just enjoy it.",
  },
};

function WelcomeEmail({ tier = "premium", seat = 37 }) {
  const copy = WELCOME_COPY[tier];

  // ── GIFTED — distinct template ─────────────────────────────
  if (tier === "gifted") {
    return (
      <EmShell>
        <EmPreheader>{copy.preheader}</EmPreheader>
        <EmHeader eyebrow="Lifetime Premium · Beta" />
        <EmLede
          eyebrow="On us"
          title="You're already in."
          sub="Lifetime Premium — on us. No tier to pick, no card to add, nothing to manage. You showed up early; that's the whole price."
        />
        <tr><td style={{ padding: "8px 26px 0" }}>
          <div style={{ fontFamily: WE_MONO, fontStyle: "italic", fontSize: 12.5, color: ME.accent, letterSpacing: "0.02em" }}>—— Seriously. We owe you one.</div>
        </td></tr>
        <tr><td style={{ padding: "18px 26px 4px" }}>
          <div style={{ marginBottom: 14 }}><EmTierBadge tier="gifted" beta /></div>
          <EmCallout accent={ME.signal}>
            <EmMonoEyebrow color={ME.signal} style={{ marginBottom: 12 }}>Everything Premium, switched on</EmMonoEyebrow>
            <EmFeatureList items={PREMIUM_FEATURES.slice(0, 4)} accent={ME.signal} />
          </EmCallout>
        </td></tr>
        {/* discovery affordance — never billing */}
        <tr><td style={{ padding: "18px 26px 6px" }}>
          <EmButton tone="ghost">See everything you've got →</EmButton>
        </td></tr>
        <tr><td style={{ padding: "4px 26px 6px", textAlign: "center" }}>
          <EmMonoEyebrow color={ME.subtle} size={9}>No card on file · nothing to cancel · just enjoy it</EmMonoEyebrow>
        </td></tr>
        {/* no manage-subscription link — they're comped */}
        <EmFooter family="product" showManage={false} />
      </EmShell>
    );
  }

  // ── PAID — premium / supporter / founder ───────────────────
  const accent = tier === "supporter" ? ME.accent : ME.signal;
  const isFounder = tier === "founder";
  const isSupporter = tier === "supporter";

  const lede = {
    premium: {
      eyebrow: "Welcome · Premium",
      title: "You're in. Premium's switched on.",
      sub: "Everything that actually costs us money to run is now yours. No trial asterisks, no upsell wall. Go use it.",
    },
    supporter: {
      eyebrow: "Welcome · Supporter",
      title: "You didn't have to. Thanks for backing us.",
      sub: "Supporter doesn't unlock anything new — that's the whole point. You're chipping in so the app stays free for everyone. The glow is real.",
    },
    founder: {
      eyebrow: "Welcome · Founder",
      title: `You're Founder #${seat}.`,
      sub: "One of the first hundred people to back Concert Crawl. Your price is locked at $3 a month, and it never moves — no matter what anyone pays later.",
    },
  }[tier];

  return (
    <EmShell>
      <EmPreheader>{copy.preheader}</EmPreheader>
      <EmHeader eyebrow={`Welcome · ${tier}`} />
      <EmLede eyebrow={lede.eyebrow} title={lede.title} sub={lede.sub} titleSize={isFounder ? 27 : 26} />

      <tr><td style={{ padding: "16px 26px 0" }}>
        <EmTierBadge tier={tier} />
      </td></tr>

      {isFounder && (
        <tr><td style={{ padding: "14px 26px 0" }}>
          <EmSeatStamp seat={seat} />
        </td></tr>
      )}

      {/* what you get */}
      {isSupporter ? (
        <tr><td style={{ padding: "18px 26px 0" }}>
          <EmMonoEyebrow color={ME.subtle} style={{ marginBottom: 12 }}>What backing gets you</EmMonoEyebrow>
          <EmFeatureList items={[
            "A Supporter badge on your profile",
            "The warm, smug glow of keeping us alive",
          ]} accent={accent} />
          <div style={{ marginTop: 12, fontFamily: WE_MONO, fontSize: 9.5, color: ME.subtle, letterSpacing: "0.08em", textTransform: "uppercase" }}>No Premium unlocks — that's the point.</div>
        </td></tr>
      ) : (
        <tr><td style={{ padding: "18px 26px 0" }}>
          <EmMonoEyebrow color={ME.subtle} style={{ marginBottom: 12 }}>{isFounder ? "Everything Premium — yours" : "Switched on now"}</EmMonoEyebrow>
          <EmFeatureList items={isFounder ? [...PREMIUM_FEATURES.slice(0, 4), "Founder badge — first 100 only"] : PREMIUM_FEATURES} accent={accent} />
        </td></tr>
      )}

      {/* price promise */}
      <tr><td style={{ padding: "18px 26px 0" }}>
        <EmPricePromise tier={tier} />
      </td></tr>

      {/* CTA */}
      <tr><td style={{ padding: "20px 26px 8px" }}>
        <EmButton tone={isSupporter ? "accent" : "signal"}>{isSupporter ? "Wear it on your profile" : "Open Concert Crawl"}</EmButton>
      </td></tr>

      <EmFooter family="billing" showManage />
    </EmShell>
  );
}

// ── Plain-text fallbacks ─────────────────────────────────────
function welcomePlain(tier = "premium", seat = 37) {
  const feats = PREMIUM_FEATURES.slice(0, 4).map(f => `  - ${typeof f === "string" ? f : f.text}`).join("\n");
  if (tier === "gifted") {
    return `CONCERT CRAWL — You're already in.
========================================

Lifetime Premium — on us. No tier to pick,
no card to add, nothing to manage. You showed
up early; that's the whole price.

  —— Seriously. We owe you one.

EVERYTHING PREMIUM, SWITCHED ON
${feats}

See everything you've got:
  https://concertcrawl.app/account

No card on file. Nothing to cancel. Just enjoy it.

----------------------------------------
Turn off product emails:  {link}
All email settings:       {link}
Concert Crawl · Denver, CO`;
  }
  if (tier === "supporter") {
    return `CONCERT CRAWL — Thanks for backing us.
========================================

Supporter doesn't unlock anything new — that's
the whole point. You're chipping in so the app
stays free for everyone.

WHAT BACKING GETS YOU
  - A Supporter badge on your profile
  - The warm, smug glow of keeping us alive
  (No Premium unlocks — that's the point.)

Whatever you pay, you pay. We never raise it.

Wear it on your profile:
  https://concertcrawl.app/profile

----------------------------------------
Turn off billing emails:  {link}
All email settings:       {link}
Manage subscription:      {link}
Concert Crawl · Denver, CO`;
  }
  if (tier === "founder") {
    return `CONCERT CRAWL — You're Founder #${seat}.
========================================

One of the first hundred to back Concert Crawl.
Your price is locked at $3 a month, and it never
moves — no matter what anyone pays later.

  FOUNDER #${seat} OF 100 · $3/MO, LOCKED FOREVER

EVERYTHING PREMIUM, YOURS
${feats}
  - Founder badge — first 100 only

$3 is $3. New folks may pay double someday — never you.

Open Concert Crawl:
  https://concertcrawl.app

----------------------------------------
Turn off billing emails:  {link}
All email settings:       {link}
Manage subscription:      {link}
Concert Crawl · Denver, CO`;
  }
  // premium
  return `CONCERT CRAWL — You're in. Premium's on.
========================================

Everything that actually costs us money to run
is now yours. No trial asterisks, no upsell wall.
Go use it.

SWITCHED ON NOW
${feats}
  ★ More coming — you're early

Whatever you pay, you pay. We never raise it.

Open Concert Crawl:
  https://concertcrawl.app

----------------------------------------
Turn off billing emails:  {link}
All email settings:       {link}
Manage subscription:      {link}
Concert Crawl · Denver, CO`;
}

Object.assign(window, { WelcomeEmail, WELCOME_COPY, welcomePlain, PREMIUM_FEATURES });

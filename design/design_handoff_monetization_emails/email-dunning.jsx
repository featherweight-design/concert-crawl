// email-dunning.jsx — #783 · payment-failed dunning (3 emails over ~7 days)
// De-blamed gentle ramp (locked #782 + brief):
//   step 1 = "give it a refresh?"      — breezy, no drama
//   step 2 = "we're still trying"      — patient, still on
//   step 3 = "pauses tomorrow …"       — clear stakes, still no blame
// HARD RULES: no shame, no false urgency ("last chance!"), never the word
// "fraud". Amber = calm attention, never alarm red. CTA stays the branded
// signal cyan (primary action color); amber only tints the status/callout.
//
// Exports (window): DunningEmail({ step }), DUNNING_COPY, dunningPlain

const { ME, EmShell, EmPreheader, EmHeader, EmLede, EmButton,
        EmCallout, EmFooter, EmMonoEyebrow } = window;

const DN_FONT = "Inter, -apple-system, 'Segoe UI', Arial, sans-serif";
const DN_MONO = "'JetBrains Mono', 'SFMono-Regular', Menlo, monospace";

const DUNNING_COPY = {
  1: {
    subject: "Your card bounced — mind giving it a refresh?",
    preheader: "No drama. Takes about 30 seconds. We'll retry automatically.",
    eyebrow: "Billing · heads up",
    title: "Your card didn't go through.",
    sub: "Happens all the time — expired card, bank playing it safe, whatever it is. Give it a refresh and you're set. We'll keep trying in the background either way.",
    reassure: "Nothing's changed yet · Premium's still on",
  },
  2: {
    subject: "Still no luck with your card.",
    preheader: "We're retrying automatically. A fresh one skips the wait.",
    eyebrow: "Billing · still trying",
    title: "We're still trying that card.",
    sub: "A few automatic retries haven't landed yet. Dropping in a fresh card takes about 30 seconds and skips the rest of the waiting. Premium stays on in the meantime.",
    reassure: "Still on · we'll keep retrying for a few more days",
  },
  3: {
    subject: "Heads up: Premium pauses tomorrow.",
    preheader: "One more try left. A fresh card keeps everything on.",
    eyebrow: "Billing · last try",
    title: "Premium pauses tomorrow.",
    sub: "We couldn't get that card through after a week of trying. There's one more attempt tomorrow — if it doesn't land, Premium pauses and you drop back to Free.",
    reassure: "Nothing gets deleted · a fresh card brings it all back",
  },
};

function DunningEmail({ step = 1 }) {
  const copy = DUNNING_COPY[step];
  const isFinal = step === 3;
  const accent = isFinal ? ME.amber : ME.signal;

  return (
    <EmShell>
      <EmPreheader>{copy.preheader}</EmPreheader>
      <EmHeader eyebrow={isFinal ? "Billing · last try" : "Billing"} />

      {/* status eyebrow tints amber on the final notice */}
      <tr><td style={{ padding: "24px 26px 0" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: 7, background: accent, display: "inline-block" }} />
          <EmMonoEyebrow color={accent}>{copy.eyebrow}</EmMonoEyebrow>
        </div>
      </td></tr>

      <EmLede title={copy.title} sub={copy.sub} titleSize={26} />

      {/* step tracker — where we are in the retry window */}
      <tr><td style={{ padding: "18px 26px 0" }}>
        <table role="presentation" width="100%" cellPadding="0" cellSpacing="0"><tbody><tr>
          {[1, 2, 3].map((n) => (
            <td key={n} style={{ padding: "0 4px 0 0", width: "33.33%" }}>
              <div style={{ height: 4, borderRadius: 4, background: n <= step ? (n === 3 && step === 3 ? ME.amber : ME.signal) : ME.border }} />
              <div style={{ fontFamily: DN_MONO, fontSize: 8.5, letterSpacing: "0.1em", textTransform: "uppercase", color: n === step ? ME.muted : ME.subtle, marginTop: 6 }}>
                {["Notice", "Retrying", "Last try"][n - 1]}
              </div>
            </td>
          ))}
        </tr></tbody></table>
      </td></tr>

      {/* final notice — what "pausing" actually means (de-blamed, no data-loss fear) */}
      {isFinal && (
        <tr><td style={{ padding: "18px 26px 0" }}>
          <EmCallout accent={ME.amber} soft={ME.amberSoft}>
            <EmMonoEyebrow color={ME.amber} style={{ marginBottom: 9 }}>If it pauses</EmMonoEyebrow>
            <div style={{ fontFamily: DN_FONT, fontSize: 13, color: ME.fg, lineHeight: 1.55 }}>
              Your account and saved shows stay put. History, alerts, and calendar export just go quiet until a payment goes through. Nothing gets deleted — a fresh card switches all of it back on.
            </div>
          </EmCallout>
        </td></tr>
      )}

      {/* CTA — always the branded signal, even on the final notice */}
      <tr><td style={{ padding: "20px 26px 8px" }}>
        <EmButton tone="signal">Update payment method</EmButton>
      </td></tr>

      <tr><td style={{ padding: "2px 26px 6px", textAlign: "center" }}>
        <EmMonoEyebrow color={ME.subtle} size={9}>{copy.reassure}</EmMonoEyebrow>
      </td></tr>

      <EmFooter family="billing" showManage note="Already fixed it? Ignore this — the next retry will pick it up automatically." />
    </EmShell>
  );
}

// ── Plain-text fallbacks ─────────────────────────────────────
function dunningPlain(step = 1) {
  const copy = DUNNING_COPY[step];
  const finalBlock = step === 3
    ? `\nIF IT PAUSES
Your account and saved shows stay put. History,
alerts, and calendar export go quiet until a
payment goes through. Nothing gets deleted — a
fresh card switches all of it back on.\n`
    : "";
  return `CONCERT CRAWL — ${copy.eyebrow.replace("Billing · ", "").replace(/^\w/, c => c.toUpperCase())}
========================================

${copy.title}
${copy.sub}
${finalBlock}
Update payment method:
  https://concertcrawl.app/account/billing

${copy.reassure}

Already fixed it? Ignore this — the next retry
picks it up automatically.

----------------------------------------
Turn off billing emails:  {link}
All email settings:       {link}
Manage subscription:      {link}
Concert Crawl · Denver, CO`;
}

Object.assign(window, { DunningEmail, DUNNING_COPY, dunningPlain });

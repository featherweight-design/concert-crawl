// email-receipts.jsx — #783 · renewal receipts (monthly + annual)
// Skews slightly more formal than welcome/win-back (tax-record use), but still
// Sour Patch in the headline. Lean+ field set (Hugh, 2026-07-15):
//   {amount} {charge_date} {tier_name} {customer_id} {stripe_receipt_url}
//   + {period_end} surfaced as "Next renewal" + card last-4.
//   NO invoice # / tax line — over-engineered for this product.
// Improvement over prod: the generic green headline is gone; the confirmed
// amount uses the branded signal cyan, and the subject leads with the OUTCOME
// ("Premium's paid up") not the object ("Your monthly receipt").
//
// Exports (window): ReceiptEmail({ period, tier, seat }), RECEIPT_COPY, receiptPlain

const { ME, EmShell, EmPreheader, EmHeader, EmLede, EmButton, EmDivider,
        EmTierBadge, EmDataTable, EmPricePromise, EmFooter, EmMonoEyebrow } = window;

const RC_FONT = "Inter, -apple-system, 'Segoe UI', Arial, sans-serif";
const RC_MONO = "'JetBrains Mono', 'SFMono-Regular', Menlo, monospace";

const RECEIPT_COPY = {
  monthly: {
    subject: "Premium's paid up for July.",
    preheader: "$5.00 on Jul 15. Next renewal Aug 15. Receipt inside.",
  },
  annual: {
    subject: "Another year of Premium — receipt inside.",
    preheader: "$50.00 on Jul 15. Renews Jul 15, 2027. Two months on the house.",
  },
  founder: {
    subject: "Founder's paid up — $3, same as always.",
    preheader: "$3.00 on Jul 15. Next renewal Aug 15. Locked forever.",
  },
};

function ReceiptEmail({ period = "monthly", tier = "premium", seat = 37 }) {
  const annual = period === "annual";
  const isFounder = tier === "founder";
  const copy =
    isFounder && !annual ? RECEIPT_COPY.founder : RECEIPT_COPY[period];

  const amount = annual ? "$50.00" : (isFounder ? "$3.00" : "$5.00");
  const planName = { premium: "Premium", founder: "Founder", supporter: "Supporter" }[tier] || "Premium";
  const cycle = annual ? "Annual" : "Monthly";

  const rows = [
    { label: "Plan", value: `${planName} · ${cycle.toLowerCase()}`, mono: false, strong: true },
    { label: "Amount", value: amount, color: ME.signal, strong: true },
    { label: "Charged", value: "Jul 15, 2026" },
    { label: "Billing period", value: annual ? "Jul 15, 2026 – Jul 15, 2027" : "Jul 15 – Aug 15, 2026" },
    { label: "Next renewal", value: annual ? "Jul 15, 2027" : "Aug 15, 2026" },
    { label: "Payment", value: "Visa ·· 4242" },
    { label: "Customer ID", value: "cus_Qk28fLp0" },
    { label: "Receipt", value: "View on Stripe →", link: true },
  ];

  const title = annual
    ? "Another year of Premium. Locked in."
    : (isFounder ? "Founder's paid up. Same $3." : "Premium's paid up.");
  const sub = annual
    ? "Your annual plan renewed. Keep this for your records — it's your receipt for the next twelve months."
    : "Your subscription renewed on schedule. Keep this one for your records.";

  return (
    <EmShell>
      <EmPreheader>{copy.preheader}</EmPreheader>
      <EmHeader eyebrow="Receipt" />
      <EmLede eyebrow="Payment received" title={title} sub={sub} titleSize={25} />

      {/* Amount hero — branded signal, not the old generic green */}
      <tr><td style={{ padding: "20px 26px 4px" }}>
        <table role="presentation" width="100%" cellPadding="0" cellSpacing="0"><tbody><tr>
          <td style={{ verticalAlign: "middle" }}>
            <div style={{ fontFamily: RC_FONT, fontWeight: 900, fontSize: 44, lineHeight: 1, color: ME.signal, letterSpacing: "-0.045em" }}>{amount}</div>
            <div style={{ fontFamily: RC_MONO, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: ME.subtle, marginTop: 8 }}>Paid · Jul 15, 2026 · {cycle}</div>
          </td>
          <td style={{ textAlign: "right", verticalAlign: "top" }}>
            <EmTierBadge tier={tier} />
          </td>
        </tr></tbody></table>
      </td></tr>

      {/* Founder price-promise — subtle, footer-adjacent, reinforces monthly */}
      {isFounder && (
        <tr><td style={{ padding: "10px 26px 0" }}>
          <EmPricePromise tier="founder" subtle />
        </td></tr>
      )}

      {/* Data block */}
      <tr><td style={{ padding: "18px 26px 0" }}>
        <EmDataTable rows={rows} />
      </td></tr>

      {annual && (
        <tr><td style={{ padding: "12px 26px 0" }}>
          <div style={{ fontFamily: RC_MONO, fontSize: 10, color: ME.subtle, letterSpacing: "0.04em", lineHeight: 1.5 }}>Annual runs $50 — two months on the house versus paying monthly.</div>
        </td></tr>
      )}

      {/* CTA */}
      <tr><td style={{ padding: "20px 26px 8px" }}>
        <EmButton tone="ghost">View full receipt on Stripe →</EmButton>
      </td></tr>

      <EmFooter family="billing" showManage note="Questions about a charge? Reply to this email — a human reads it." />
    </EmShell>
  );
}

// ── Plain-text fallbacks ─────────────────────────────────────
function receiptPlain(period = "monthly", tier = "premium") {
  const annual = period === "annual";
  const isFounder = tier === "founder";
  const amount = annual ? "$50.00" : (isFounder ? "$3.00" : "$5.00");
  const planName = { premium: "Premium", founder: "Founder", supporter: "Supporter" }[tier] || "Premium";
  const cycle = annual ? "annual" : "monthly";
  const founderLine = isFounder ? "\n$3 is $3. New folks may pay double someday — never you.\n" : "";
  return `CONCERT CRAWL — Receipt
========================================

${annual ? "Another year of Premium. Locked in." : "Premium's paid up."}
Your subscription renewed on schedule. Keep
this one for your records.

  AMOUNT        ${amount}   (paid Jul 15, 2026)
${founderLine}
  Plan          ${planName} · ${cycle}
  Charged       Jul 15, 2026
  Billing       ${annual ? "Jul 15, 2026 – Jul 15, 2027" : "Jul 15 – Aug 15, 2026"}
  Next renewal  ${annual ? "Jul 15, 2027" : "Aug 15, 2026"}
  Payment       Visa ·· 4242
  Customer ID   cus_Qk28fLp0

View full receipt on Stripe:
  {stripe_receipt_url}

Questions about a charge? Reply to this email —
a human reads it.

----------------------------------------
Turn off billing emails:  {link}
All email settings:       {link}
Manage subscription:      {link}
Concert Crawl · Denver, CO`;
}

Object.assign(window, { ReceiptEmail, RECEIPT_COPY, receiptPlain });

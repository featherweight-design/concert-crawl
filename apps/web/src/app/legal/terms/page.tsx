import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — Concert Crawl',
  robots: { index: false },
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="mb-3 text-base font-bold text-fg">{title}</h2>
      <div className="space-y-3 text-fg-muted">{children}</div>
    </section>
  )
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
        >
          <span aria-hidden>←</span>
          <span>Concert Crawl</span>
        </Link>

        <h1 className="mb-2 text-2xl font-extrabold tracking-tight text-fg">
          Terms of Service
        </h1>
        <p className="mb-2 text-sm text-fg-muted">
          Last updated: [date — fill before launch]
        </p>
        <p className="mb-10 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          These terms are a pre-launch stub and have not been reviewed by legal
          counsel. Do not rely on them as a final document.
        </p>

        <div className="space-y-8 text-[15px] leading-relaxed">
          <Section title="1. Acceptance">
            <p>
              By creating an account or using Concert Crawl (&ldquo;the
              Service&rdquo;), you agree to these Terms of Service. If you
              don&apos;t agree, don&apos;t use the Service.
            </p>
            <p>
              We may update these terms. When we do, we&apos;ll notify you by
              email and update the &ldquo;Last updated&rdquo; date above.
              Continued use after notice constitutes acceptance.
            </p>
          </Section>

          <Section title="2. The Service">
            <p>
              Concert Crawl aggregates live music event information from Denver
              venue websites and third-party ticketing platforms. We do not sell
              tickets. All ticket links redirect to the venue or an official
              ticketing partner.
            </p>
            <p>
              Event data is sourced by automated crawlers and user
              contributions. We make reasonable efforts to keep it accurate, but
              we make no guarantees. Always verify show details directly with
              the venue before purchasing tickets.
            </p>
          </Section>

          <Section title="3. Accounts">
            <p>
              You must create an account to save shows, submit prices, or use
              social features. You are responsible for maintaining the security
              of your account and all activity that occurs under it.
            </p>
            <p>
              You must be at least 13 years old to use the Service. Accounts are
              personal and may not be transferred.
            </p>
          </Section>

          <Section title="4. User content">
            <p>
              You may submit price information and feedback through the Service.
              By submitting content, you grant Concert Crawl a non-exclusive,
              worldwide, royalty-free license to use, display, and distribute
              that content in connection with operating the Service.
            </p>
            <p>
              You agree not to submit false, misleading, or malicious content.
              We may remove any content at our discretion.
            </p>
          </Section>

          <Section title="5. Prohibited conduct">
            <p>You agree not to:</p>
            <ul className="space-y-1.5 pl-4">
              {[
                'Scrape, crawl, or automate requests to the Service without written permission',
                'Attempt to reverse-engineer, decompile, or extract our source code',
                'Use the Service to send spam or harass other users',
                'Circumvent invite codes, rate limits, or access controls',
                'Impersonate another person or misrepresent your identity',
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-px shrink-0 text-accent">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="6. Intellectual property">
            <p>
              The Concert Crawl name, logo, and design are owned by Concert
              Crawl. Event data sourced from venues remains the property of
              those venues. Generative artwork displayed on the Service is
              produced by our systems and is owned by Concert Crawl.
            </p>
          </Section>

          <Section title="7. Subscriptions and payments">
            <p>
              Paid tiers are billed monthly through Stripe, our payment
              processor. We never see or store your card details. Subscriptions
              auto-renew each month until cancelled.
            </p>
            <p>
              You can cancel anytime from your settings page. Cancelling stops
              future charges; your paid features keep working until the end of
              the period you already paid for.
            </p>
            <p>
              The price you subscribe at is the price you keep. If we raise
              prices for new subscribers, your existing subscription is not
              affected.
            </p>
            <div id="refunds" className="scroll-mt-8">
              <h3 className="mb-2 pt-2 text-[15px] font-bold text-fg">
                Refunds
              </h3>
              <p>
                Monthly charges are generally not refunded when you cancel — you
                keep access through the end of the billing period instead. If
                something went wrong (a duplicate charge, a billing bug, a
                charge you didn&apos;t expect), email us at{' '}
                <a
                  href="mailto:hugh@featherweight.design"
                  className="text-fg-muted underline underline-offset-4 transition-colors hover:text-fg"
                >
                  hugh@featherweight.design
                </a>{' '}
                and we&apos;ll make it right. Nothing here limits any refund
                rights you have under applicable law.
              </p>
            </div>
          </Section>

          <Section title="8. Disclaimers">
            <p>
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as
              available.&rdquo; We make no warranties, express or implied,
              including but not limited to merchantability, fitness for a
              particular purpose, or accuracy of event information.
            </p>
          </Section>

          <Section title="9. Limitation of liability">
            <p>
              To the fullest extent permitted by law, Concert Crawl is not
              liable for any indirect, incidental, or consequential damages
              arising from your use of the Service, including missed shows,
              purchased tickets for cancelled events, or data loss.
            </p>
          </Section>

          <Section title="10. Termination">
            <p>
              We may suspend or terminate your account at any time for violation
              of these terms. You may delete your account at any time from your
              settings page.
            </p>
          </Section>

          <Section title="11. Governing law">
            <p>
              These terms are governed by the laws of the State of Colorado,
              without regard to conflict of law principles.
            </p>
          </Section>

          <Section title="12. Contact">
            <p>
              Questions about these terms:{' '}
              <a
                href="mailto:hugh@featherweight.design"
                className="text-fg-muted underline underline-offset-4 transition-colors hover:text-fg"
              >
                hugh@featherweight.design
              </a>
            </p>
          </Section>

          <div className="border-t border-border pt-6">
            <Link
              href="/legal/privacy"
              className="text-sm text-fg-muted underline underline-offset-4 transition-colors hover:text-fg"
            >
              Privacy Policy →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

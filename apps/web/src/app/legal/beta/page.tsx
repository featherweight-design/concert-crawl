import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Private Beta — Concert Crawl',
  robots: { index: false },
}

export default function BetaAgreementPage() {
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
          Private Beta Agreement
        </h1>
        <p className="mb-10 text-sm text-fg-muted">
          Effective date: May 25, 2026
        </p>

        <div className="space-y-8 text-[15px] leading-relaxed text-fg-muted">
          <section>
            <h2 className="mb-3 text-base font-bold text-fg">
              You&apos;re in the inner circle
            </h2>
            <p>
              Concert Crawl is in private beta. That means you&apos;re one of a
              small group of people with early access — and we&apos;re trusting
              you to keep it that way.
            </p>
            <p className="mt-3">
              Please don&apos;t share your invite code, post screenshots publicly,
              or write about the product in a way that could spread access beyond
              the people we&apos;ve invited. We want to get things right before
              opening up.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-fg">
              What to expect
            </h2>
            <ul className="space-y-2">
              <li className="flex gap-2">
                <span className="mt-px shrink-0 text-accent">—</span>
                <span>
                  Things will break. Data may disappear. Features will change.
                  That&apos;s normal for a beta — your feedback is what fixes it.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-px shrink-0 text-accent">—</span>
                <span>
                  Concert data is sourced by automated crawlers. It&apos;s pretty
                  good, but always verify show details directly with the venue
                  before buying tickets.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-px shrink-0 text-accent">—</span>
                <span>
                  We don&apos;t sell tickets. Every &ldquo;get tickets&rdquo; link goes to
                  the venue or an official ticketing partner.
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-fg">Your data</h2>
            <p>
              We collect only what we need to run the product: your email
              address, the shows you save, and the price information you
              optionally contribute. We don&apos;t sell your data or use it for
              advertising.
            </p>
            <p className="mt-3">
              During the beta period, your saved shows and profile may be reset
              as we migrate the database schema. We&apos;ll give advance notice
              if that&apos;s coming.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-fg">
              Price information
            </h2>
            <p>
              Ticket prices shown on Concert Crawl are sourced from venue sites,
              ticketing platforms, and community submissions from beta users.
              They&apos;re our best estimate — not a guarantee. Prices change,
              and we may be behind.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-fg">Feedback</h2>
            <p>
              Use the in-app feedback button. We read every submission. This is
              the fastest way to get something fixed or built.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-fg">
              Beta ends, full terms begin
            </h2>
            <p>
              When Concert Crawl opens to the public, a full Terms of Service and
              Privacy Policy will replace this document. We&apos;ll notify you before
              that happens and give you a chance to review before anything changes.
            </p>
          </section>

          <section className="border-t border-border pt-8">
            <p className="text-sm text-fg-subtle">
              Questions?{' '}
              <a
                href="mailto:hugh@featherweight.design"
                className="text-fg-muted underline underline-offset-4 transition-colors hover:text-fg"
              >
                Email Hugh directly.
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

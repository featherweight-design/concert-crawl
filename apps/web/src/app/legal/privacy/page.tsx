import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — Concert Crawl',
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

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="mb-2 text-sm text-fg-muted">
          Last updated: [date — fill before launch]
        </p>
        <p className="mb-10 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          This policy is a pre-launch stub and has not been reviewed by legal
          counsel. Do not rely on it as a final document.
        </p>

        <div className="space-y-8 text-[15px] leading-relaxed">
          <Section title="What we collect">
            <p>We collect only what&apos;s necessary to run the Service:</p>
            <ul className="space-y-1.5 pl-4">
              {[
                'Email address — for account creation and transactional emails (via Clerk)',
                'Shows you watch — to power your Watching list',
                'Price information you submit — used to improve data quality for everyone',
                'Feedback you send — stored to help us prioritize improvements',
                'Your username and avatar — shown on your profile',
                'Theme preference — stored in localStorage on your device',
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-px shrink-0 text-accent">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="What we don't do">
            <p>We do not sell your data. We do not use it for advertising.</p>
            <p>
              We do not build behavioral profiles. We do not share your personal
              information with third parties except the service providers listed
              below, who are necessary to operate the product.
            </p>
          </Section>

          <Section title="Service providers">
            <p>
              We use the following third-party services to operate Concert
              Crawl:
            </p>
            <ul className="space-y-1.5 pl-4">
              {[
                'Clerk — authentication and account management',
                'Render — cloud hosting and compute',
                'Sentry — error tracking (diagnostic data such as stack traces; not explicitly configured for PII minimization)',
                'Resend — transactional email delivery',
                'Stripe — payment processing (when subscriptions go live)',
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-px shrink-0 text-accent">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p>
              Each provider handles your data under their own privacy policies.
              We select providers that meet reasonable data protection
              standards.
            </p>
          </Section>

          <Section title="Cookies and local storage">
            <p>
              We store your theme preference in your browser&apos;s
              localStorage. We use session cookies set by Clerk for
              authentication. During the private beta, we also set a short-lived
              cookie (
              <code className="rounded bg-surface-2 px-1 font-mono text-xs">
                invite_verified
              </code>
              ) after a valid invite code is entered — it expires after 1 hour
              and is used only to allow access to the sign-up flow. We
              don&apos;t use tracking cookies or third-party analytics scripts.
            </p>
          </Section>

          <Section title="Data retention">
            <p>
              Your account data is kept for as long as your account is active.
              When you delete your account, your profile and the shows
              you&apos;re watching are deleted immediately. Price submissions
              you&apos;ve made are anonymized (your user ID is removed) rather
              than deleted, to preserve corroboration data for other users.
            </p>
          </Section>

          <Section title="Your rights">
            <p>You can:</p>
            <ul className="space-y-1.5 pl-4">
              {[
                'Edit your profile at any time from Settings',
                'Delete your account from the Settings page',
                'Request a copy of your data by emailing us',
                'We currently only send transactional emails (e.g., account-related notices). No marketing emails.',
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-px shrink-0 text-accent">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Children">
            <p>
              Concert Crawl is not directed at children under 13. We do not
              knowingly collect information from anyone under 13.
            </p>
          </Section>

          <Section title="Changes to this policy">
            <p>
              When we make material changes to this policy, we&apos;ll notify
              you by email and update the &ldquo;Last updated&rdquo; date above.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Privacy questions:{' '}
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
              href="/legal/terms"
              className="text-sm text-fg-muted underline underline-offset-4 transition-colors hover:text-fg"
            >
              Terms of Service →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

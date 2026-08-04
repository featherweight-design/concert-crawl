import type { Metadata } from 'next'
import Link from 'next/link'

import { LEGAL_COPY } from '../definitions/copy'

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
  const copy = LEGAL_COPY.privacy

  return (
    <div className="min-h-screen bg-bg text-fg">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
        >
          <span aria-hidden>←</span>
          <span>{LEGAL_COPY.shared.backLink}</span>
        </Link>

        <h1 className="mb-2 text-2xl font-extrabold tracking-tight text-fg">
          {copy.heading}
        </h1>
        <p className="mb-10 text-sm text-fg-muted">
          {LEGAL_COPY.shared.effectiveDate}
        </p>

        <div className="space-y-8 text-[15px] leading-relaxed">
          <Section title={copy.collect.title}>
            <p>{copy.collect.intro}</p>
            <ul className="space-y-1.5 pl-4">
              {copy.collect.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="mt-px shrink-0 text-accent">
                    {LEGAL_COPY.shared.bulletGlyph}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title={copy.dontDo.title}>
            <p>{copy.dontDo.body1}</p>
            <p>{copy.dontDo.body2}</p>
          </Section>

          <Section title={copy.providers.title}>
            <p>{copy.providers.intro}</p>
            <ul className="space-y-1.5 pl-4">
              {copy.providers.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="mt-px shrink-0 text-accent">
                    {LEGAL_COPY.shared.bulletGlyph}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p>{copy.providers.outro}</p>
          </Section>

          <Section title={copy.cookies.title}>
            <p>
              {copy.cookies.bodyPrefix}
              <code className="rounded bg-surface-2 px-1 font-mono text-xs">
                {copy.cookies.cookieName}
              </code>
              {copy.cookies.bodySuffix}
            </p>
          </Section>

          <Section title={copy.retention.title}>
            <p>{copy.retention.body}</p>
          </Section>

          <Section title={copy.rights.title}>
            <p>{copy.rights.intro}</p>
            <ul className="space-y-1.5 pl-4">
              {copy.rights.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="mt-px shrink-0 text-accent">
                    {LEGAL_COPY.shared.bulletGlyph}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title={copy.children.title}>
            <p>{copy.children.body}</p>
          </Section>

          <Section title={copy.changes.title}>
            <p>{copy.changes.body}</p>
          </Section>

          <Section title={copy.contact.title}>
            <p>
              {copy.contact.intro}{' '}
              <a
                href={`mailto:${LEGAL_COPY.shared.supportEmail}`}
                className="text-fg-muted underline underline-offset-4 transition-colors hover:text-fg"
              >
                {LEGAL_COPY.shared.supportEmail}
              </a>
            </p>
          </Section>

          <div className="border-t border-border pt-6">
            <Link
              href="/legal/terms"
              className="text-sm text-fg-muted underline underline-offset-4 transition-colors hover:text-fg"
            >
              {LEGAL_COPY.shared.termsLink}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

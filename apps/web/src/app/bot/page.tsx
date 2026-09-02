import type { Metadata } from 'next'
import Link from 'next/link'

import { CCMark } from '@/components/brand/cc-mark'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

import { CopyBlock } from './CopyBlock'
import { BOT_COPY, BOT_ROBOTS, BOT_UA } from './definitions/copy'
import { LIGHT_THEME_STYLE } from './definitions/light-theme-style'

/**
 * Deliberately no `robots: { index: false }`. The three /legal pages each set it
 * and nothing here inherits from them, so copying that shell would hide the one
 * page whose entire job is being findable: it is the URL our own user agent
 * advertises on every request, and an operator searching for "ConcertCrawl" has
 * to land on it.
 */
export const metadata: Metadata = {
  title: 'Our crawler — Concert Crawl',
  description:
    'What ConcertCrawl/1.0 reads, how often, and how to make it stop.',
}

const brand = CONSUMER_COPY.appHeader.brand

function MonoTag({
  children,
  className = 'text-fg-muted',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={`font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] ${className}`}
    >
      {children}
    </span>
  )
}

/**
 * The number is the page's spine: a reader scanning for one fact should be able
 * to say "section 3" to a colleague.
 */
function BotSectionHead({
  index,
  title,
  note,
}: {
  index: string
  title: string
  note?: string
}) {
  return (
    <div className="mb-3 flex flex-col gap-[7px]">
      <div className="flex items-center gap-[9px]">
        <MonoTag className="text-signal">{index}</MonoTag>
        <div className="h-px flex-1 bg-border" />
      </div>
      <h2 className="m-0 text-[19px] font-extrabold tracking-[-0.02em] text-fg">
        {title}
      </h2>
      {note ? (
        <p className="m-0 max-w-[62ch] text-sm leading-[1.55] text-fg-muted">
          {note}
        </p>
      ) : null}
    </div>
  )
}

function FactGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg-elevated">
      {children}
    </div>
  )
}

/**
 * A mono key beside a prose value. Two columns from 560px up and stacked below,
 * so the key never truncates and the value never wraps into a 12-character
 * column. The breakpoint is bespoke because it is a property of this row, not of
 * the app's layout scale.
 */
function FactRow({
  label,
  first,
  children,
}: {
  label: string
  first?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={`grid grid-cols-1 items-start gap-[7px] px-4 py-3.5 min-[560px]:grid-cols-[168px_1fr] min-[560px]:gap-5 min-[560px]:px-5 min-[560px]:py-4 ${
        first ? '' : 'border-t border-border'
      }`}
    >
      <div className="min-[560px]:pt-[3px]">
        <MonoTag>{label}</MonoTag>
      </div>
      <div className="min-w-0 text-[14.5px] font-medium leading-[1.6] text-fg">
        {children}
      </div>
    </div>
  )
}

/**
 * The page's one destination, bordered in --signal so it reads as the action
 * even to someone who scrolled past every fact above it.
 */
function ContactCard({
  email,
  children,
}: {
  email: string
  children: React.ReactNode
}) {
  return (
    <div
      className="flex flex-col gap-3 rounded-xl px-4 py-[18px] min-[560px]:px-6 min-[560px]:py-[22px]"
      style={{
        background: 'color-mix(in oklch, var(--signal) 7%, var(--bg-elevated))',
        border:
          '1px solid color-mix(in oklch, var(--signal) 38%, var(--border))',
      }}
    >
      <a
        href={`mailto:${email}`}
        className="break-words font-mono text-base font-bold tracking-[-0.01em] text-signal no-underline min-[560px]:text-xl"
      >
        {email}
      </a>
      <div className="text-[14.5px] font-medium leading-[1.6] text-fg">
        {children}
      </div>
    </div>
  )
}

export default function BotPage() {
  const { facts, sections, stop, footer } = BOT_COPY

  return (
    <div
      data-theme="light"
      data-testid="bot-page-root"
      style={LIGHT_THEME_STYLE}
      className="min-h-screen bg-bg text-fg"
    >
      <div className="mx-auto max-w-[720px] px-5 py-10 min-[560px]:px-10">
        <header className="mb-10 border-b border-border pb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-[9px] no-underline"
          >
            <CCMark size={24} />
            <span className="text-[17px] font-extrabold tracking-[-0.02em] text-fg">
              {brand.name}
              <span className="text-accent">{brand.accent}</span>
            </span>
          </Link>
        </header>

        <div className="mb-12 flex flex-col gap-4">
          <MonoTag className="text-signal">{BOT_COPY.eyebrow}</MonoTag>
          <h1 className="m-0 text-[32px] font-extrabold leading-[1.1] tracking-[-0.03em] text-fg">
            {BOT_COPY.h1}
          </h1>
          <p className="m-0 max-w-[62ch] text-base leading-[1.6] text-fg-muted">
            {BOT_COPY.lede}
          </p>
          <p className="m-0 max-w-[62ch] text-[14.5px] leading-[1.6] text-fg-muted">
            {BOT_COPY.who}{' '}
            <Link
              href={BOT_COPY.whoLink.href}
              className="text-signal underline"
            >
              {BOT_COPY.whoLink.label}
            </Link>
          </p>
          <p className="m-0 max-w-[62ch] text-[14.5px] font-semibold leading-[1.6] text-fg">
            {BOT_COPY.promise}
          </p>
        </div>

        <div className="flex flex-col gap-12">
          <section>
            <BotSectionHead
              index={sections.identity.index}
              title={sections.identity.title}
              note={sections.identity.note}
            />
            <div className="mb-3 flex flex-col gap-2">
              <MonoTag>{facts.ua}</MonoTag>
              <CopyBlock
                lines={[BOT_UA]}
                ariaLabel={BOT_COPY.copyButton.uaLabel}
              />
            </div>
            <FactGroup>
              <FactRow label={facts.javascript.label} first>
                {facts.javascript.value}
              </FactRow>
            </FactGroup>
          </section>

          <section>
            <BotSectionHead
              index={sections.robots.index}
              title={sections.robots.title}
              note={sections.robots.note}
            />
            <FactGroup>
              <FactRow label={facts.disallow.label} first>
                {facts.disallow.value}
              </FactRow>
              <FactRow label={facts.recheck.label}>
                {facts.recheck.value}
              </FactRow>
              <FactRow label={facts.crawlDelay.label}>
                {facts.crawlDelay.value}
              </FactRow>
            </FactGroup>
          </section>

          <section>
            <BotSectionHead
              index={sections.rate.index}
              title={sections.rate.title}
              note={sections.rate.note}
            />
            <FactGroup>
              <FactRow label={facts.rate.label} first>
                {facts.rate.value}
              </FactRow>
              <FactRow label={facts.perVenue.label}>
                {facts.perVenue.value}
              </FactRow>
              <FactRow label={facts.fullPass.label}>
                {facts.fullPass.value}
              </FactRow>
              <FactRow label={facts.triggers.label}>
                {facts.triggers.value}
              </FactRow>
            </FactGroup>
          </section>

          <section>
            <BotSectionHead
              index={sections.data.index}
              title={sections.data.title}
            />
            <FactGroup>
              <FactRow label={facts.weRead.label} first>
                {facts.weRead.value}
              </FactRow>
              <FactRow label={facts.weNever.label}>
                {facts.weNever.value}
              </FactRow>
              <FactRow label={facts.retention.label}>
                {facts.retention.value}
              </FactRow>
              <FactRow label={facts.yourPage.label}>
                <span className="block">{facts.yourPage.value}</span>
                <Link
                  href={facts.yourPage.link.href}
                  className="mt-1 block break-all font-mono text-[13px] text-signal"
                >
                  {facts.yourPage.link.label}
                </Link>
                <span className="mt-1.5 block text-[13px] text-fg-muted">
                  {facts.yourPage.note}
                </span>
              </FactRow>
            </FactGroup>
          </section>

          <section>
            <BotSectionHead
              index={sections.stop.index}
              title={sections.stop.title}
              note={sections.stop.note}
            />
            <div className="flex flex-col gap-6">
              <div>
                <h3 className="mb-2 text-[15px] font-bold text-fg">
                  {stop.robotsTitle}
                </h3>
                <CopyBlock
                  lines={[...BOT_ROBOTS]}
                  ariaLabel={BOT_COPY.copyButton.robotsLabel}
                />
                <p className="mt-2 text-[13px] leading-[1.55] text-fg-muted">
                  {stop.robotsNote}
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-[15px] font-bold text-fg">
                  {stop.orTitle}
                </h3>
                <ContactCard email={BOT_COPY.contactEmail}>
                  {stop.contactBody}
                </ContactCard>
              </div>

              <div>
                <h3 className="mb-2 text-[15px] font-bold text-fg">
                  {stop.removalTitle}
                </h3>
                <p className="max-w-[62ch] text-[14.5px] leading-[1.6] text-fg-muted">
                  {stop.removalBody}
                </p>
              </div>

              <p className="max-w-[62ch] text-[14.5px] font-medium leading-[1.6] text-fg">
                {stop.closing}
              </p>
            </div>
          </section>
        </div>

        <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
          <MonoTag>{footer.updated}</MonoTag>
          <nav className="flex flex-wrap items-center gap-5">
            {footer.links.map((link) => (
              <Link key={link.href} href={link.href} className="no-underline">
                <MonoTag>{link.label}</MonoTag>
              </Link>
            ))}
          </nav>
        </footer>
      </div>
    </div>
  )
}

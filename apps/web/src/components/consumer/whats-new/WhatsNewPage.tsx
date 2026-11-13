'use client';

// The What's new feature page (B+ B21, more-r3-whatsnew and _m): the big
// capabilities, one card each, from `FEATURE_CARDS`. The version timeline stays
// at /changelog, linked from here.

import Link from 'next/link';
import { useState } from 'react';

import { BackChip } from '@/components/consumer/back-chip/BackChip';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { FeedbackModal } from '@/components/consumer/feedback/FeedbackModal';
import type { FeatureCard } from '@/lib/definitions/releases';

import { FeatureCardArt } from './FeatureCardArt';

const COPY = CONSUMER_COPY.releaseNotes.featurePage;

/** The eyebrow colour each card's label takes, as the board tints them. */
const EYEBROW_COLOUR: Record<FeatureCard['art'], string> = {
  venues: 'var(--signal)',
  watching: 'var(--accent)',
  crews: 'var(--fg-muted)',
  passport: 'var(--warning)',
  prices: 'var(--signal)',
};

function Card({ card, first }: { card: FeatureCard; first: boolean }) {
  return (
    <article
      data-testid="feature-card"
      data-art={card.art}
      className={`overflow-hidden rounded-[22px] border border-border bg-surface-1 ${
        first ? 'lg:col-span-2' : ''
      }`}
    >
      <FeatureCardArt art={card.art} tall={first} />
      <div className="px-5 pb-5 pt-5 lg:px-6">
        <p
          className="m-0 font-mono text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ color: EYEBROW_COLOUR[card.art] }}
        >
          {card.eyebrow}
        </p>
        <h2 className="mb-1.5 mt-2 text-[22px] font-black leading-tight tracking-[-0.03em] text-fg lg:text-[26px]">
          {card.title}
        </h2>
        <p className="m-0 text-[15px] leading-relaxed text-fg-muted">
          {card.body}
        </p>
        {card.cta ? (
          <Link
            href={card.cta.href}
            className="mt-3 inline-flex items-center gap-1.5 text-[15px] font-bold text-signal"
          >
            {card.cta.label}
            <span aria-hidden>→</span>
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export function WhatsNewPage({ cards }: { cards: FeatureCard[] }) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <main className="mx-auto w-full max-w-[1000px] px-4 pb-28 pt-3 sm:px-8 sm:pt-12">
        <div className="sm:hidden">
          <BackChip inline fallbackHref="/events" />
        </div>
        <div className="mb-1.5 mt-3 flex items-center gap-2.5 sm:mt-0">
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full bg-signal"
            style={{ boxShadow: '0 0 6px var(--signal)' }}
          />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-signal">
            {COPY.eyebrow}
          </span>
        </div>
        <h1 className="mb-2 mt-1 text-[40px] font-black leading-[1.02] tracking-[-0.04em] text-fg sm:text-[52px]">
          {COPY.titleLead}
          <span
            style={{
              backgroundImage:
                'linear-gradient(90deg, var(--signal), var(--accent))',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {COPY.titleAccent}
          </span>
        </h1>
        <p className="mb-8 mt-0 text-base text-fg-muted">
          {COPY.sub}{' '}
          <span className="hidden sm:inline">
            {COPY.feedbackLead}{' '}
            <button
              type="button"
              onClick={() => setFeedbackOpen(true)}
              className="cursor-pointer border-0 bg-transparent p-0 font-bold text-accent"
            >
              {COPY.feedbackCta}
            </button>
          </span>
        </p>

        <div className="grid gap-4 lg:grid-cols-2">
          {cards.map((card, index) => (
            <Card key={card.art} card={card} first={index === 0} />
          ))}
        </div>

        <p className="mt-8 text-center">
          <Link
            href="/changelog"
            className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-fg-muted"
          >
            {COPY.changelogLink} →
          </Link>
        </p>
      </main>
      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />
    </>
  );
}

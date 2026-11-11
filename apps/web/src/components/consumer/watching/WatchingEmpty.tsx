// B+ (`bp-s-empty_watching_m`): the shared My shows empty card, badged with the
// watch eye in a dashed ring.

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { MyShowsEmptyCard } from '@/components/consumer/history/MyShowsEmptyCard';

const copy = CONSUMER_COPY;

const EyeBadge = () => (
  <span
    className="flex items-center justify-center rounded-full border border-dashed"
    style={{
      width: 96,
      height: 96,
      borderColor: 'color-mix(in oklch, var(--signal) 45%, var(--border))',
      background:
        'radial-gradient(circle, color-mix(in oklch, var(--signal) 8%, var(--surface-1)), transparent 70%)',
      color: 'var(--signal)',
    }}
  >
    <svg
      width={32}
      height={32}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  </span>
);

export function WatchingEmpty() {
  return (
    <MyShowsEmptyCard
      badge={<EyeBadge />}
      eyebrow={copy.watchingEmptyEyebrow}
      tone="signal"
      title={copy.watchingEmptyTitle}
      body={copy.watchingEmptyBody}
      cta={{ label: copy.watchingEmptyCta, href: '/events' }}
    />
  );
}

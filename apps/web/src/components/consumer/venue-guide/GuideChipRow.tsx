import type { GuideChipKey } from '@concert-crawl/types';
import { CONSUMER_COPY } from '../definitions/copy';
import { GuideIcon } from './GuideIcon';

const copy = CONSUMER_COPY.venueGuide;

interface GuideChipRowProps {
  chipType: GuideChipKey;
  body: string;
}

export const GuideChipRow = ({ chipType, body }: GuideChipRowProps) => {
  const isAccessibility = chipType === 'accessibility';

  // The board draws no rules between guide rows, on mobile or desktop, so
  // there is no separator class at any width.
  return (
    <div
      className="flex min-w-0 gap-3"
      style={{ padding: '12px 0' }}
      data-testid={`guide-chip-${chipType}`}
    >
      <div
        className="flex shrink-0 items-center justify-center"
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: isAccessibility
            ? 'color-mix(in oklab, var(--signal) 14%, transparent)'
            : 'var(--surface-2)',
          color: isAccessibility ? 'var(--signal)' : 'var(--fg-muted)',
        }}
      >
        <GuideIcon chipType={chipType} size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: isAccessibility ? 'var(--signal)' : 'var(--fg-subtle)',
            }}
          >
            {copy.chipLabels[chipType]}
          </span>
        </div>
        <p
          style={{
            marginTop: 3,
            fontSize: '13.5px',
            lineHeight: 1.5,
            letterSpacing: '-0.005em',
            textWrap: 'pretty',
            color: 'var(--fg)',
          }}
        >
          {body}
        </p>
      </div>
    </div>
  );
};

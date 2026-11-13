import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { Panel } from '@/components/admin/primitives';
import { artistSyncRows, type ArtistCounts } from './health-model';

const copy = ADMIN_COPY.health.artistSync;

const TONES = {
  matched: 'var(--success)',
  soon: 'var(--warning)',
  later: 'var(--fg-subtle)',
  none: 'var(--fg-subtle)',
} as const;

/**
 * Artist sync (`03/health-desktop`, right column): where every artist stands,
 * in the four buckets the board draws. Desktop only (gap G12); the phone board
 * folds it into the Artists tile.
 */
export const ArtistSync = ({
  counts,
  artistsHref,
}: {
  counts: ArtistCounts;
  artistsHref: string;
}) => {
  const rows = artistSyncRows(counts);
  return (
    <div data-testid="artist-sync" className="health-desk">
      <Panel
        title={copy.title}
        padding="10px 18px 16px"
        action={
          <Link
            href={artistsHref}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--fg-muted)',
              textDecoration: 'none',
            }}
          >
            <ChevronRight
              size={12}
              aria-hidden="true"
              style={{ flex: 'none' }}
            />
            {copy.artists}
          </Link>
        }
      >
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {rows.map((row) => (
            <li
              key={row.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 0',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  flex: 'none',
                  background: TONES[row.key],
                }}
              />
              <span style={{ flex: 1, fontSize: 14, color: 'var(--fg-muted)' }}>
                {row.label}
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--fg)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {row.count.toLocaleString('en-US')}
              </span>
            </li>
          ))}
        </ul>
        <p
          style={{
            margin: '8px 0 0',
            fontSize: 12.5,
            lineHeight: 1.45,
            color: 'var(--fg-muted)',
          }}
        >
          {copy.footnote}
        </p>
      </Panel>
    </div>
  );
};

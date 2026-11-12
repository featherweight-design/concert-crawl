import type { CSSProperties } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { Panel } from '@/components/admin/primitives';
import { GRID_GROUPS, type GridCell, type GridGroup } from './health-model';

const copy = ADMIN_COPY.health.grid;

const TONES: Record<GridGroup, string> = {
  failed: 'var(--danger)',
  paused: 'var(--warning)',
  quiet: 'var(--fg-subtle)',
  ok: 'var(--success)',
};

const Dot = ({ group }: { group: GridGroup }) => (
  <span
    aria-hidden="true"
    style={{
      width: group === 'ok' ? 6 : 7,
      height: group === 'ok' ? 6 : 7,
      borderRadius: '50%',
      flex: 'none',
      background: TONES[group],
    }}
  />
);

const ellipsis: CSSProperties = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

// GAP G6: no paused reason is stored before 3c, so a pause reads bare "Paused".
const cellLine = (group: GridGroup, cell: GridCell): string =>
  group === 'failed'
    ? copy.failure(cell.failures, cell.autoPaused)
    : group === 'paused'
      ? copy.paused
      : copy.pageUnchanged;

/** Cells open the venue's page until 3a gives it a Runs tab. */
const Cell = ({ group, cell }: { group: GridGroup; cell: GridCell }) =>
  group === 'ok' ? (
    <Link
      href={`/admin/venues/${cell.id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 10px',
        minWidth: 0,
        fontSize: 12.5,
        color: 'var(--fg-muted)',
        textDecoration: 'none',
      }}
    >
      <Dot group={group} />
      <span style={ellipsis}>{cell.name}</span>
    </Link>
  ) : (
    <Link
      href={`/admin/venues/${cell.id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        borderRadius: 9,
        background: 'var(--surface-1)',
        minWidth: 0,
        color: 'var(--fg)',
        textDecoration: 'none',
      }}
    >
      <Dot group={group} />
      <span style={{ ...ellipsis, fontSize: 13, fontWeight: 600 }}>
        {cell.name}
      </span>
      <span
        style={{ ...ellipsis, flex: 1, fontSize: 12, color: 'var(--fg-muted)' }}
      >
        {cellLine(group, cell)}
      </span>
      <ChevronRight
        size={12}
        aria-hidden="true"
        style={{ flex: 'none', color: 'var(--fg-subtle)' }}
      />
    </Link>
  );

export const VenueGrid = ({
  groups,
  crawlRunsHref,
}: {
  groups: Record<GridGroup, GridCell[]>;
  crawlRunsHref: string;
}) => {
  const shown = GRID_GROUPS.filter((key) => groups[key].length > 0);
  return (
    <div data-testid="venue-grid">
      <Panel
        title={copy.title}
        action={
          // The phone board has no Crawl runs link or footer (gap G12).
          <Link
            href={crawlRunsHref}
            className="health-desk"
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--fg-muted)',
              textDecoration: 'none',
            }}
          >
            {copy.crawlRuns}
          </Link>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {shown.length === 0 && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-muted)' }}>
              {copy.empty}
            </p>
          )}
          {shown.map((key) => (
            <section
              key={key}
              data-testid={`venue-grid-${key}`}
              style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
            >
              <h3
                style={{
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9.5,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: key === 'quiet' ? 'var(--fg-subtle)' : TONES[key],
                  }}
                >
                  {copy.groups[key]}
                </span>
                <span style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>
                  {groups[key].length}
                </span>
              </h3>
              <div className="health-cells" data-group={key}>
                {groups[key].map((cell) => (
                  <Cell key={cell.id} group={key} cell={cell} />
                ))}
              </div>
            </section>
          ))}
          {shown.length > 0 && (
            // GAP G13: "Only {names} is in Needs you" needs a per-venue lookup.
            <p
              className="health-desk"
              style={{ margin: 0, fontSize: 12.5, color: 'var(--fg-muted)' }}
            >
              {copy.footer}
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
};

import type { CSSProperties } from 'react';
import {
  Ban,
  Check,
  CircleSlash,
  GitMerge,
  Pause,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { Panel } from '@/components/admin/primitives';
import { type DoneKind, type DoneRow } from './done-for-you';
import { formatMtTime } from './health-model';

const copy = ADMIN_COPY.health.doneForYou;

const ICONS: Record<DoneKind, LucideIcon> = {
  price: Tag,
  pause: Pause,
  block: Ban,
  merge: GitMerge,
  cancel: CircleSlash,
  match: Check,
};

const note: CSSProperties = {
  margin: 0,
  fontSize: 13.5,
  color: 'var(--fg-muted)',
};

/**
 * Done for you overnight (`03/health-desktop`, `03/health-mobile`): what the
 * system handled on its own, from the `system:*` audit rows. `rows` is null
 * when the read failed, so the panel says so instead of claiming a quiet night.
 *
 * 🔸 The boards draw an "All activity" link; the Activity log it points at is
 * phase 5d, so there is nothing to link to yet and the link is left out.
 */
export const DoneForYou = ({ rows }: { rows: DoneRow[] | null }) => (
  <div data-testid="done-for-you">
    <Panel title={copy.title} padding="4px 18px 6px" phoneCompact>
      {rows === null ? (
        <p role="status" style={{ ...note, padding: '14px 0' }}>
          {copy.failed}
        </p>
      ) : rows.length === 0 ? (
        <p style={{ ...note, padding: '14px 0' }}>{copy.empty}</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {rows.map((row, index) => {
            const Icon = ICONS[row.kind];
            return (
              <li
                key={row.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 0',
                  borderTop: index === 0 ? 'none' : '1px solid var(--border)',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    flex: 'none',
                    width: 30,
                    height: 30,
                    borderRadius: 9,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-card)',
                    color: 'var(--signal)',
                  }}
                >
                  <Icon size={15} strokeWidth={1.75} />
                </span>
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 14,
                    color: 'var(--fg)',
                  }}
                >
                  {row.text}
                </span>
                <time
                  dateTime={row.at}
                  style={{
                    flex: 'none',
                    fontSize: 12.5,
                    color: 'var(--fg-subtle)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatMtTime(row.at)}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  </div>
);

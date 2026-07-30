import type { EventWatcher } from '@concert-crawl/types'
import { Avatar } from '@/components/settings/Avatar'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { watcherInitial, watcherTone } from '@/lib/watchers'
import { WatcherAnonDisc } from './WatcherAnonDisc'

// Inside the roster card the separator ring is drawn in the card's own surface,
// not the page background.
const ROSTER_RING = 'var(--surface-1)'

interface WatchersRosterProps {
  named: EventWatcher[]
  /** Handle-less watchers, collapsed into a single summary row. */
  anonymousCount: number
}

const copy = CONSUMER_COPY.watchers

/**
 * The expanded roster. Handles are plain text, never links — no profile pages
 * exist, so a link would go nowhere. Handle-less watchers collapse into one
 * honest summary row rather than a column of blank discs.
 */
export const WatchersRoster = ({
  named,
  anonymousCount,
}: WatchersRosterProps) => (
  <div className="mt-3 rounded-xl border border-border bg-surface-1 p-3.5">
    <h3 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-fg-subtle">
      {copy.rosterTitle}
    </h3>
    <ul className="flex list-none flex-col gap-2.5 p-0">
      {named.map((watcher) => (
        <li key={watcher.handle} className="flex items-center gap-2.5">
          <div
            style={{
              borderRadius: '50%',
              boxShadow: `0 0 0 2px ${ROSTER_RING}`,
            }}
          >
            <Avatar
              handle={watcherInitial(watcher.handle)}
              avatarColor={watcherTone(watcher)}
              size={28}
            />
          </div>
          <span className="text-[13.5px] font-semibold tracking-[-0.005em] text-fg">
            {watcher.handle}
          </span>
        </li>
      ))}
      {anonymousCount > 0 && (
        <li
          className={`flex items-center gap-2.5${
            named.length > 0 ? ' border-t border-border pt-2.5' : ''
          }`}
        >
          <WatcherAnonDisc size={28} ring={ROSTER_RING} />
          <span className="text-[13.5px] font-semibold tracking-[-0.005em] text-fg-muted">
            {copy.rosterOthers(anonymousCount)}
          </span>
        </li>
      )}
    </ul>
  </div>
)

import type { EventWatcher } from '@concert-crawl/types'
import { Avatar } from '@/components/settings/Avatar'
import { watcherInitial, watcherTone } from '@/lib/watchers'
import { WatcherAnonDisc } from './WatcherAnonDisc'

interface WatcherAvatarStackProps {
  watchers: EventWatcher[]
  /** Handle-less discs to pad with when nobody in the crawl has a handle. */
  anonymousDiscs?: number
  /** Everyone not represented by a disc, shown as a +N chip. */
  overflow?: number
  size?: number
  /** Colour the 2px separator ring is drawn in — matches the backdrop. */
  ring?: string
}

/**
 * Overlapping avatar discs, left-to-right, with a +N chip for the remainder.
 * Every disc is decorative — the sentence beside the stack carries the names
 * and the count, so screen readers never hear the stack.
 */
export const WatcherAvatarStack = ({
  watchers,
  anonymousDiscs = 0,
  overflow = 0,
  size = 24,
  ring = 'var(--bg)',
}: WatcherAvatarStackProps) => {
  const overlap = Math.round(size * 0.3)
  const ringShadow = `0 0 0 2px ${ring}`
  const discCount = watchers.length + anonymousDiscs

  return (
    <div className="flex items-center">
      {watchers.map((watcher, index) => (
        <div
          key={watcher.handle}
          style={{
            marginLeft: index === 0 ? 0 : -overlap,
            zIndex: discCount - index,
            boxShadow: ringShadow,
            borderRadius: '50%',
          }}
          data-watcher-disc
        >
          {/* Avatar derives its letter with charAt(0), which would render the
              leading underscore of a handle like "_dev_ftw". Pass the
              already-stripped initial so the disc shows "D". */}
          <Avatar
            handle={watcherInitial(watcher.handle)}
            avatarColor={watcherTone(watcher)}
            size={size}
          />
        </div>
      ))}
      {Array.from({ length: anonymousDiscs }, (_, index) => (
        <div
          key={`anon-${index}`}
          style={{
            marginLeft: watchers.length === 0 && index === 0 ? 0 : -overlap,
            zIndex: discCount - watchers.length - index,
          }}
          data-watcher-disc
        >
          <WatcherAnonDisc size={size} ring={ring} />
        </div>
      ))}
      {overflow > 0 && (
        <div
          aria-hidden
          data-watcher-overflow
          style={{
            marginLeft: discCount === 0 ? 0 : -overlap,
            zIndex: 0,
            minWidth: size,
            height: size,
            padding: '0 6px',
            borderRadius: size,
            background: 'var(--surface-2)',
            border: '1.5px solid var(--border-strong)',
            boxShadow: ringShadow,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: Math.round(size * 0.4),
            fontWeight: 700,
            color: 'var(--fg-muted)',
            letterSpacing: '-0.02em',
            boxSizing: 'border-box',
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}

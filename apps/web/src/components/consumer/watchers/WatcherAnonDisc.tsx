interface WatcherAnonDiscProps {
  size?: number
  /** Colour the 2px separator ring is drawn in — matches the backdrop. */
  ring?: string
}

/**
 * A handle-less watcher's disc: a neutral circle with a centre dot.
 *
 * The shared settings `Avatar` draws its anonymous state as a dashed empty
 * circle, which reads as "no avatar set" on a profile form. Here the disc
 * stands for a real person who simply has no handle, so it gets the solid
 * border and centre dot the handoff specifies — kept local rather than added
 * to `Avatar` as a variant, since no other surface needs it.
 */
export const WatcherAnonDisc = ({
  size = 24,
  ring = 'var(--bg)',
}: WatcherAnonDiscProps) => (
  <div
    aria-hidden
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      flexShrink: 0,
      background: 'var(--surface-2)',
      border: '1.5px solid var(--border-strong)',
      boxShadow: `0 0 0 2px ${ring}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
    }}
  >
    <div
      style={{
        width: size * 0.22,
        height: size * 0.22,
        borderRadius: '50%',
        background: 'var(--fg-subtle)',
      }}
    />
  </div>
)

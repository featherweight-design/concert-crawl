import { cn } from '@/lib/utils'

interface GenreChipsProps {
  genres: string[] | null
  className?: string
}

export function GenreChips({ genres, className }: GenreChipsProps) {
  if (!genres || genres.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {genres.map((tag) => (
        <span
          key={tag}
          className="rounded-[4px] bg-surface-3 px-[7px] py-[2px] text-fg-muted"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            letterSpacing: '0.03em',
          }}
        >
          {tag}
        </span>
      ))}
    </div>
  )
}

import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface WeekStripDay {
  date: string
  label: string
  dayOfMonth: string
  hasEvents: boolean
}

interface WeekStripProps {
  days: WeekStripDay[]
  selectedDate: string
  today: string
  /**
   * Called when the user selects a date. Providing this enables client-side
   * date switching without URL navigation — pass a setState setter so
   * re-selecting a previously visited date is instant with no network request.
   * When omitted, day buttons fall back to `buildHref` links (SSR nav).
   */
  onDateSelect?: (date: string) => void
  /** Used as the day `href` when `onDateSelect` is not provided. */
  buildHref?: (date: string) => string
  prevWeekHref: string | null
  nextWeekHref: string
}

function IconChevLeft({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M10 12L6 8l4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconChevRight({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M6 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function WeekStrip({
  days,
  selectedDate,
  today,
  onDateSelect,
  buildHref,
  prevWeekHref,
  nextWeekHref,
}: WeekStripProps) {
  return (
    <div className="mb-6 border-y border-border py-3">
      <div className="flex items-center gap-2">
        {/* Previous week arrow */}
        {prevWeekHref ? (
          <Link
            href={prevWeekHref}
            scroll={false}
            aria-label="Previous week"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-1 hover:text-fg"
          >
            <IconChevLeft size={16} />
          </Link>
        ) : (
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-fg-subtle opacity-30"
            aria-label="No previous week"
            aria-hidden
          >
            <IconChevLeft size={16} />
          </span>
        )}

        {/* Day grid */}
        <div className="grid min-w-0 flex-1 grid-cols-7 gap-1 sm:gap-2">
          {days.map((day) => {
            const selected = day.date === selectedDate
            const isPast = day.date < today

            if (isPast) {
              return (
                <div
                  key={day.date}
                  className="flex h-[58px] flex-col items-center justify-center rounded-xl opacity-30"
                  style={{ background: 'var(--surface-1)' }}
                  aria-disabled="true"
                >
                  <span
                    className="text-[10px] uppercase text-fg-muted"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {day.label}
                  </span>
                  <span className="text-[15px] font-semibold text-fg-muted">
                    {day.dayOfMonth}
                  </span>
                  <span className="mt-1 h-1 w-1 rounded-full" aria-hidden />
                </div>
              )
            }

            const dayInner = (
              <>
                <span
                  className="text-[10px] uppercase"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                  }}
                >
                  {day.label}
                </span>
                <span className="text-[15px] font-semibold">
                  {day.dayOfMonth}
                </span>
                <span
                  className="mt-1 h-1 w-1 rounded-full"
                  style={{
                    background: day.hasEvents
                      ? selected
                        ? 'var(--fg-on-accent)'
                        : 'var(--signal)'
                      : 'transparent',
                  }}
                  aria-hidden
                />
              </>
            )

            const dayClassName = cn(
              'flex h-[58px] flex-col items-center justify-center rounded-xl transition-colors',
              selected
                ? 'bg-signal text-fg-on-accent'
                : 'bg-surface-1 text-fg-muted',
            )

            if (onDateSelect) {
              return (
                <button
                  key={day.date}
                  type="button"
                  className={cn(dayClassName, 'cursor-pointer')}
                  onClick={() => onDateSelect(day.date)}
                  aria-current={selected ? 'date' : undefined}
                >
                  {dayInner}
                </button>
              )
            }

            return (
              <Link
                key={day.date}
                href={buildHref?.(day.date) ?? '#'}
                className={dayClassName}
                scroll={false}
                aria-current={selected ? 'date' : undefined}
              >
                {dayInner}
              </Link>
            )
          })}
        </div>

        {/* Next week arrow */}
        <Link
          href={nextWeekHref}
          scroll={false}
          aria-label="Next week"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-1 hover:text-fg"
        >
          <IconChevRight size={16} />
        </Link>
      </div>
    </div>
  )
}

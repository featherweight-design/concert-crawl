import Link from 'next/link'
import { cn } from '@/lib/utils'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { accessibleDayLabelFor } from '@/components/consumer/jump-picker/date-math'

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
}

export function WeekStrip({
  days,
  selectedDate,
  today,
  onDateSelect,
  buildHref,
}: WeekStripProps) {
  return (
    <div className="mb-6 border-y border-border py-3">
      <div className="grid min-w-0 grid-cols-7 gap-1 sm:gap-2">
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
                      : 'var(--accent)'
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

          // Derive the accessible name from the ISO date so it always names the
          // weekday + month ("Monday, Apr 27") instead of the ambiguous short
          // label. The dot indicator is aria-hidden, so fold the shows-on-sale
          // cue into the name too.
          const dayName = accessibleDayLabelFor(day.date)
          const dayAriaLabel = day.hasEvents
            ? `${dayName}, ${CONSUMER_COPY.weekStripDayShows}`
            : dayName

          if (onDateSelect) {
            return (
              <button
                key={day.date}
                type="button"
                className={cn(dayClassName, 'cursor-pointer')}
                onClick={() => onDateSelect(day.date)}
                aria-label={dayAriaLabel}
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
              aria-label={dayAriaLabel}
              aria-current={selected ? 'date' : undefined}
            >
              {dayInner}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

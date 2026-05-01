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
  buildHref: (date: string) => string
}

export function WeekStrip({ days, selectedDate, buildHref }: WeekStripProps) {
  return (
    <div className="mb-6 border-y border-border py-3">
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((day) => {
          const selected = day.date === selectedDate
          return (
            <Link
              key={day.date}
              href={buildHref(day.date)}
              className={cn(
                'flex h-[58px] flex-col items-center justify-center rounded-xl transition-colors',
                selected
                  ? 'bg-signal text-fg-on-accent'
                  : 'bg-surface-1 text-fg-muted',
              )}
              scroll={false}
              aria-current={selected ? 'date' : undefined}
            >
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
            </Link>
          )
        })}
      </div>
    </div>
  )
}

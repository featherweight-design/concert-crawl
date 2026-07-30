// Derives the GoingButton state for an event from the Event Detail payload.
//
// The four states are a product of two independent facts: whether the night has
// happened yet, and whether the user ever said "I'm going!". Attendance is not
// derived from the watch list (#70 concept lock) — only `attendingAt` answers it.

import { localDateString } from '@/lib/time'
import type { GoingButtonState } from '../GoingButton'

export const goingStateFor = ({
  date,
  attendingAt,
  timezone,
}: {
  date: string
  attendingAt: string | null
  timezone: string
}): GoingButtonState => {
  // A show is "past" only once its calendar day has rolled over in the venue's
  // own zone — a 9pm door tonight is still committable at 11pm.
  const isPast = date < localDateString(timezone)
  if (isPast) return attendingAt ? 'past-yes' : 'past-no'
  return attendingAt ? 'going' : 'default'
}

'use client'

import { COPY } from './definitions/copy'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return COPY.greeting.morning
  if (hour < 17) return COPY.greeting.afternoon
  return COPY.greeting.evening
}

export const DashboardGreeting = ({ firstName }: { firstName: string }) => (
  <>
    {getGreeting()}, {firstName}.
  </>
)

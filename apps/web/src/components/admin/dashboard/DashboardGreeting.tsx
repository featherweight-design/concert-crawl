'use client'

import { ADMIN_COPY } from '@/components/admin/definitions/copy'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return ADMIN_COPY.dashboard.greeting.morning
  if (hour < 17) return ADMIN_COPY.dashboard.greeting.afternoon
  return ADMIN_COPY.dashboard.greeting.evening
}

export const DashboardGreeting = ({ firstName }: { firstName: string }) => (
  <>
    {getGreeting()}, {firstName}.
  </>
)

'use client'

import { type ComponentProps } from 'react'
import { PricesSubmissionsClient } from '@/components/admin/prices/PricesSubmissionsClient'

type SubmissionsProps = ComponentProps<typeof PricesSubmissionsClient>

export interface SubmissionsTabContentProps {
  initialSubmissions: SubmissionsProps['initialSubmissions']
  initialTotal: SubmissionsProps['initialTotal']
}

export const SubmissionsTabContent = ({
  initialSubmissions,
  initialTotal,
}: SubmissionsTabContentProps) => (
  <PricesSubmissionsClient
    embedded
    initialSubmissions={initialSubmissions}
    initialTotal={initialTotal}
  />
)

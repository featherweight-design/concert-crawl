'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { CommunityPriceChip } from './CommunityPriceChip'
import { VerifySheet } from './VerifySheet'
import type {
  SubmissionListResponse,
  SubmissionWithMeta,
} from '@concert-crawl/types'

interface PriceSectionProps {
  eventId: string
  artistName: string
  venueName: string
  eventDate: string
}

export function PriceSection({
  eventId,
  artistName,
  venueName,
  eventDate,
}: PriceSectionProps) {
  const { getToken, userId } = useAuth()
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [submissions, setSubmissions] = useState<SubmissionWithMeta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSubmissions() {
      try {
        const token = await getToken()
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/v1/events/${eventId}/price-submissions`,
          token ? { headers: { Authorization: `Bearer ${token}` } } : {},
        )
        if (!res.ok) return
        const data = (await res.json()) as {
          success: boolean
          data: SubmissionListResponse
        }
        if (data.success) setSubmissions(data.data.submissions)
      } finally {
        setLoading(false)
      }
    }
    void fetchSubmissions()
  }, [eventId, getToken])

  async function handleQuickConfirm() {
    const topSub = submissions[0]
    if (!topSub) return
    const token = await getToken()
    if (!token) return
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/submissions/${topSub.id}/confirm`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
    )
    if (res.ok) {
      const data = (await res.json()) as {
        data: { confirms: number; status: SubmissionWithMeta['status'] }
      }
      setSubmissions((prev) =>
        prev.map((sub, idx) =>
          idx === 0
            ? {
                ...sub,
                confirms: data.data.confirms,
                status: data.data.status,
              }
            : sub,
        ),
      )
    }
  }

  const topSubmission = submissions[0]

  if (loading || !topSubmission) return null

  return (
    <>
      <CommunityPriceChip
        topSubmission={topSubmission}
        submissionCount={submissions.length}
        onConfirm={handleQuickConfirm}
        onOpenVerify={() => setVerifyOpen(true)}
      />
      <VerifySheet
        open={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        submissions={submissions}
        eventId={eventId}
        artistName={artistName}
        venueName={venueName}
        eventDate={eventDate}
        currentUserId={userId ?? null}
      />
    </>
  )
}

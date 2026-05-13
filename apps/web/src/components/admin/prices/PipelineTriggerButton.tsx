'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Play, Loader2 } from 'lucide-react'
import { AdminButton } from '@/components/admin/primitives'
import { ApiError } from '@/lib/api'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

type TriggerState = 'idle' | 'loading' | 'started' | 'error'

interface PipelineTriggerButtonProps {
  eventId: string
}

export const PipelineTriggerButton = ({
  eventId,
}: PipelineTriggerButtonProps) => {
  const { getToken } = useAuth()
  const [state, setState] = useState<TriggerState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const runPipeline = async () => {
    setState('loading')
    setErrorMessage(null)

    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')

      const res = await fetch(
        `${API_URL}/v1/admin/prices/pipeline/${eventId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      )

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string
        }
        throw new ApiError(res.status, body.error ?? `Error ${res.status}`)
      }

      setState('started')
    } catch (err) {
      setState('error')
      setErrorMessage(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Failed to start pipeline',
      )
    }
  }

  if (state === 'started') {
    return (
      <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 500 }}>
        Started
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <AdminButton
        variant="ghost"
        size="sm"
        icon={state === 'loading' ? Loader2 : Play}
        onClick={runPipeline}
        disabled={state === 'loading'}
      >
        {state === 'loading' ? 'Running…' : 'Run'}
      </AdminButton>
      {state === 'error' && errorMessage && (
        <span
          role="alert"
          style={{ fontSize: 11, color: 'var(--danger)', whiteSpace: 'nowrap' }}
        >
          {errorMessage}
        </span>
      )}
    </div>
  )
}

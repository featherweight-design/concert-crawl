'use client'

import { useState } from 'react'
import { Play, Loader2 } from 'lucide-react'
import { AdminButton } from '@/components/admin/primitives'
import { useTriggerPricePipeline } from '@/lib/queries/use-admin-price-pipeline'

interface PipelineTriggerButtonProps {
  eventId: string
}

export const PipelineTriggerButton = ({
  eventId,
}: PipelineTriggerButtonProps) => {
  const triggerPipeline = useTriggerPricePipeline()
  const [showStarted, setShowStarted] = useState(false)

  const runPipeline = async () => {
    setShowStarted(false)
    try {
      await triggerPipeline.mutateAsync(eventId)
      setShowStarted(true)
      setTimeout(() => setShowStarted(false), 3000)
    } catch {
      // error surfaced via triggerPipeline.isError
    }
  }

  if (showStarted) {
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
        icon={triggerPipeline.isPending ? Loader2 : Play}
        onClick={() => void runPipeline()}
        disabled={triggerPipeline.isPending}
      >
        {triggerPipeline.isPending ? 'Running…' : 'Run'}
      </AdminButton>
      {triggerPipeline.isError && triggerPipeline.error && (
        <span
          role="alert"
          style={{ fontSize: 11, color: 'var(--danger)', whiteSpace: 'nowrap' }}
        >
          {triggerPipeline.error instanceof Error
            ? triggerPipeline.error.message
            : 'Failed to start pipeline'}
        </span>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { apiClient } from '@/lib/api'
import { SettingsLayout } from './SettingsLayout'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

type TestEmailResult =
  | { sent: true; resendId: string | null }
  | {
      sent: false
      reason: 'missing_api_key' | 'missing_admin_email' | 'send_failed'
      error?: unknown
    }

type Status =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'done'; result: TestEmailResult }
  | { kind: 'error'; message: string }

const COPY = ADMIN_COPY.settings.opsTools

export function OpsToolsSection() {
  const { getToken } = useAuth()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  const handleSendTest = async () => {
    setStatus({ kind: 'pending' })
    try {
      const token = await getToken()
      if (!token) {
        setStatus({ kind: 'error', message: COPY.testEmail.notAuthenticated })
        return
      }
      const data = await apiClient.post<TestEmailResult>(
        '/v1/admin/notifications/test-email',
        token,
        {},
      )
      setStatus({ kind: 'done', result: data })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setStatus({ kind: 'error', message })
    }
  }

  return (
    <SettingsLayout heading={COPY.heading} description={COPY.description}>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => void handleSendTest()}
          disabled={status.kind === 'pending'}
          className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-surface-1 px-3 py-1.5 text-sm font-medium text-fg hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status.kind === 'pending'
            ? COPY.testEmail.buttonPending
            : COPY.testEmail.button}
        </button>

        {status.kind === 'done' && status.result.sent && (
          <p className="text-sm text-success">
            {COPY.testEmail.successPrefix}
            {status.result.resendId ? ` (id: ${status.result.resendId})` : ''}
          </p>
        )}

        {status.kind === 'done' && !status.result.sent && (
          <div className="flex flex-col gap-1 text-sm text-warning">
            <p>
              {COPY.testEmail.notSentPrefix} {reasonLabel(status.result.reason)}
            </p>
            {'error' in status.result && status.result.error != null && (
              <pre className="overflow-x-auto rounded bg-surface-2 px-2 py-1 text-xs text-fg-muted">
                {formatError(status.result.error)}
              </pre>
            )}
          </div>
        )}

        {status.kind === 'error' && (
          <p className="text-sm text-danger">
            {COPY.testEmail.requestFailed}: {status.message}
          </p>
        )}
      </div>
    </SettingsLayout>
  )
}

function reasonLabel(
  reason: 'missing_api_key' | 'missing_admin_email' | 'send_failed',
): string {
  if (reason === 'missing_api_key') return COPY.testEmail.reasons.missingApiKey
  if (reason === 'missing_admin_email')
    return COPY.testEmail.reasons.missingAdminEmail
  return COPY.testEmail.reasons.sendFailed
}

function formatError(err: unknown): string {
  try {
    return JSON.stringify(err, null, 2)
  } catch {
    return String(err)
  }
}

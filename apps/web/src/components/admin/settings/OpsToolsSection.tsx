'use client'

import { useEffect, useState } from 'react'
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

type TestEmailGroup = 'Customer' | 'Operational'

interface TestEmailOption {
  key: string
  label: string
  group: TestEmailGroup
}

const GROUP_ORDER: readonly TestEmailGroup[] = ['Customer', 'Operational']

type Status =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'done'; result: TestEmailResult }
  | { kind: 'error'; message: string }

const COPY = ADMIN_COPY.settings.opsTools

export function OpsToolsSection() {
  const { getToken } = useAuth()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [options, setOptions] = useState<TestEmailOption[] | null>(null)
  const [optionsFailed, setOptionsFailed] = useState(false)
  const [selectedKey, setSelectedKey] = useState('admin_alert')

  useEffect(() => {
    let cancelled = false
    const loadOptions = async () => {
      try {
        const token = await getToken()
        if (!token) {
          if (!cancelled) setOptionsFailed(true)
          return
        }
        const data = await apiClient.get<TestEmailOption[]>(
          '/v1/admin/notifications/test-email/options',
          token,
        )
        if (cancelled) return
        setOptions(data)
        if (data[0]) setSelectedKey(data[0].key)
      } catch {
        if (!cancelled) setOptionsFailed(true)
      }
    }
    void loadOptions()
    return () => {
      cancelled = true
    }
  }, [getToken])

  const submitTest = async () => {
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
        { emailKey: selectedKey },
      )
      setStatus({ kind: 'done', result: data })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setStatus({ kind: 'error', message })
    }
  }

  const groupedOptions = GROUP_ORDER.map((group) => ({
    group,
    items: (options ?? []).filter((opt) => opt.group === group),
  })).filter((section) => section.items.length > 0)

  return (
    <SettingsLayout heading={COPY.heading} description={COPY.description}>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-fg">
            {COPY.testEmail.pickerLabel}
          </span>
          <select
            value={options === null ? '' : selectedKey}
            onChange={(event) => setSelectedKey(event.target.value)}
            disabled={options === null || status.kind === 'pending'}
            className="w-full max-w-sm rounded-md border border-border bg-surface-1 px-3 py-1.5 text-sm text-fg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {options === null && !optionsFailed && (
              <option value="">{COPY.testEmail.optionsLoading}</option>
            )}
            {optionsFailed && (
              <option value="">{COPY.testEmail.optionsFailed}</option>
            )}
            {groupedOptions.map((section) => (
              <optgroup key={section.group} label={section.group}>
                {section.items.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <span className="text-xs text-fg-muted">
            {COPY.testEmail.pickerHint}
          </span>
        </label>

        <button
          type="button"
          onClick={() => void submitTest()}
          disabled={
            (options === null && !optionsFailed) || status.kind === 'pending'
          }
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

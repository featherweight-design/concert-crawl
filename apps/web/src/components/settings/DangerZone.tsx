'use client'

import { useState } from 'react'
import { useClerk } from '@clerk/nextjs'
import { DeleteAccountSheet } from './DeleteAccountSheet'
import { SETTINGS_COPY } from './definitions/copy'

interface DangerZoneProps {
  handle?: string | null
  submissionCount?: number
}

export function DangerZone({ handle, submissionCount }: DangerZoneProps) {
  const { signOut } = useClerk()
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <>
      <div className="flex flex-col gap-2">
        {/* Sign out row */}
        <button
          type="button"
          onClick={() => void signOut().catch(console.error)}
          className="flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-colors hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
            className="shrink-0 text-fg-muted"
          >
            <path
              d="M6 3H3.5A1.5 1.5 0 002 4.5v7A1.5 1.5 0 003.5 13H6"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <path
              d="M10 5l3 3-3 3M13 8H6"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] font-semibold text-fg">
              {SETTINGS_COPY.dangerZone.signOut}
            </span>
            <span className="text-[12px] text-fg-muted">
              {SETTINGS_COPY.dangerZone.signOutSubtitle}
            </span>
          </div>
        </button>

        {/* Delete account card */}
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: 'var(--danger)' }}
        >
          <div className="mb-2 flex items-center gap-2">
            <svg
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              aria-hidden
              style={{ color: 'var(--danger)' }}
            >
              <path
                d="M3 4h9M5.5 4V2.5h4V4M6 7v4M9 7v4M4 4l.7 8.5h5.6L11 4"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              className="text-[14px] font-bold"
              style={{ color: 'var(--danger)' }}
            >
              {SETTINGS_COPY.dangerZone.deleteAccount}
            </span>
          </div>
          <p className="mb-3 text-[13px] leading-relaxed text-fg-muted">
            {SETTINGS_COPY.dangerZone.deleteCardBody}
          </p>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="rounded-lg border px-3 py-2 text-[13px] font-bold transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
            style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
          >
            {SETTINGS_COPY.dangerZone.deleteAccountCta}
          </button>
        </div>
      </div>

      <DeleteAccountSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        {...(handle !== undefined && { handle })}
        {...(submissionCount !== undefined && { submissionCount })}
      />
    </>
  )
}

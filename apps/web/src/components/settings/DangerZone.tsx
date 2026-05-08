'use client'

import { useState } from 'react'
import { useClerk } from '@clerk/nextjs'
import { DeleteAccountSheet } from './DeleteAccountSheet'
import { SETTINGS_COPY } from './definitions/copy'

export function DangerZone() {
  const { signOut } = useClerk()
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => void signOut().catch(console.error)}
          className="flex cursor-pointer flex-col gap-0.5 rounded-xl px-4 py-3 text-left transition-colors hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        >
          <span className="text-[14px] font-semibold text-fg">
            {SETTINGS_COPY.dangerZone.signOut}
          </span>
          <span className="text-[12px] text-fg-muted">
            {SETTINGS_COPY.dangerZone.signOutSubtitle}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex cursor-pointer flex-col gap-0.5 rounded-xl px-4 py-3 text-left transition-colors hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
        >
          <span
            className="text-[14px] font-semibold"
            style={{ color: 'var(--danger)' }}
          >
            {SETTINGS_COPY.dangerZone.deleteAccount}
          </span>
          <span className="text-[12px] text-fg-muted">
            {SETTINGS_COPY.dangerZone.deleteAccountSubtitle}
          </span>
        </button>
      </div>

      <DeleteAccountSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </>
  )
}

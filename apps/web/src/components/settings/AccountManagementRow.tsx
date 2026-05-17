'use client'

import { useClerk, useUser } from '@clerk/nextjs'
import { SETTINGS_COPY } from './definitions/copy'

interface AccountManagementRowProps {
  email: string
}

export function AccountManagementRow({ email }: AccountManagementRowProps) {
  const { openUserProfile } = useClerk()
  const { user } = useUser()

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-1">
      {/* Email row */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <svg
          width="15"
          height="15"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
          className="shrink-0 text-fg-muted"
        >
          <rect
            x="2.5"
            y="3.5"
            width="11"
            height="9"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <path
            d="M3 5l5 4 5-4"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="flex-1 text-[14px] font-medium text-fg">
          {SETTINGS_COPY.emailRow}
        </span>
        <span className="truncate text-[13px] text-fg-muted">{email}</span>
      </div>
      {user?.passwordEnabled && (
        <>
          <div className="mx-4 h-px bg-border" />
          {/* Password row — only shown for email/password accounts */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <svg
              width="15"
              height="15"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden
              className="shrink-0 text-fg-muted"
            >
              <rect
                x="3"
                y="7"
                width="10"
                height="7"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <path
                d="M5.5 7V5.5a2.5 2.5 0 015 0V7"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
            <span className="flex-1 text-[14px] font-medium text-fg">
              {SETTINGS_COPY.passwordRow}
            </span>
            <button
              type="button"
              onClick={() => openUserProfile()}
              className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-bold uppercase tracking-[0.06em] text-fg-subtle transition-colors hover:text-fg-muted"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Manage →
            </button>
          </div>
        </>
      )}
    </div>
  )
}

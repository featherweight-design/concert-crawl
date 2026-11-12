'use client';

import { useState } from 'react';
import { ChevronRight, LogOut, X } from 'lucide-react';
import { useClerk } from '@clerk/nextjs';
import { DeleteAccountSheet } from './DeleteAccountSheet';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

const SETTINGS_COPY = CONSUMER_COPY.settings;

interface DangerZoneProps {
  handle?: string | null;
  submissionCount?: number;
}

export function DangerZone({ handle, submissionCount }: DangerZoneProps) {
  const { signOut } = useClerk();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-2">
        {/* Sign out card */}
        <button
          type="button"
          onClick={() => void signOut().catch(console.error)}
          className="flex w-full cursor-pointer items-center gap-3.5 rounded-2xl border border-border bg-surface-1 px-4 py-4 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        >
          <LogOut size={17} aria-hidden className="shrink-0 text-fg-muted" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-[16px] font-bold tracking-[-0.005em] text-fg">
              {SETTINGS_COPY.dangerZone.signOut}
            </span>
            <span className="text-[13px] text-fg-muted">
              {SETTINGS_COPY.dangerZone.signOutSubtitle}
            </span>
          </div>
          <ChevronRight
            size={15}
            aria-hidden
            className="shrink-0 text-fg-subtle"
          />
        </button>

        {/* Delete account card */}
        <div
          className="rounded-2xl border p-4"
          style={{
            borderColor: 'color-mix(in oklch, var(--danger) 70%, transparent)',
            background:
              'linear-gradient(135deg, color-mix(in oklch, var(--danger) 9%, var(--surface-1)), var(--surface-1))',
          }}
        >
          <div className="mb-2 flex items-center gap-2">
            <X
              size={16}
              aria-hidden
              className="shrink-0"
              style={{ color: 'var(--danger)' }}
            />
            <span
              className="text-[16px] font-bold"
              style={{ color: 'var(--danger)' }}
            >
              {SETTINGS_COPY.dangerZone.deleteAccount}
            </span>
          </div>
          <p className="mb-3.5 text-[14px] leading-relaxed text-fg-muted">
            {SETTINGS_COPY.dangerZone.deleteCardBody}
          </p>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="rounded-xl border px-4 py-2.5 text-[14px] font-bold transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
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
  );
}

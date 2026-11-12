'use client';

import type { ReactNode } from 'react';
import { ChevronRight, Lock, Mail, Share2 } from 'lucide-react';
import { useClerk, useUser } from '@clerk/nextjs';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { LegalLinksCard } from './LegalLinksCard';

const SETTINGS_COPY = CONSUMER_COPY.settings;

interface AccountManagementRowProps {
  email: string;
  /** Desktop panels run one step wider than the mobile column. */
  variant?: 'mobile' | 'desktop';
}

function providerDisplayName(provider: string): string {
  return provider
    .replace(/^oauth_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const ROW_CLASS = 'flex items-center gap-3 py-4';

const Row = ({
  icon,
  inset,
  children,
}: {
  icon: ReactNode;
  inset: string;
  children: ReactNode;
}) => (
  <div className={`${ROW_CLASS} ${inset}`}>
    <span aria-hidden className="flex shrink-0 text-fg-muted">
      {icon}
    </span>
    {children}
  </div>
);

const RowLabel = ({ children }: { children: ReactNode }) => (
  <span className="flex-1 text-[16px] font-bold tracking-[-0.005em] text-fg">
    {children}
  </span>
);

export function AccountManagementRow({
  email,
  variant = 'mobile',
}: AccountManagementRowProps) {
  const { openUserProfile } = useClerk();
  const { user } = useUser();
  const inset = variant === 'mobile' ? 'px-4' : 'px-5';
  const divider = variant === 'mobile' ? 'mx-4' : 'mx-5';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface-1">
          {/* Email row: the credential itself lives with Clerk */}
          <button
            type="button"
            onClick={() => openUserProfile()}
            className={`${ROW_CLASS} ${inset} w-full cursor-pointer text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-signal`}
          >
            <span aria-hidden className="flex shrink-0 text-fg-muted">
              <Mail size={16} />
            </span>
            <RowLabel>{SETTINGS_COPY.emailRow}</RowLabel>
            <span className="truncate text-[14px] text-fg-muted">{email}</span>
            <ChevronRight
              size={15}
              aria-hidden
              className="shrink-0 text-fg-subtle"
            />
          </button>

          {/* Connected account rows */}
          {user?.externalAccounts?.map((account) => (
            <div key={account.provider}>
              <div className={`${divider} h-px bg-border`} />
              <Row icon={<Share2 size={16} />} inset={inset}>
                <RowLabel>{SETTINGS_COPY.connectedAccountRow}</RowLabel>
                <span className="truncate text-[14px] text-fg-muted">
                  {providerDisplayName(account.provider)}
                </span>
              </Row>
            </div>
          ))}

          {/* Password row — only shown for email/password accounts */}
          {user?.passwordEnabled && (
            <>
              <div className={`${divider} h-px bg-border`} />
              <Row icon={<Lock size={16} />} inset={inset}>
                <RowLabel>{SETTINGS_COPY.passwordRow}</RowLabel>
                <button
                  type="button"
                  onClick={() => openUserProfile()}
                  className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-bold uppercase tracking-[0.06em] text-fg-subtle transition-colors hover:text-fg-muted"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {SETTINGS_COPY.clerkLinkLabel}
                </button>
              </Row>
            </>
          )}
        </div>

        {/* Clerk attribution */}
        <p
          className="px-1 text-fg-subtle"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.04em',
          }}
        >
          {SETTINGS_COPY.clerkAttribution}{' '}
          <a
            href="https://clerk.com/legal/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-signal hover:underline"
          >
            {SETTINGS_COPY.clerkPrivacyLink}
          </a>
        </p>
      </div>

      <LegalLinksCard variant={variant} />
    </div>
  );
}

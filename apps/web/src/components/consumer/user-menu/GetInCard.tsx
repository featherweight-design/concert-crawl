'use client'

import Link from 'next/link'
import { AnonDisc } from '@/components/consumer/app-header/AnonDisc'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const copy = CONSUMER_COPY.userMenu.signedOut

interface GetInCardProps {
  onNavigate: () => void
}

/**
 * The signed-out occupant of the identity card's slot — same footprint, same
 * bottom border, same position at the top of the menu. "Who you are" signed in,
 * "become someone" signed out. Deliberately no louder than the card it
 * replaces: the theme picker below it is the reason the menu still opens.
 */
export function GetInCard({ onNavigate }: GetInCardProps) {
  return (
    <div
      data-menu-row="get-in"
      style={{
        padding: '14px 14px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <AnonDisc size={42} />
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--fg-muted)',
              letterSpacing: '0.14em',
            }}
          >
            {copy.eyebrow}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--fg)',
              letterSpacing: '-0.005em',
            }}
          >
            {copy.line}
          </span>
        </div>
      </div>

      <Link
        href={copy.signUpHref}
        onClick={onNavigate}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 44,
          borderRadius: 10,
          background: 'var(--signal)',
          color: 'var(--bg)',
          fontFamily: 'var(--font-ui)',
          fontSize: 13.5,
          fontWeight: 700,
          letterSpacing: '-0.005em',
        }}
      >
        {copy.signUp}
      </Link>

      <span
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 12,
          color: 'var(--fg-muted)',
          textAlign: 'center',
        }}
      >
        {copy.alreadyHaveAccount}{' '}
        <Link
          href={copy.signInHref}
          onClick={onNavigate}
          style={{
            color: 'var(--fg)',
            fontWeight: 700,
            textDecoration: 'underline',
          }}
        >
          {copy.signIn}
        </Link>
      </span>
    </div>
  )
}

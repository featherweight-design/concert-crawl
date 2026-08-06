'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { CREW_MEMBER_CAP, type CrewInvite } from '@concert-crawl/types'

import { ModalShell } from '@/components/consumer/modal-shell'
import { CrewPatch } from '@/components/consumer/crew-patch'
import { fetchCurrentInvite, mintInvite, revokeInvite } from '@/lib/crews'
import { CrewNotice } from './CrewNotice'
import { daysUntil } from './lib/format'
import { CREWS_COPY } from './definitions/copy'

const COPY = CREWS_COPY

interface InviteSheetProps {
  open: boolean
  onClose: () => void
  crewId: string
  crewName: string
  patchSalt: number
  memberCount: number
}

const inviteUrl = (token: string): string => {
  // The origin the customer is actually on, so a staging link never says
  // production. `window` is always defined here: the sheet is client-only.
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  return `${origin}/crew/join/${token}`
}

const ghost: React.CSSProperties = {
  minHeight: 44,
  padding: '0 14px',
  borderRadius: 999,
  background: 'transparent',
  border: '1px solid var(--border-strong)',
  color: 'var(--fg)',
  fontFamily: 'var(--font-ui)',
  fontSize: 13,
  fontWeight: 700,
}

export const InviteSheet = ({
  open,
  onClose,
  crewId,
  crewName,
  patchSalt,
  memberCount,
}: InviteSheetProps) => {
  const { getToken } = useAuth()
  const [invite, setInvite] = useState<CrewInvite | null>(null)
  const [copied, setCopied] = useState(false)
  const [revoked, setRevoked] = useState(false)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)

  // The link is fetched (and minted if there isn't one) on open, so by the
  // time the copy button can be tapped the token is already in hand. Awaiting
  // anything inside that click handler spends the user-activation grant and
  // `writeText` silently fails in Safari — the #72 lesson.
  useEffect(() => {
    if (!open) {
      setInvite(null)
      setCopied(false)
      setRevoked(false)
      setFailed(false)
      // Including `busy`: dismissing the sheet mid-revoke otherwise leaves the
      // next open with every button disabled and nothing in flight to re-enable
      // them.
      setBusy(false)
      return
    }
    let live = true
    const load = async () => {
      try {
        const token = await getToken()
        if (token === null) throw new Error('Not signed in')
        const existing = await fetchCurrentInvite(token, crewId)
        const link = existing ?? (await mintInvite(token, crewId))
        if (live) setInvite(link)
      } catch (err) {
        console.error('InviteSheet: could not load the invite link', err)
        if (live) setFailed(true)
      }
    }
    void load()
    return () => {
      live = false
    }
  }, [open, crewId, getToken])

  const onCopy = () => {
    // Copying mid-revoke would hand out a link already on its way out.
    if (invite === null || busy) return
    // Every action entry point clears the last failure first, so the notice
    // describes this attempt rather than the previous one.
    setFailed(false)
    // `navigator.clipboard` is undefined on insecure origins and older Safari,
    // and `writeText` throws rather than rejecting there, so the rejection
    // handler alone would not catch it.
    const { clipboard } = navigator
    if (clipboard === undefined) {
      setFailed(true)
      return
    }
    try {
      // Synchronous, deliberately. No await above this line.
      clipboard.writeText(inviteUrl(invite.token)).then(
        () => {
          setCopied(true)
          window.setTimeout(() => setCopied(false), 2400)
        },
        (err: unknown) => {
          console.error('InviteSheet: clipboard write failed', err)
          setFailed(true)
        },
      )
    } catch (err) {
      console.error('InviteSheet: clipboard unavailable', err)
      setFailed(true)
    }
  }

  const onRevoke = async () => {
    if (invite === null || busy) return
    setBusy(true)
    setFailed(false)
    try {
      const token = await getToken()
      if (token === null) throw new Error('Not signed in')
      await revokeInvite(token, crewId, invite.id)
      setRevoked(true)
      setCopied(false)
    } catch (err) {
      console.error('InviteSheet: could not retire the link', err)
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  const onNewLink = async () => {
    if (busy) return
    setBusy(true)
    setFailed(false)
    try {
      const token = await getToken()
      if (token === null) throw new Error('Not signed in')
      const link = await mintInvite(token, crewId)
      setInvite(link)
      setRevoked(false)
      setCopied(false)
    } catch (err) {
      console.error('InviteSheet: could not mint a new link', err)
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  const left = CREW_MEMBER_CAP - memberCount
  const atCap = left <= 0

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      ariaLabel={COPY.invite.title}
      sheetHeight="tall"
      desktopWidth={540}
      header={
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer"
            style={{
              minHeight: 44,
              padding: '0 4px',
              background: 'none',
              border: 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.08em',
              color: 'var(--fg-subtle)',
            }}
          >
            {COPY.a11y.close}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 pb-2">
        <div className="flex items-center gap-3">
          <CrewPatch
            crewId={crewId}
            patchSalt={patchSalt}
            size={48}
            scale="tile"
          />
          <div className="flex min-w-0 flex-col gap-1">
            <span
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--fg)',
              }}
            >
              {crewName}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: left <= 2 ? 'var(--warning)' : 'var(--fg-subtle)',
              }}
            >
              {atCap ? COPY.invite.seatsFull : COPY.invite.seatsLeft(left)}
            </span>
          </div>
        </div>

        {/* At cap the sheet still opens and still says why: a control that
            silently does nothing is worse than one that explains itself. */}
        {atCap ? (
          <CrewNotice
            tone="warning"
            eyebrow={COPY.empty.atCapEyebrow}
            title={COPY.empty.atCapTitle}
            body={COPY.empty.atCapBody}
          />
        ) : (
          <>
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-ui)',
                fontSize: 13.5,
                lineHeight: 1.5,
                color: 'var(--fg-muted)',
              }}
            >
              {COPY.invite.sub(crewName)}
            </p>

            <div className="flex items-center gap-2">
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flex: 1,
                  minWidth: 0,
                  minHeight: 48,
                  padding: '0 6px 0 13px',
                  borderRadius: 10,
                  background: 'var(--surface-1)',
                  border: `1px solid var(--${copied ? 'signal' : 'border-strong'})`,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11.5,
                  color: 'var(--fg-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textDecoration: revoked ? 'line-through' : 'none',
                  opacity: revoked ? 0.5 : 1,
                }}
              >
                {invite === null ? '' : inviteUrl(invite.token)}
              </span>
              <button
                type="button"
                onClick={onCopy}
                disabled={invite === null || revoked || busy}
                className="cursor-pointer"
                style={{
                  ...ghost,
                  background: copied ? 'transparent' : 'var(--signal)',
                  border: copied ? ghost.border : 'none',
                  color: copied ? 'var(--signal)' : 'var(--fg-on-accent)',
                }}
              >
                {copied ? COPY.invite.copied : COPY.invite.copy}
              </button>
            </div>

            {invite !== null && !revoked && (
              <div className="flex flex-col gap-1">
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9.5,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    color: 'var(--fg-subtle)',
                  }}
                >
                  {COPY.invite.expiry(daysUntil(invite.expiresAt))}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: 12,
                    lineHeight: 1.45,
                    color: 'var(--fg-subtle)',
                  }}
                >
                  {COPY.invite.expiryHelp}
                </span>
              </div>
            )}

            {revoked && (
              <p
                role="status"
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-ui)',
                  fontSize: 13,
                  color: 'var(--fg-muted)',
                }}
              >
                {COPY.invite.revoked}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {!revoked && invite !== null && (
                <button
                  type="button"
                  onClick={() => void onRevoke()}
                  disabled={busy}
                  className="cursor-pointer"
                  style={ghost}
                >
                  {COPY.invite.revoke}
                </button>
              )}
              <button
                type="button"
                onClick={() => void onNewLink()}
                disabled={busy}
                className="cursor-pointer"
                style={
                  revoked
                    ? {
                        ...ghost,
                        background: 'var(--signal)',
                        border: 'none',
                        color: 'var(--fg-on-accent)',
                      }
                    : ghost
                }
              >
                {COPY.invite.newLink}
              </button>
            </div>

            {/* The button's own label change is not announced, so the copy
                result gets a live region of its own. */}
            <div role="status" aria-live="polite" className="sr-only">
              {copied ? COPY.invite.copied : ''}
            </div>
          </>
        )}

        {failed && (
          <p
            role="alert"
            style={{
              margin: 0,
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              color: 'var(--warning)',
            }}
          >
            {COPY.invite.failed}
          </p>
        )}
      </div>
    </ModalShell>
  )
}

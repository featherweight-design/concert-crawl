'use client'

import { useEffect, useId, useState } from 'react'
import type { CrewMember } from '@concert-crawl/types'

import { ModalShell } from '@/components/consumer/modal-shell'
import { CrewPatch } from '@/components/consumer/crew-patch'
import { MemberDot } from './MemberCluster'
import { CREWS_COPY } from './definitions/copy'

const COPY = CREWS_COPY

/**
 * The five destructive shapes. `handoff` and `last` are never chosen by the
 * client: they are what the leave call's typed 409 code resolves to, so the
 * client and the server cannot disagree about whether a handoff is required.
 */
export type ConfirmKind = 'leave' | 'remove' | 'delete' | 'handoff' | 'last'

interface LeaveConfirmProps {
  kind: ConfirmKind | null
  onClose: () => void
  crewName: string
  crewId: string
  patchSalt: number
  /** Only meaningful for `remove`. */
  target: CrewMember | null
  /** Candidates for `handoff` — everyone but you. */
  members: CrewMember[]
  /** `newKeeperId` is passed only on the handoff kind. */
  onConfirm: (newKeeperId?: string) => Promise<void>
  /** The `last` kind's escape hatch: invite someone instead of deleting. */
  onInvite: () => void
}

interface Body {
  title: string
  body: string
  cta: string
  danger: boolean
}

const bodyFor = (
  kind: ConfirmKind,
  crewName: string,
  targetLabel: string,
): Body => {
  switch (kind) {
    case 'leave':
      return {
        title: COPY.confirm.leaveTitle(crewName),
        body: COPY.confirm.leaveBody,
        cta: COPY.confirm.leaveCta,
        danger: true,
      }
    case 'remove':
      return {
        title: COPY.confirm.removeTitle(targetLabel),
        body: COPY.confirm.removeBody,
        cta: COPY.confirm.removeCta,
        danger: true,
      }
    case 'delete':
      return {
        title: COPY.confirm.deleteTitle(crewName),
        body: COPY.confirm.deleteBody,
        cta: COPY.confirm.deleteCta,
        danger: true,
      }
    case 'handoff':
      return {
        title: COPY.confirm.handoffTitle,
        body: COPY.confirm.handoffBody,
        cta: COPY.confirm.handoffCta,
        // Passing the crew on is not destructive; it is the step that makes
        // leaving possible.
        danger: false,
      }
    case 'last':
      return {
        title: COPY.confirm.lastOneTitle(crewName),
        body: COPY.confirm.lastOneBody,
        cta: COPY.confirm.lastOneCta,
        danger: true,
      }
  }
}

export const LeaveConfirm = ({
  kind,
  onClose,
  crewName,
  crewId,
  patchSalt,
  target,
  members,
  onConfirm,
  onInvite,
}: LeaveConfirmProps) => {
  const titleId = useId()
  const bodyId = useId()
  const [picked, setPicked] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  const [failed, setFailed] = useState(false)

  // Resets on every kind change, not just on close: a keeper's `leave` comes
  // back 409 and swaps the kind to `handoff` or `last` without unmounting, so
  // leaving `working` set would disable the confirm the swap just opened.
  useEffect(() => {
    setPicked(null)
    setWorking(false)
    setFailed(false)
  }, [kind])

  if (kind === null) return null

  const targetLabel =
    target?.handle !== null && target?.handle !== undefined && target.handle
      ? target.handle
      : COPY.roster.noHandle
  const copy = bodyFor(kind, crewName, targetLabel)
  const blocked = kind === 'handoff' && picked === null

  const onSubmit = async () => {
    if (working || blocked) return
    setWorking(true)
    setFailed(false)
    try {
      await onConfirm(
        kind === 'handoff' && picked !== null ? picked : undefined,
      )
    } catch (err) {
      console.error('LeaveConfirm: the action did not go through', err)
      setFailed(true)
      setWorking(false)
    }
  }

  return (
    <ModalShell
      open
      onClose={onClose}
      role="alertdialog"
      ariaLabel={copy.title}
      ariaLabelledBy={titleId}
      ariaDescribedBy={bodyId}
      sheetHeight="short"
      desktopWidth={480}
    >
      <div className="flex flex-col gap-4 pb-2">
        {/* The `last` kind is the only one that shows the crew itself: it is
            the thing about to stop existing. */}
        {kind === 'last' && (
          <div className="flex items-center gap-3">
            <CrewPatch
              crewId={crewId}
              patchSalt={patchSalt}
              size={44}
              scale="tile"
            />
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
          </div>
        )}

        <h2
          id={titleId}
          style={{
            margin: 0,
            fontFamily: 'var(--font-ui)',
            fontSize: 19,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: 'var(--fg)',
          }}
        >
          {copy.title}
        </h2>
        <p
          id={bodyId}
          style={{
            margin: 0,
            fontFamily: 'var(--font-ui)',
            fontSize: 13.5,
            lineHeight: 1.5,
            color: 'var(--fg-muted)',
          }}
        >
          {copy.body}
        </p>

        {kind === 'handoff' && (
          <div
            role="radiogroup"
            aria-labelledby={titleId}
            className="flex flex-col"
          >
            {members.map((member) => {
              const named = member.handle !== null && member.handle !== ''
              return (
                <label
                  key={member.userId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    minHeight: 52,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="crew-new-keeper"
                    value={member.userId}
                    checked={picked === member.userId}
                    onChange={() => setPicked(member.userId)}
                  />
                  <MemberDot member={member} size={30} />
                  <span
                    style={{
                      fontFamily: 'var(--font-ui)',
                      fontSize: 14,
                      fontWeight: named ? 700 : 600,
                      color: named ? 'var(--fg)' : 'var(--fg-subtle)',
                    }}
                  >
                    {named && member.handle !== null
                      ? member.handle
                      : COPY.roster.noHandle}
                  </span>
                </label>
              )
            })}
          </div>
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
            {COPY.confirm.failed}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={working || blocked}
            className="flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-lg disabled:cursor-default"
            style={{
              background: copy.danger ? 'var(--danger)' : 'var(--signal)',
              color: 'var(--fg-on-accent)',
              border: 'none',
              opacity: blocked ? 0.5 : 1,
              fontFamily: 'var(--font-ui)',
              fontSize: 13.5,
              fontWeight: 700,
            }}
          >
            {working ? COPY.confirm.working : copy.cta}
          </button>
          {kind === 'last' && (
            <button
              type="button"
              onClick={onInvite}
              className="flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-lg"
              style={{
                background: 'transparent',
                border: '1px solid var(--border-strong)',
                color: 'var(--fg)',
                fontFamily: 'var(--font-ui)',
                fontSize: 13.5,
                fontWeight: 700,
              }}
            >
              {COPY.confirm.lastOneAlt}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-lg"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--fg-muted)',
              fontFamily: 'var(--font-ui)',
              fontSize: 13.5,
              fontWeight: 700,
            }}
          >
            {COPY.confirm.never}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

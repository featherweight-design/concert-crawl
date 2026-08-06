'use client'

// The crew home. It owns the tab selection and every sheet, so the hero, the
// tabs and the destructive flows can never disagree about which crew they are
// acting on.

import { useEffect, useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import {
  CREW_HANDOFF_REQUIRED_CODE,
  CREW_LAST_MEMBER_CODE,
  type CrewDetail,
  type CrewMember,
} from '@concert-crawl/types'

import { ApiError } from '@/lib/api'
import { deleteCrew, handoffCrew, leaveCrew, removeMember } from '@/lib/crews'
import { useIsMobileViewport } from '@/lib/hooks/useIsMobileViewport'
import { CrewHero } from './CrewHero'
import { CrewTabs, panelId, tabId, type CrewTab } from './CrewTabs'
import { CrewUpcoming } from './CrewUpcoming'
import { CrewNights } from './CrewNights'
import { CrewRoster } from './CrewRoster'
import { CrewNotice } from './CrewNotice'
import { CrewOptionsSheet } from './CrewOptionsSheet'
import { InviteSheet } from './InviteSheet'
import { RerollSheet } from './RerollSheet'
import { LeaveConfirm, type ConfirmKind } from './LeaveConfirm'
import { CREWS_COPY } from './definitions/copy'

const COPY = CREWS_COPY

export type CrewTabId = 'upcoming' | 'nights' | 'roster'

interface CrewHomeProps {
  crew: CrewDetail
}

const control: React.CSSProperties = {
  minHeight: 44,
  padding: '0 16px',
  borderRadius: 999,
  fontFamily: 'var(--font-ui)',
  fontSize: 13,
  fontWeight: 700,
}

/**
 * Which tab opens. Coming up when there is something in it, otherwise Been
 * there when there is history, otherwise the roster — the sibling of #1357's
 * tense split, so a quiet crew never opens on an empty state it can't fix.
 */
export const leadTabFor = (crew: CrewDetail): CrewTabId =>
  crew.upcoming.length > 0
    ? 'upcoming'
    : crew.nights.length > 0
      ? 'nights'
      : 'roster'

export const CrewHome = ({ crew }: CrewHomeProps) => {
  const router = useRouter()
  const { getToken } = useAuth()
  const wide = !useIsMobileViewport()
  const prefix = useId()

  // `chosen` is an override, never a copy of the server state: it is null
  // until the customer picks a tab, so a refetch that changes the lead tab
  // still lands where it should.
  const [chosen, setChosen] = useState<CrewTabId | null>(null)
  const [saltOverride, setSaltOverride] = useState<number | null>(null)
  const [removedIds, setRemovedIds] = useState<string[]>([])
  const [options, setOptions] = useState(false)
  const [invite, setInvite] = useState(false)
  const [reroll, setReroll] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null)
  const [target, setTarget] = useState<CrewMember | null>(null)

  // A removal override lives only until the server agrees, exactly like the
  // salt below. Left to accumulate it would still be hiding the same person
  // after they were invited back, since the id it is keyed by outlives the
  // membership it stands for.
  useEffect(() => {
    setRemovedIds((ids) => {
      const pending = ids.filter((id) =>
        crew.members.some((member) => member.userId === id),
      )
      return pending.length === ids.length ? ids : pending
    })
  }, [crew.members])

  const active = chosen ?? leadTabFor(crew)
  // Both overrides clear on the SERVER value catching up rather than on the
  // mutation resolving — dropping them at mutation time flashes the old value
  // back for a frame.
  const patchSalt =
    saltOverride !== null && saltOverride !== crew.patchSalt
      ? saltOverride
      : crew.patchSalt
  // Keeper first. Everyone else keeps the order the API sent, which is joinedAt
  // ascending — a stable sort is what preserves it, so this comparator must stay
  // a pure isKeeper test rather than gain a tiebreak. Sorting here rather than in
  // the query keeps the roster stable through a handoff, which moves the badge
  // without moving anyone's join date.
  const members = crew.members
    .filter((member) => !removedIds.includes(member.userId))
    .sort((one, two) => Number(two.isKeeper) - Number(one.isKeeper))
  const memberCount = members.length
  const viewerId = members.find((member) => member.isYou)?.userId ?? null
  const others = members.filter((member) => !member.isYou)

  const tabs: CrewTab[] = [
    {
      id: 'upcoming',
      label: COPY.detail.upcomingTitle,
      count: crew.upcoming.length,
    },
    { id: 'nights', label: COPY.detail.pastTitle, count: crew.nights.length },
    { id: 'roster', label: COPY.detail.rosterTitle, count: memberCount },
  ]

  const asTabId = (id: string): CrewTabId =>
    id === 'nights' ? 'nights' : id === 'roster' ? 'roster' : 'upcoming'

  const onConfirm = async (newKeeperId?: string) => {
    const token = await getToken()
    if (token === null) throw new Error('Not signed in')
    if (confirm === 'remove') {
      if (target === null) return
      await removeMember(token, crew.id, target.userId)
      setRemovedIds((prev) => [...prev, target.userId])
      setConfirm(null)
      router.refresh()
      return
    }
    if (confirm === 'handoff') {
      if (newKeeperId === undefined) return
      await handoffCrew(token, crew.id, newKeeperId)
      // The handoff is only ever reached on the way out, so leaving is the
      // next step rather than a second trip through the menu.
      await leaveCrew(token, crew.id)
      router.push('/crews')
      return
    }
    if (confirm === 'delete' || confirm === 'last') {
      await deleteCrew(token, crew.id)
      router.push('/crews')
      return
    }
    // `leave` is the only kind that can come back 409, and the code it
    // carries is what selects the next confirm.
    try {
      await leaveCrew(token, crew.id)
      router.push('/crews')
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        if (err.code === CREW_HANDOFF_REQUIRED_CODE) {
          setConfirm('handoff')
          return
        }
        if (err.code === CREW_LAST_MEMBER_CODE) {
          setConfirm('last')
          return
        }
      }
      throw err
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5 px-4 pb-10 pt-5">
      <CrewHero
        crewId={crew.id}
        name={crew.name}
        patchSalt={patchSalt}
        memberCount={memberCount}
        isKeeper={crew.isKeeper}
        muted={crew.muted}
        wide={wide}
        actions={
          <>
            {/* Reachable at cap too: the sheet is where the reason lives. */}
            <button
              type="button"
              onClick={() => setInvite(true)}
              className="cursor-pointer"
              style={{
                ...control,
                background: 'var(--signal)',
                color: 'var(--fg-on-accent)',
                border: 'none',
              }}
            >
              {COPY.detail.invite}
            </button>
            <button
              type="button"
              onClick={() => setOptions(true)}
              aria-label={COPY.a11y.options}
              className="cursor-pointer"
              style={{
                ...control,
                background: 'transparent',
                border: '1px solid var(--border-strong)',
                color: 'var(--fg)',
              }}
            >
              {COPY.detail.options}
            </button>
          </>
        }
      />

      {/* A crew of one is quiet, not empty: the hero and both tabs stay. */}
      {memberCount === 1 && (
        <CrewNotice
          eyebrow={COPY.empty.crewOfOneEyebrow}
          title={COPY.empty.crewOfOneTitle}
          body={COPY.empty.crewOfOneBody}
        >
          <button
            type="button"
            onClick={() => setInvite(true)}
            className="w-fit cursor-pointer"
            style={{
              ...control,
              marginTop: 4,
              background: 'var(--signal)',
              color: 'var(--fg-on-accent)',
              border: 'none',
            }}
          >
            {COPY.detail.invite}
          </button>
        </CrewNotice>
      )}

      <CrewTabs
        tabs={tabs}
        active={active}
        onSelect={(id) => setChosen(asTabId(id))}
        label={COPY.detail.tabsLabel}
        idPrefix={prefix}
        wide={wide}
      />

      <div
        role="tabpanel"
        id={panelId(prefix, active)}
        aria-labelledby={tabId(prefix, active)}
        tabIndex={0}
      >
        {active === 'upcoming' && (
          <CrewUpcoming shows={crew.upcoming} wide={wide} />
        )}
        {active === 'nights' && (
          <CrewNights shows={crew.nights} wide={wide} viewerId={viewerId} />
        )}
        {active === 'roster' && (
          <CrewRoster
            members={members}
            memberCount={memberCount}
            isKeeper={crew.isKeeper}
            onRemove={(member) => {
              setTarget(member)
              setConfirm('remove')
            }}
            onLeave={() => setConfirm('leave')}
          />
        )}
      </div>

      <CrewOptionsSheet
        open={options}
        onClose={() => setOptions(false)}
        isKeeper={crew.isKeeper}
        onInvite={() => setInvite(true)}
        onReroll={() => setReroll(true)}
        onLeave={() => setConfirm('leave')}
        onDelete={() => setConfirm('delete')}
      />

      <InviteSheet
        open={invite}
        onClose={() => setInvite(false)}
        crewId={crew.id}
        crewName={crew.name}
        patchSalt={patchSalt}
        memberCount={memberCount}
      />

      <RerollSheet
        open={reroll}
        onClose={() => setReroll(false)}
        crewId={crew.id}
        patchSalt={patchSalt}
        onApplied={(next) => {
          setSaltOverride(next)
          router.refresh()
        }}
      />

      <LeaveConfirm
        kind={confirm}
        onClose={() => setConfirm(null)}
        crewName={crew.name}
        crewId={crew.id}
        patchSalt={patchSalt}
        target={target}
        members={others}
        onConfirm={onConfirm}
        onInvite={() => {
          setConfirm(null)
          setInvite(true)
        }}
      />
    </div>
  )
}

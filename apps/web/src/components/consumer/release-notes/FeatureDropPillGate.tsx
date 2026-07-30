'use client'

import { useCallback, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { usePathname, useRouter } from 'next/navigation'
import { RELEASES } from '@/lib/definitions/releases'
import { useReleaseReadState } from './useReleaseReadState'
import { FeatureDropPill } from './FeatureDropPill'
import { SpotlightModal } from './SpotlightModal'

const LATEST = RELEASES[0]

export function FeatureDropPillGate() {
  const pathname = usePathname()
  const router = useRouter()
  const { isLoaded, isSignedIn } = useAuth()

  const latestVersion = LATEST?.version ?? ''
  const { pillDismissed, dismissPill } = useReleaseReadState(latestVersion)

  const [modalOpen, setModalOpen] = useState(false)

  // The pill's read state is per-account, and the spotlight it opens is a
  // "what's new for you" beat — meaningless to someone who has never been in.
  const hidden =
    !isLoaded ||
    !isSignedIn ||
    pathname === '/changelog' ||
    pathname.startsWith('/admin')

  const handleOpen = useCallback(() => setModalOpen(true), [])
  const handleClose = useCallback(() => setModalOpen(false), [])
  const handleDismiss = useCallback(() => dismissPill(), [dismissPill])

  const handleCTA = useCallback(() => {
    if (!LATEST?.spotlight?.ctaHref) return
    setModalOpen(false)
    void router.push(LATEST.spotlight.ctaHref)
  }, [router])

  if (!LATEST?.spotlight || pillDismissed || hidden) return null

  return (
    <>
      <div className="fixed bottom-[72px] right-5 sm:bottom-5 z-[80]">
        <FeatureDropPill
          release={LATEST}
          variant="desktop"
          onOpen={handleOpen}
          onDismiss={handleDismiss}
        />
      </div>

      {modalOpen && (
        <SpotlightModal
          release={LATEST}
          onClose={handleClose}
          onCTA={handleCTA}
        />
      )}
    </>
  )
}

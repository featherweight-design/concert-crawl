'use client'

import { useCallback, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { RELEASES } from '@/lib/definitions/releases'
import { useReleaseReadState } from './useReleaseReadState'
import { FeatureDropPill } from './FeatureDropPill'
import { SpotlightModal } from './SpotlightModal'

const LATEST = RELEASES[0]

export function FeatureDropPillGate() {
  const pathname = usePathname()
  const router = useRouter()

  const latestVersion = LATEST?.version ?? ''
  const { pillDismissed, dismissPill } = useReleaseReadState(latestVersion)

  const [modalOpen, setModalOpen] = useState(false)

  const hidden = pathname === '/changelog' || pathname.startsWith('/admin')

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
      <div
        style={{
          position: 'fixed',
          right: 20,
          bottom: 20,
          zIndex: 80,
        }}
        className="sm:bottom-5 sm:right-5 bottom-[72px]"
      >
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

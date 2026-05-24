'use client'

import { useEffect, useState } from 'react'
import { AddVenueModal } from '@/components/admin/AddVenueModal'

export function MobileAddVenueButton() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    setShow(mq.matches)
    const handler = (evt: MediaQueryListEvent) => setShow(evt.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  if (!show) return null
  return <AddVenueModal fullWidth />
}

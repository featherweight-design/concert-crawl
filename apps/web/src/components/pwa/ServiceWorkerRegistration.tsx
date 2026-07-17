'use client'

import { useEffect } from 'react'

export const ServiceWorkerRegistration = () => {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV !== 'production') return

    const register = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      } catch (err) {
        // Registration failures must never break the app shell.
        console.error('Service worker registration failed', err)
      }
    }

    void register()
  }, [])

  return null
}

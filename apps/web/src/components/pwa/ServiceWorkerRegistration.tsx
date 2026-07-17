'use client'

import { useEffect } from 'react'

export const ServiceWorkerRegistration = () => {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // In non-production, a service worker registered by an earlier local prod
    // build keeps controlling this origin and serving stale caches under
    // `next dev`. Proactively unregister so dev never runs against a stale SW.
    if (process.env.NODE_ENV !== 'production') {
      void (async () => {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations()
          await Promise.all(registrations.map((reg) => reg.unregister()))
        } catch (err) {
          console.error('Service worker cleanup failed', err)
        }
      })()
      return
    }

    void (async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      } catch (err) {
        // Registration failures must never break the app shell.
        console.error('Service worker registration failed', err)
      }
    })()
  }, [])

  return null
}

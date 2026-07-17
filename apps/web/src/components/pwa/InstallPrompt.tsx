'use client'

import { useEffect, useState } from 'react'
import {
  isIosSafari,
  isStandalone,
  type BeforeInstallPromptEvent,
} from '@/lib/pwa/beforeinstallprompt'
import { PWA_COPY } from './definitions/copy'

const DISMISS_KEY = 'cc-install-dismissed'

export const InstallPrompt = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  )
  const [showIosHint, setShowIosHint] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (isStandalone()) return
    setDismissed(localStorage.getItem(DISMISS_KEY) === '1')

    const onPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault()
      setDeferred(event)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    if (isIosSafari()) setShowIosHint(true)

    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  const install = async () => {
    if (!deferred) return
    try {
      await deferred.prompt()
      await deferred.userChoice
    } catch (err) {
      console.error('Install prompt failed', err)
    } finally {
      setDeferred(null)
    }
  }

  if (dismissed) return null
  if (!deferred && !showIosHint) return null

  return (
    <div
      role="region"
      aria-label={PWA_COPY.install}
      className="fixed inset-x-4 bottom-4 z-50 flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 p-3 shadow-lg"
    >
      <span className="text-sm text-fg">
        {deferred ? PWA_COPY.install : PWA_COPY.installIosHint}
      </span>
      <div className="flex items-center gap-2">
        {deferred && (
          <button
            type="button"
            onClick={install}
            className="inline-flex min-h-[44px] items-center rounded-md bg-accent px-4 py-2 text-sm text-fg-on-accent"
          >
            {PWA_COPY.install}
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label={PWA_COPY.dismiss}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md px-3 py-2 text-sm text-fg-muted"
        >
          {PWA_COPY.dismiss}
        </button>
      </div>
    </div>
  )
}

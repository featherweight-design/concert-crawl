'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { apiClient } from '@/lib/api'

type Notification = {
  id: string
  category: string
  title: string
  body: string
  actionUrl: string | null
  readAt: string | null
  createdAt: string
}

export const NotificationBell = () => {
  const { getToken } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const token = await getToken()
      if (!token) return
      const data = await apiClient.get<Notification[]>(
        '/v1/admin/notifications?limit=20',
        token,
      )
      setNotifications(data ?? [])
    } catch {
      // Network errors are non-fatal for the bell
    }
  }, [getToken])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const markAsRead = async (id: string) => {
    try {
      const token = await getToken()
      if (!token) return
      await apiClient.patch(`/v1/admin/notifications/${id}/read`, token, {})
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === id
            ? { ...notif, readAt: new Date().toISOString() }
            : notif,
        ),
      )
    } catch (err) {
      console.error('Failed to mark notification as read', err)
    }
  }

  const markAllRead = async () => {
    try {
      const token = await getToken()
      if (!token) return
      await apiClient.post('/v1/admin/notifications/read-all', token, {})
      setNotifications((prev) =>
        prev.map((notif) => ({
          ...notif,
          readAt: notif.readAt ?? new Date().toISOString(),
        })),
      )
    } catch (err) {
      console.error('Failed to mark all notifications as read', err)
    }
  }

  const unreadCount = notifications.filter(
    (notif) => notif.readAt === null,
  ).length

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative inline-flex items-center justify-center rounded-md px-2 py-1.5 text-sm hover:bg-surface-2 hover:text-fg"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="text-base">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[10px] font-medium text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-80 rounded-lg border border-border bg-surface-1 shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-medium text-fg">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-fg-muted hover:text-fg"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-fg-muted">
                No notifications
              </p>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`border-b border-border/50 px-4 py-3 last:border-0 ${
                    notif.readAt === null ? 'bg-surface-2' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-fg">
                        {notif.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-fg-muted">
                        {notif.body}
                      </p>
                    </div>
                    {notif.readAt === null && (
                      <button
                        type="button"
                        onClick={() => markAsRead(notif.id)}
                        className="shrink-0 text-xs text-fg-muted hover:text-fg"
                        aria-label="Mark as read"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {notif.actionUrl && (
                    <a
                      href={notif.actionUrl}
                      className="mt-1 text-xs text-brand hover:underline"
                    >
                      View →
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

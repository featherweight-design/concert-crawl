'use client'

import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { type AllEvent } from './types'

const COPY = ADMIN_COPY.review.allEvents.rowMenu

export interface EventRowActions {
  onViewDetail: (event: AllEvent) => void
  onEdit: (event: AllEvent) => void
  onVerify: (event: AllEvent) => void
  onSendBackToReview: (event: AllEvent) => void
  onMarkPostponed: (event: AllEvent) => void
  onMarkCancelled: (event: AllEvent) => void
  onMarkUpcoming: (event: AllEvent) => void
  onMarkSoldOut: (event: AllEvent) => void
  onMarkAvailable: (event: AllEvent) => void
  onRequestMarkNonConcert: (event: AllEvent) => void
  onRequestDelete: (event: AllEvent) => void
}

export interface EventRowMenuProps {
  event: AllEvent
  actions: EventRowActions
}

interface MenuItem {
  label: string
  destructive?: boolean
  onClick: () => void
}

const buildItems = (event: AllEvent, actions: EventRowActions): MenuItem[] => {
  const items: MenuItem[] = [
    { label: COPY.viewDetail, onClick: () => actions.onViewDetail(event) },
    { label: COPY.edit, onClick: () => actions.onEdit(event) },
  ]
  items.push(
    event.verified
      ? {
          label: COPY.sendBackToReview,
          onClick: () => actions.onSendBackToReview(event),
        }
      : { label: COPY.verify, onClick: () => actions.onVerify(event) },
  )
  if (event.status !== 'postponed') {
    items.push({
      label: COPY.markPostponed,
      onClick: () => actions.onMarkPostponed(event),
    })
  }
  if (event.status !== 'cancelled') {
    items.push({
      label: COPY.markCancelled,
      onClick: () => actions.onMarkCancelled(event),
    })
  }
  if (event.status !== 'upcoming') {
    items.push({
      label: COPY.markUpcoming,
      onClick: () => actions.onMarkUpcoming(event),
    })
  }
  items.push(
    event.isSoldOut
      ? {
          label: COPY.markAvailable,
          onClick: () => actions.onMarkAvailable(event),
        }
      : {
          label: COPY.markSoldOut,
          onClick: () => actions.onMarkSoldOut(event),
        },
  )
  items.push({
    label: COPY.markNonConcert,
    onClick: () => actions.onRequestMarkNonConcert(event),
  })
  items.push({
    label: COPY.delete,
    destructive: true,
    onClick: () => actions.onRequestDelete(event),
  })
  return items
}

export const EventRowMenu = ({ event, actions }: EventRowMenuProps) => {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return undefined
    const handleClick = (evt: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(evt.target as Node)
      ) {
        setOpen(false)
      }
    }
    const handleEscape = (evt: KeyboardEvent) => {
      if (evt.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', handleClick)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('mousedown', handleClick)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const items = buildItems(event, actions)

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <button
        type="button"
        aria-label={COPY.triggerAriaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(evt) => {
          evt.stopPropagation()
          setOpen((prev) => !prev)
        }}
        style={{
          border: 'none',
          background: open ? 'var(--surface-2)' : 'transparent',
          cursor: 'pointer',
          padding: 7,
          borderRadius: 7,
          color: open ? 'var(--fg)' : 'var(--fg-muted)',
          display: 'inline-flex',
        }}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            zIndex: 50,
            minWidth: 220,
            padding: 6,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow:
              '0 16px 40px rgba(0,0,0,0.30), 0 2px 8px rgba(0,0,0,0.16)',
          }}
        >
          {items.map((item, idx) => {
            const isDivider = idx === items.length - 1 && item.destructive
            return (
              <div key={item.label}>
                {isDivider && (
                  <div
                    style={{
                      height: 1,
                      background: 'var(--border)',
                      margin: '4px 4px',
                    }}
                  />
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={(evt) => {
                    evt.stopPropagation()
                    setOpen(false)
                    item.onClick()
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: '8px 10px',
                    borderRadius: 6,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 13,
                    color: item.destructive ? 'var(--danger)' : 'var(--fg)',
                  }}
                >
                  {item.label}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

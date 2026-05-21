'use client'

import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { MonoLabel, AdminButton } from '@/components/admin/primitives'
import type { FeedbackItem } from './FeedbackRow'

interface FeedbackExpandedProps {
  item: FeedbackItem
  onStatusChange: (id: string, status: FeedbackItem['status']) => void
  onNotesChange: (id: string, notes: string) => void
}

export function FeedbackExpanded({
  item,
  onStatusChange,
  onNotesChange,
}: FeedbackExpandedProps) {
  const [notes, setNotes] = useState(item.adminNotes ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const isUnread = item.status === 'unread'

  const handleNotesBlur = async () => {
    if (notes === (item.adminNotes ?? '')) return
    setIsSaving(true)
    try {
      await onNotesChange(item.id, notes)
    } finally {
      setIsSaving(false)
    }
  }

  const metaEntries = item.metadata
    ? Object.entries(item.metadata).filter(([, val]) => val != null)
    : []

  return (
    <div
      style={{
        padding: '4px 22px 18px 22px',
        background: 'var(--bg-elevated)',
        borderTop: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
          gap: 20,
          marginTop: 12,
        }}
      >
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <MonoLabel>full body</MonoLabel>
            <div
              style={{
                padding: '14px 16px',
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 13,
                lineHeight: 1.6,
                color: 'var(--fg)',
                marginTop: 6,
              }}
            >
              {item.message}
            </div>
          </div>

          <div>
            <MonoLabel>admin notes</MonoLabel>
            <textarea
              value={notes}
              onChange={(ev) => setNotes(ev.target.value)}
              onBlur={() => void handleNotesBlur()}
              placeholder="Internal notes…"
              rows={3}
              style={{
                display: 'block',
                width: '100%',
                marginTop: 6,
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--border-strong)',
                background: 'var(--bg-elevated)',
                fontSize: 12,
                lineHeight: 1.5,
                color: 'var(--fg)',
                fontFamily: "'Inter', sans-serif",
                resize: 'vertical',
                opacity: isSaving ? 0.6 : 1,
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <MonoLabel>context</MonoLabel>
            <div
              style={{
                padding: '10px 14px',
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                marginTop: 6,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', gap: 8 }}>
                <span
                  style={{
                    width: 70,
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: 700,
                    color: 'var(--fg-subtle)',
                    flexShrink: 0,
                  }}
                >
                  page
                </span>
                <span
                  style={{
                    flex: 1,
                    fontWeight: 600,
                    color: 'var(--fg)',
                    wordBreak: 'break-all',
                  }}
                >
                  {item.pageUrl}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span
                  style={{
                    width: 70,
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: 700,
                    color: 'var(--fg-subtle)',
                    flexShrink: 0,
                  }}
                >
                  user
                </span>
                <span style={{ flex: 1, fontWeight: 600, color: 'var(--fg)' }}>
                  {item.userId}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span
                  style={{
                    width: 70,
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: 700,
                    color: 'var(--fg-subtle)',
                    flexShrink: 0,
                  }}
                >
                  category
                </span>
                <span style={{ flex: 1, fontWeight: 600, color: 'var(--fg)' }}>
                  {item.category}
                </span>
              </div>
              {metaEntries.map(([key, val]) => (
                <div key={key} style={{ display: 'flex', gap: 8 }}>
                  <span
                    style={{
                      width: 70,
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      fontWeight: 700,
                      color: 'var(--fg-subtle)',
                      flexShrink: 0,
                    }}
                  >
                    {key}
                  </span>
                  <span
                    style={{ flex: 1, fontWeight: 600, color: 'var(--fg)' }}
                  >
                    {String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {item.issueUrl ? (
            <div
              style={{
                padding: '12px 14px',
                background:
                  'color-mix(in oklab, var(--accent) 7%, transparent)',
                border:
                  '1px solid color-mix(in oklab, var(--accent) 32%, transparent)',
                borderRadius: 8,
              }}
            >
              <MonoLabel>linked issue</MonoLabel>
              <a
                href={item.issueUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 6,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--accent)',
                  textDecoration: 'none',
                }}
              >
                <ExternalLink size={12} />
                {item.issueUrl}
              </a>
            </div>
          ) : (
            <div
              style={{
                padding: '12px 14px',
                background: 'var(--surface-1)',
                border: '1px dashed var(--border-strong)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <MonoLabel>no linked issue</MonoLabel>
              <a
                href={`https://github.com/HartiganHM/concert-crawl/issues/new?title=${encodeURIComponent(`[${item.category}] ${item.message.slice(0, 60)}`)}&body=${encodeURIComponent(`User feedback:\n\n${item.message}\n\nPage: ${item.pageUrl}\nUser: ${item.userId}`)}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--signal)',
                  textDecoration: 'none',
                }}
              >
                Open in GitHub →
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Action shelf */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingTop: 12,
          marginTop: 14,
          borderTop: '1px solid var(--border)',
        }}
      >
        <AdminButton
          size="sm"
          variant="outline"
          onClick={() => onStatusChange(item.id, isUnread ? 'read' : 'unread')}
        >
          Mark {isUnread ? 'read' : 'unread'}
        </AdminButton>
        <AdminButton
          size="sm"
          variant="ghost"
          onClick={() => onStatusChange(item.id, 'flagged')}
        >
          Flag
        </AdminButton>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {item.status !== 'resolved' && (
            <AdminButton
              size="sm"
              variant="success"
              onClick={() => onStatusChange(item.id, 'resolved')}
            >
              Resolve
            </AdminButton>
          )}
          {item.status !== 'archived' && (
            <AdminButton
              size="sm"
              variant="ghost"
              onClick={() => onStatusChange(item.id, 'archived')}
            >
              Archive
            </AdminButton>
          )}
        </div>
      </div>
    </div>
  )
}

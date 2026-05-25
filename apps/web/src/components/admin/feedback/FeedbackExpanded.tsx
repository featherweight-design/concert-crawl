'use client'

import { useState } from 'react'
import {
  ExternalLink,
  Check,
  Flag,
  SquarePen,
  User,
  ChevronRight,
  X,
  LayoutGrid,
  Copy,
} from 'lucide-react'
import { MonoLabel } from '@/components/admin/primitives'
import type { FeedbackItem } from './FeedbackRow'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

const REPO = 'HartiganHM/concert-crawl'
const MT_TIMEZONE = 'America/Denver'

interface FeedbackExpandedProps {
  item: FeedbackItem
  onStatusChange: (id: string, status: FeedbackItem['status']) => void
  onNotesChange: (id: string, notes: string) => void
}

function buildGitHubIssueUrl(item: FeedbackItem): string {
  const meta = item.metadata ?? {}
  const route = (() => {
    try {
      return new URL(item.pageUrl).pathname
    } catch {
      return item.pageUrl
    }
  })()
  const title = `[${item.category}] ${item.message.slice(0, 72)}`
  const body = [
    `**User feedback:**`,
    item.message,
    ``,
    `**Context:**`,
    `- Route: ${route}`,
    meta['theme'] ? `- Theme: ${String(meta['theme'])}` : null,
    meta['build'] ? `- Build: ${String(meta['build'])}` : null,
    meta['userAgent'] ? `- Device: ${String(meta['userAgent'])}` : null,
    `- User ID: ${item.userId}`,
    `- Submitted: ${new Date(item.createdAt).toISOString()}`,
  ]
    .filter(Boolean)
    .join('\n')

  return `https://github.com/${REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&labels=${encodeURIComponent(`type: bug,source: beta-feedback,phase: beta,priority: normal`)}`
}

function formatSubmitted(iso: string): string {
  return (
    new Date(iso)
      .toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: MT_TIMEZONE,
      })
      .replace(',', '') + ' MT'
  )
}

const CONTEXT_ROW_STYLE: React.CSSProperties = {
  width: 80,
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  fontWeight: 700,
  color: 'var(--fg-subtle)',
  flexShrink: 0,
  paddingTop: 1,
}

const CONTEXT_VALUE_STYLE: React.CSSProperties = {
  flex: 1,
  fontWeight: 600,
  color: 'var(--fg)',
  wordBreak: 'break-all',
  lineHeight: 1.4,
}

export function FeedbackExpanded({
  item,
  onStatusChange,
  onNotesChange,
}: FeedbackExpandedProps) {
  const [notes, setNotes] = useState(item.adminNotes ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const isUnread = item.status === 'unread'
  const isFlagged = item.status === 'flagged'

  const handleNotesBlur = async () => {
    if (notes === (item.adminNotes ?? '')) return
    setIsSaving(true)
    try {
      await onNotesChange(item.id, notes)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCopyIssueUrl = async () => {
    if (!item.issueUrl) return
    try {
      await navigator.clipboard.writeText(item.issueUrl)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 1500)
    } catch {
      // clipboard write unavailable in this context
    }
  }

  const meta = item.metadata ?? {}
  const screenshot =
    (meta['screenshot'] as string | null | undefined) ??
    (meta['screenshotDataUrl'] as string | null | undefined)

  const route = (() => {
    try {
      return new URL(item.pageUrl).pathname
    } catch {
      return item.pageUrl
    }
  })()

  const ghUrl = buildGitHubIssueUrl(item)
  const handle = `@${item.userId.slice(0, 10)}`

  const contextRows: { label: string; value: string | null | undefined }[] = [
    {
      label: ADMIN_COPY.feedback.expanded.contextRowLabels.route,
      value: route,
    },
    {
      label: ADMIN_COPY.feedback.expanded.contextRowLabels.theme,
      value: meta['theme'] as string | undefined,
    },
    {
      label: ADMIN_COPY.feedback.expanded.contextRowLabels.build,
      value: meta['build'] as string | undefined,
    },
    {
      label: ADMIN_COPY.feedback.expanded.contextRowLabels.device,
      value: (meta['userAgent'] ?? meta['device']) as string | undefined,
    },
    {
      label: ADMIN_COPY.feedback.expanded.contextRowLabels.submitted,
      value: formatSubmitted(item.createdAt),
    },
    {
      label: ADMIN_COPY.feedback.expanded.contextRowLabels.userId,
      value: item.userId,
    },
  ]

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
        {/* Left column: Full Body + Screenshot + Admin Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Full Body */}
          <div>
            <MonoLabel>
              {ADMIN_COPY.feedback.expanded.sectionLabels.fullBody}
            </MonoLabel>
            <div
              style={{
                padding: '14px 16px',
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                lineHeight: 1.6,
                color: 'var(--fg)',
                marginTop: 8,
              }}
            >
              {item.message}
            </div>
          </div>

          {/* Screenshot */}
          <div>
            <MonoLabel>
              {ADMIN_COPY.feedback.expanded.sectionLabels.screenshot}
            </MonoLabel>
            <div
              style={{
                marginTop: 8,
                borderRadius: 8,
                overflow: 'hidden',
                border: '1px solid var(--border)',
                background: screenshot ? 'var(--surface-1)' : undefined,
                position: 'relative',
              }}
            >
              {screenshot ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={screenshot}
                    alt="User screenshot"
                    style={{
                      display: 'block',
                      width: '100%',
                      maxHeight: 240,
                      objectFit: 'cover',
                      objectPosition: 'top',
                    }}
                  />
                  <a
                    href={screenshot}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      position: 'absolute',
                      bottom: 8,
                      right: 8,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#F1E6D5',
                      background: 'rgba(0,0,0,0.55)',
                      backdropFilter: 'blur(4px)',
                      padding: '4px 8px',
                      borderRadius: 6,
                      textDecoration: 'none',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    <ExternalLink size={10} />
                    {ADMIN_COPY.feedback.expanded.openFullSize}
                  </a>
                </>
              ) : (
                <div
                  style={{
                    height: 160,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    background: `repeating-linear-gradient(
                      -45deg,
                      color-mix(in oklab, var(--border) 60%, transparent),
                      color-mix(in oklab, var(--border) 60%, transparent) 1px,
                      var(--surface-1) 1px,
                      var(--surface-1) 12px
                    )`,
                  }}
                >
                  <LayoutGrid
                    size={22}
                    color="var(--fg-subtle)"
                    style={{ opacity: 0.4 }}
                  />
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      color: 'var(--fg-subtle)',
                      textTransform: 'uppercase',
                      opacity: 0.6,
                    }}
                  >
                    {ADMIN_COPY.feedback.expanded.screenshotPlaceholder}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Admin Notes */}
          <div>
            <MonoLabel>
              {ADMIN_COPY.feedback.expanded.sectionLabels.adminNotes}
            </MonoLabel>
            <textarea
              value={notes}
              onChange={(ev) => setNotes(ev.target.value)}
              onBlur={() => void handleNotesBlur()}
              placeholder={ADMIN_COPY.feedback.expanded.adminNotesPlaceholder}
              rows={3}
              style={{
                display: 'block',
                width: '100%',
                marginTop: 8,
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

        {/* Right column: Context + Create Issue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Context */}
          <div>
            <MonoLabel>
              {ADMIN_COPY.feedback.expanded.sectionLabels.context}
            </MonoLabel>
            <div
              style={{
                padding: '10px 14px',
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                marginTop: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {contextRows.map(({ label, value }) =>
                value ? (
                  <div
                    key={label}
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'flex-start',
                    }}
                  >
                    <span style={CONTEXT_ROW_STYLE}>{label}</span>
                    <span style={CONTEXT_VALUE_STYLE}>{value}</span>
                  </div>
                ) : null,
              )}
            </div>
          </div>

          {/* Create / Linked Issue */}
          {item.issueUrl ? (
            <div>
              <MonoLabel color="var(--accent)">
                {ADMIN_COPY.feedback.expanded.sectionLabels.linkedIssue}
              </MonoLabel>
              <div
                style={{
                  padding: '12px 14px',
                  marginTop: 8,
                  background:
                    'color-mix(in oklab, var(--accent) 6%, var(--bg-elevated))',
                  border:
                    '1px solid color-mix(in oklab, var(--accent) 32%, transparent)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <a
                  href={item.issueUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--accent)',
                    textDecoration: 'none',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <ExternalLink size={12} style={{ flexShrink: 0 }} />
                  {item.issueUrl.replace('https://', '')}
                </a>
                <button
                  type="button"
                  onClick={() => void handleCopyIssueUrl()}
                  title={ADMIN_COPY.feedback.expanded.copyUrlTitle}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    border:
                      '1px solid color-mix(in oklab, var(--accent) 32%, transparent)',
                    background: 'transparent',
                    color: isCopied ? 'var(--success)' : 'var(--accent)',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {isCopied ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <MonoLabel>
                {ADMIN_COPY.feedback.expanded.sectionLabels.createIssue}
              </MonoLabel>
              <div
                style={{
                  padding: '14px',
                  marginTop: 8,
                  background: 'var(--bg-elevated)',
                  border: '1px dashed var(--border-strong)',
                  borderRadius: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    lineHeight: 1.55,
                    color: 'var(--fg-muted)',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {ADMIN_COPY.feedback.expanded.createIssuePrompt}
                </p>
                <a
                  href={ghUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    height: 32,
                    padding: '0 12px',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 500,
                    fontFamily: "'Inter', sans-serif",
                    color: 'var(--fg)',
                    background: 'transparent',
                    border: '1px solid var(--border-strong)',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <ExternalLink size={14} />
                  {ADMIN_COPY.feedback.expanded.openInGitHub}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action shelf */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
          paddingTop: 12,
          marginTop: 14,
          borderTop: '1px solid var(--border)',
        }}
      >
        {/* Left actions */}
        <button
          type="button"
          onClick={() => onStatusChange(item.id, isUnread ? 'read' : 'unread')}
          style={actionButtonStyle('outline')}
        >
          <Check size={13} />
          {isUnread
            ? ADMIN_COPY.feedback.expanded.actions.markRead
            : ADMIN_COPY.feedback.expanded.actions.markUnread}
        </button>

        <button
          type="button"
          onClick={() =>
            onStatusChange(item.id, isFlagged ? 'unread' : 'flagged')
          }
          style={actionButtonStyle('ghost')}
        >
          <Flag size={13} />
          {isFlagged
            ? ADMIN_COPY.feedback.expanded.actions.unflag
            : ADMIN_COPY.feedback.expanded.actions.flag}
        </button>

        <a
          href={ghUrl}
          target="_blank"
          rel="noreferrer"
          style={actionLinkStyle('ghost')}
        >
          <SquarePen size={13} />
          {ADMIN_COPY.feedback.expanded.actions.openInGitHub}
        </a>

        <a
          href={`/admin/users/${item.userId}`}
          style={actionLinkStyle('ghost')}
        >
          <User size={13} />
          View {handle}
          <ChevronRight size={12} />
        </a>

        {/* Right actions */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {item.status !== 'resolved' && (
            <button
              type="button"
              onClick={() => onStatusChange(item.id, 'resolved')}
              style={actionButtonStyle('success')}
            >
              <Check size={13} />
              {ADMIN_COPY.feedback.expanded.actions.resolve}
            </button>
          )}
          {item.status !== 'archived' && (
            <button
              type="button"
              onClick={() => onStatusChange(item.id, 'archived')}
              style={actionButtonStyle('ghost')}
            >
              <X size={13} />
              {ADMIN_COPY.feedback.expanded.actions.archive}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function actionButtonStyle(
  variant: 'outline' | 'ghost' | 'success',
): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    height: 28,
    padding: '0 10px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    fontFamily: "'Inter', sans-serif",
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    background: 'transparent',
  }
  if (variant === 'outline')
    return {
      ...base,
      color: 'var(--fg)',
      border: '1px solid var(--border-strong)',
    }
  if (variant === 'success')
    return {
      ...base,
      color: 'var(--success)',
      border: '1px solid rgba(47,122,77,0.3)',
      background: 'rgba(47,122,77,0.08)',
    }
  return { ...base, color: 'var(--fg-muted)', border: '1px solid transparent' }
}

function actionLinkStyle(_variant: 'ghost'): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    height: 28,
    padding: '0 10px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    fontFamily: "'Inter', sans-serif",
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    background: 'transparent',
    color: 'var(--fg-muted)',
    border: '1px solid transparent',
    textDecoration: 'none',
  }
}

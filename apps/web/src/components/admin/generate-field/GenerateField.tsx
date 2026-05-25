'use client'

import { Loader2, Sparkles, Check, AlertCircle } from 'lucide-react'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

export type GenerateFieldState =
  | 'idle'
  | 'loading'
  | 'review'
  | 'accepted'
  | 'error'

export interface GenerateFieldResult {
  content: string
  costUsd?: number
  tokensUsed?: number
  sources?: string[]
}

interface GenerateFieldProps {
  state: GenerateFieldState
  result?: GenerateFieldResult | undefined
  errorMessage?: string | undefined
  estimatedCostLabel?: string | undefined
  onGenerate: () => void
  onRegenerate?: () => void
  onCancel?: () => void
  onAccept: (content: string) => void
  onDiscard: () => void
}

export function GenerateField({
  state,
  result,
  errorMessage,
  estimatedCostLabel = '~$0.01',
  onGenerate,
  onRegenerate,
  onCancel,
  onAccept,
  onDiscard,
}: GenerateFieldProps) {
  if (state === 'idle') {
    return (
      <button
        type="button"
        onClick={onGenerate}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          borderRadius: 6,
          border:
            '1px solid color-mix(in oklab, var(--accent) 34%, transparent)',
          background:
            'color-mix(in oklab, var(--accent) 8%, var(--bg-elevated))',
          cursor: 'pointer',
          fontFamily: "'Inter', sans-serif",
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--accent)',
          letterSpacing: '-0.005em',
        }}
      >
        <Sparkles size={12} />
        {ADMIN_COPY.generateField.idle.generateButton}
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            opacity: 0.7,
            fontWeight: 600,
          }}
        >
          {estimatedCostLabel}
        </span>
      </button>
    )
  }

  if (state === 'loading') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '14px 16px',
          borderRadius: 8,
          border:
            '1px solid color-mix(in oklab, var(--signal) 28%, transparent)',
          background:
            'color-mix(in oklab, var(--signal) 6%, var(--bg-elevated))',
          fontFamily: "'Inter', sans-serif",
          fontSize: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Loader2
            size={14}
            color="var(--signal)"
            style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}
          />
          <span style={{ fontWeight: 600, color: 'var(--signal)' }}>
            {ADMIN_COPY.generateField.loading.label}
          </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: 'var(--fg-muted)',
            }}
          >
            {ADMIN_COPY.generateField.loading.estimatedTime}
          </span>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              padding: '0 4px',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--fg-muted)',
              flexShrink: 0,
            }}
          >
            {ADMIN_COPY.generateField.loading.cancel}
          </button>
        )}
      </div>
    )
  }

  if (state === 'review' && result) {
    return (
      <div
        style={{
          padding: '14px 16px',
          borderRadius: 8,
          border:
            '1px solid color-mix(in oklab, var(--accent) 32%, transparent)',
          background:
            'color-mix(in oklab, var(--accent) 6%, var(--bg-elevated))',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase' as const,
              color: 'var(--fg-subtle)',
            }}
          >
            {ADMIN_COPY.generateField.review.suggestedLabel}
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '1px 6px',
              borderRadius: 4,
              background: 'color-mix(in oklab, var(--accent) 16%, transparent)',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: 'var(--accent)',
              textTransform: 'uppercase' as const,
            }}
          >
            {ADMIN_COPY.generateField.review.llmBadge}
          </span>
          {(result.costUsd !== undefined ||
            result.tokensUsed !== undefined) && (
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: 'var(--fg-subtle)',
                marginLeft: 'auto',
              }}
            >
              {result.tokensUsed !== undefined && `${result.tokensUsed}t`}
              {result.costUsd !== undefined &&
                result.tokensUsed !== undefined &&
                ' · '}
              {result.costUsd !== undefined && `$${result.costUsd.toFixed(4)}`}
            </span>
          )}
        </div>

        {/* Content */}
        <p
          style={{
            margin: 0,
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            color: 'var(--fg)',
            lineHeight: 1.55,
          }}
        >
          {result.content}
        </p>

        {/* Sources */}
        {result.sources && result.sources.length > 0 && (
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              letterSpacing: '0.04em',
              color: 'var(--fg-subtle)',
            }}
          >
            <span style={{ opacity: 0.6 }}>
              {ADMIN_COPY.generateField.review.sourcesPrefix}
            </span>
            {result.sources.join(' · ')}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
          <button
            type="button"
            onClick={() => onAccept(result.content)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 10px',
              borderRadius: 6,
              border: 'none',
              background: 'var(--success)',
              color: 'var(--fg-on-accent)',
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Check size={11} />
            {ADMIN_COPY.generateField.review.accept}
          </button>
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                borderRadius: 6,
                border: '1px solid var(--border-strong)',
                background: 'transparent',
                color: 'var(--fg-muted)',
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {ADMIN_COPY.generateField.review.regenerate}
            </button>
          )}
          <button
            type="button"
            onClick={onDiscard}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '5px 10px',
              borderRadius: 6,
              border: '1px solid var(--border-strong)',
              background: 'transparent',
              color: 'var(--fg-muted)',
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {ADMIN_COPY.generateField.review.discard}
          </button>
        </div>
      </div>
    )
  }

  if (state === 'accepted') {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 10px',
          borderRadius: 20,
          border:
            '1px solid color-mix(in oklab, var(--success) 38%, transparent)',
          background:
            'color-mix(in oklab, var(--success) 5%, var(--bg-elevated))',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--success)',
          letterSpacing: '0.02em',
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--success)',
            flexShrink: 0,
          }}
        />
        {ADMIN_COPY.generateField.accepted.label}
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '14px 16px',
          borderRadius: 8,
          border:
            '1px solid color-mix(in oklab, var(--danger) 32%, transparent)',
          background:
            'color-mix(in oklab, var(--danger) 8%, var(--bg-elevated))',
          fontFamily: "'Inter', sans-serif",
          fontSize: 12,
          color: 'var(--danger)',
        }}
      >
        <AlertCircle size={13} />
        <span style={{ fontWeight: 600 }}>
          {errorMessage ?? ADMIN_COPY.generateField.error.fallback}
        </span>
        <button
          type="button"
          onClick={onGenerate}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase' as const,
            color: 'var(--danger)',
            marginLeft: 4,
            textDecoration: 'underline',
          }}
        >
          {ADMIN_COPY.generateField.error.retry}
        </button>
      </div>
    )
  }

  return null
}

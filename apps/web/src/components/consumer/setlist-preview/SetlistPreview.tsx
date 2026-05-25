'use client'

import { useState } from 'react'
import type { Setlist } from '@concert-crawl/types'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const copy = CONSUMER_COPY.setlistPreview

interface SetlistPreviewProps {
  setlist: Setlist | null | undefined
  defaultOpen?: boolean
  dense?: boolean
}

export function SetlistPreview({
  setlist,
  defaultOpen = false,
  dense = false,
}: SetlistPreviewProps) {
  const [open, setOpen] = useState(defaultOpen)

  if (!setlist || !setlist.songs || setlist.songs.length === 0) return null

  const previewCount = 3
  const hasEncore = setlist.encore && setlist.encore.length > 0

  return (
    <div
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
        padding: '0 14px',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          boxSizing: 'border-box',
          padding: dense ? '10px 0' : '12px 0',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--fg-subtle)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {copy.sectionLabel}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 13.5,
              fontWeight: 600,
              color: 'var(--fg)',
              marginTop: 2,
              letterSpacing: '-0.01em',
            }}
          >
            {open ? (
              `${setlist.songs.length} ${copy.songCountSuffix}`
            ) : (
              <>
                <span style={{ color: 'var(--fg-muted)' }}>
                  {setlist.songs.slice(0, previewCount).join(', ')}
                </span>
                {setlist.songs.length > previewCount && (
                  <span style={{ color: 'var(--fg-subtle)' }}>
                    {` +${setlist.songs.length - previewCount} ${copy.moreSuffix}`}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          aria-hidden
          style={{
            transform: `rotate(${open ? 180 : 0}deg)`,
            transition: 'transform 0.15s',
            flexShrink: 0,
          }}
        >
          <path
            d="M3 5l3 3 3-3"
            stroke="var(--fg-subtle)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </button>

      {open && (
        <div style={{ paddingBottom: 12 }}>
          <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {setlist.songs.map((song: string, idx: number) => (
              <li
                key={idx}
                style={{
                  display: 'flex',
                  gap: 10,
                  padding: '5px 0',
                  fontFamily: 'var(--font-ui)',
                  fontSize: 13,
                  color: 'var(--fg)',
                  letterSpacing: '-0.005em',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--fg-subtle)',
                    width: 18,
                    flexShrink: 0,
                    textAlign: 'right',
                  }}
                >
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>{song}</span>
              </li>
            ))}

            {hasEncore && (
              <>
                <li
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 0 4px',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      color: 'var(--fg-subtle)',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      flexShrink: 0,
                    }}
                  >
                    {copy.encoreLabel}
                  </span>
                  <div
                    style={{ flex: 1, height: 1, background: 'var(--border)' }}
                    aria-hidden
                  />
                </li>
                {setlist.encore!.map((song: string, idx: number) => (
                  <li
                    key={`encore-${idx}`}
                    style={{
                      display: 'flex',
                      gap: 10,
                      padding: '5px 0',
                      fontFamily: 'var(--font-ui)',
                      fontSize: 13,
                      color: 'var(--fg)',
                      letterSpacing: '-0.005em',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        color: 'var(--fg-subtle)',
                        width: 18,
                        flexShrink: 0,
                        textAlign: 'right',
                      }}
                    >
                      E{idx + 1}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>{song}</span>
                  </li>
                ))}
              </>
            )}
          </ol>

          {(setlist.when ?? setlist.source) && (
            <div
              style={{
                marginTop: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: 'var(--fg-subtle)',
                letterSpacing: '0.04em',
              }}
            >
              {setlist.when && (
                <span>
                  {copy.lastPlayedPrefix} {setlist.when}
                </span>
              )}
              {setlist.when && setlist.source && (
                <span style={{ opacity: 0.4 }}>·</span>
              )}
              {setlist.source &&
                (setlist.sourceUrl ? (
                  <a
                    href={setlist.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: 'var(--fg-subtle)',
                      textDecoration: 'underline',
                      textDecorationColor: 'var(--border-strong)',
                      textUnderlineOffset: 2,
                    }}
                  >
                    {copy.viaPrefix} {setlist.source}
                  </a>
                ) : (
                  <span>
                    {copy.viaPrefix} {setlist.source}
                  </span>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

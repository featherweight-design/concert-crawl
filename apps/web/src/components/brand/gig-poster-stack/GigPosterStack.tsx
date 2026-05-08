'use client'

import { useState, useCallback, useEffect } from 'react'
import { GigPoster, pickPalette } from '../gig-poster/GigPoster'
import type { Show } from '../gig-poster/GigPoster'

interface GigPosterStackProps {
  shows: Show[]
  width?: number
  height?: number
  intervalMs?: number
}

const LAYERS = [
  { x: 0, y: 0, rr: -1.5, scale: 1 },
  { x: 14, y: 10, rr: 3.5, scale: 0.985 },
  { x: -10, y: 20, rr: -5, scale: 0.97 },
] as const

// Starting position for the incoming card — just behind the back layer, initially hidden
const INCOMING_REST = { x: -16, y: 34, rr: -7, scale: 0.955 }

const LAYER_BRIGHTNESS = [1, 0.97, 0.94, 0.91] as const

export function GigPosterStack({
  shows,
  width = 320,
  height = 460,
  intervalMs = 5500,
}: GigPosterStackProps) {
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<'rest' | 'advancing'>('rest')

  const advance = useCallback(() => {
    if (phase !== 'rest') return
    setPhase('advancing')
    setTimeout(() => {
      setIdx((prev) => (prev + 1) % shows.length)
      setPhase('rest')
    }, 900)
  }, [phase, shows.length])

  useEffect(() => {
    if (shows.length < 2) return
    const timer = setTimeout(advance, intervalMs)
    return () => clearTimeout(timer)
  }, [advance, idx, intervalMs, shows.length])

  if (shows.length === 0) return null

  // 4 cards: front (leaving), mid, back, incoming (hidden in rest, slides in during advance)
  const order: Show[] = [
    shows[idx % shows.length]!,
    shows[(idx + 1) % shows.length]!,
    shows[(idx + 2) % shows.length]!,
    shows[(idx + 3) % shows.length]!,
  ]
  const palettes = order.map((ss) => pickPalette(ss.artist))

  const padX = Math.max(28, Math.round(width * 0.1))
  const padY = Math.max(36, Math.round(height * 0.1))

  return (
    <div
      onClick={advance}
      role="button"
      aria-label="Next poster"
      style={{
        width: width + padX * 2,
        height: height + padY * 2,
        position: 'relative',
        perspective: 1400,
        cursor: 'pointer',
      }}
    >
      {([0, 1, 2, 3] as const).map((ii) => {
        let transform: string
        let opacity: number

        if (phase === 'advancing') {
          if (ii === 0) {
            transform = `translate(${LAYERS[0].x - 24}px, ${LAYERS[0].y - 110}px) rotate(${LAYERS[0].rr - 12}deg) scale(${LAYERS[0].scale * 1.04})`
            opacity = 0
          } else if (ii === 1) {
            transform = `translate(${LAYERS[0].x}px, ${LAYERS[0].y}px) rotate(${LAYERS[0].rr}deg) scale(${LAYERS[0].scale})`
            opacity = 1
          } else if (ii === 2) {
            transform = `translate(${LAYERS[1].x}px, ${LAYERS[1].y}px) rotate(${LAYERS[1].rr}deg) scale(${LAYERS[1].scale})`
            opacity = 1
          } else {
            // incoming slides into back position
            transform = `translate(${LAYERS[2].x}px, ${LAYERS[2].y}px) rotate(${LAYERS[2].rr}deg) scale(${LAYERS[2].scale})`
            opacity = 1
          }
        } else {
          if (ii === 3) {
            transform = `translate(${INCOMING_REST.x}px, ${INCOMING_REST.y}px) rotate(${INCOMING_REST.rr}deg) scale(${INCOMING_REST.scale})`
            opacity = 0
          } else {
            const layer = LAYERS[ii]
            transform = `translate(${layer.x}px, ${layer.y}px) rotate(${layer.rr}deg) scale(${layer.scale})`
            opacity = 1
          }
        }

        const brightness = LAYER_BRIGHTNESS[ii]

        return (
          <div
            key={`${idx}-${ii}`}
            style={{
              position: 'absolute',
              left: padX,
              top: padY,
              zIndex: 10 - ii,
              transform,
              transformOrigin: '30% 100%',
              transition:
                phase === 'advancing'
                  ? 'transform 0.85s cubic-bezier(0.32, 0.72, 0.28, 1), opacity 0.7s ease-out'
                  : 'transform 0.4s ease-out, opacity 0.4s ease-out',
              opacity,
              willChange: 'transform, opacity',
              filter: brightness < 1 ? `brightness(${brightness})` : 'none',
            }}
          >
            <GigPoster
              show={order[ii]!}
              width={width}
              height={height}
              palette={palettes[ii]!}
            />
          </div>
        )
      })}

      {/* Indicator dots */}
      <div
        style={{
          position: 'absolute',
          bottom: 6,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: 6,
          zIndex: 20,
        }}
      >
        {shows.map((_, dotIndex) => (
          <div
            key={dotIndex}
            style={{
              width: dotIndex === idx ? 7 : 5,
              height: dotIndex === idx ? 7 : 5,
              borderRadius: '50%',
              background:
                dotIndex === idx
                  ? 'rgba(255, 255, 255, 0.85)'
                  : 'rgba(255, 255, 255, 0.28)',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>
    </div>
  )
}

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
      setIdx((ii) => (ii + 1) % shows.length)
      setPhase('rest')
    }, 900)
  }, [phase, shows.length])

  useEffect(() => {
    if (shows.length < 2) return
    const timer = setTimeout(advance, intervalMs)
    return () => clearTimeout(timer)
  }, [advance, idx, intervalMs, shows.length])

  if (shows.length === 0) return null

  const order: Show[] = [
    shows[idx % shows.length]!,
    shows[(idx + 1) % shows.length]!,
    shows[(idx + 2) % shows.length]!,
  ]
  const palettes = order.map((ss) => pickPalette(ss.artist))

  const layers = [
    { x: 0, y: 0, rr: -1.5, scale: 1 },
    { x: 14, y: 10, rr: 3.5, scale: 0.985 },
    { x: -10, y: 20, rr: -5, scale: 0.97 },
  ]

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
      {layers.map((layer, ii) => {
        const isTop = ii === 0
        const isMid = ii === 1

        let transform: string
        let opacity: number
        if (phase === 'advancing') {
          if (isTop) {
            transform = `translate(${layer.x - 24}px, ${layer.y - 110}px) rotate(${layer.rr - 12}deg) scale(${layer.scale * 1.04})`
            opacity = 0
          } else if (isMid) {
            transform = `translate(${layers[0]!.x}px, ${layers[0]!.y}px) rotate(${layers[0]!.rr}deg) scale(${layers[0]!.scale})`
            opacity = 1
          } else {
            transform = `translate(${layers[1]!.x}px, ${layers[1]!.y}px) rotate(${layers[1]!.rr}deg) scale(${layers[1]!.scale})`
            opacity = 1
          }
        } else {
          transform = `translate(${layer.x}px, ${layer.y}px) rotate(${layer.rr}deg) scale(${layer.scale})`
          opacity = 1
        }

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
              filter:
                ii === 2
                  ? 'brightness(0.94)'
                  : ii === 1
                    ? 'brightness(0.97)'
                    : 'none',
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
    </div>
  )
}

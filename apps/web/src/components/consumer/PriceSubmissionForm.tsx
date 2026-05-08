'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useUser, useAuth } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PriceSubmissionFormProps {
  eventId: string
  apiUrl: string
  isAxsEvent: boolean
}

type FormState = 'idle' | 'submitting' | 'success' | 'error'

export function PriceSubmissionForm({
  eventId,
  apiUrl,
  isAxsEvent,
}: PriceSubmissionFormProps) {
  const { isSignedIn } = useUser()
  const { getToken } = useAuth()
  const [state, setState] = useState<FormState>('idle')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [tierLabel, setTierLabel] = useState('')
  const [sourceNote, setSourceNote] = useState('')

  if (!isSignedIn) {
    return (
      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--fg-subtle)',
          letterSpacing: '0.02em',
        }}
      >
        <Link href="/sign-in" className="text-signal underline">
          Sign in
        </Link>{' '}
        to submit a price.
      </p>
    )
  }

  const prompt = isAxsEvent
    ? "AXS doesn't publish pricing. Know what face value costs? Submit it →"
    : 'Know the ticket price? Help the community.'

  const handleSubmit = async (evt: React.FormEvent) => {
    evt.preventDefault()
    const min = parseFloat(priceMin)
    if (isNaN(min) || min <= 0) return

    setState('submitting')
    try {
      const token = await getToken()
      if (!token) {
        setState('error')
        return
      }
      const res = await fetch(
        `${apiUrl}/v1/events/${eventId}/price-submissions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            priceMin: min,
            priceMax: priceMax ? parseFloat(priceMax) : undefined,
            tierLabel: tierLabel || undefined,
            sourceNote: sourceNote || undefined,
          }),
        },
      )
      setState(res.ok ? 'success' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--success)',
          letterSpacing: '0.02em',
        }}
      >
        Got it. Your submission is pending corroboration from other fans.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--fg-subtle)',
          letterSpacing: '0.02em',
        }}
      >
        {prompt}
      </p>
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="priceMin" className="text-xs">
              Floor price *
            </Label>
            <Input
              id="priceMin"
              type="number"
              min="0"
              step="0.01"
              placeholder="35"
              value={priceMin}
              onChange={(evt) => setPriceMin(evt.target.value)}
              required
              className="h-8 text-sm"
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="priceMax" className="text-xs">
              Ceiling price
            </Label>
            <Input
              id="priceMax"
              type="number"
              min="0"
              step="0.01"
              placeholder="75"
              value={priceMax}
              onChange={(evt) => setPriceMax(evt.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="tierLabel" className="text-xs">
            Tier (e.g. GA, Reserved)
          </Label>
          <Input
            id="tierLabel"
            placeholder="GA"
            value={tierLabel}
            onChange={(evt) => setTierLabel(evt.target.value)}
            maxLength={50}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label htmlFor="sourceNote" className="text-xs">
            Source (e.g. box office, just bought)
          </Label>
          <Input
            id="sourceNote"
            placeholder="box office"
            value={sourceNote}
            onChange={(evt) => setSourceNote(evt.target.value)}
            maxLength={200}
            className="h-8 text-sm"
          />
        </div>
        {state === 'error' && (
          <p className="text-xs" style={{ color: 'var(--destructive)' }}>
            Something went wrong. Try again.
          </p>
        )}
        <Button type="submit" size="sm" disabled={state === 'submitting'}>
          {state === 'submitting' ? 'Submitting…' : 'Submit price'}
        </Button>
      </form>
      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--fg-subtle)',
          letterSpacing: '0.02em',
        }}
      >
        Community prices are unverified until corroborated by other fans.
      </p>
    </div>
  )
}

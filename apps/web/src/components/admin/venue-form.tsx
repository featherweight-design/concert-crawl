'use client'

import { useFormStatus } from 'react-dom'
import type { Venue } from '@concert-crawl/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface VenueFormProps {
  venue?: Venue
  action: (formData: FormData) => Promise<void>
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving…' : 'Save Venue'}
    </Button>
  )
}

export function VenueForm({ venue, action }: VenueFormProps) {
  return (
    <form action={action} className="space-y-4 max-w-lg">
      <div className="space-y-1">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={venue?.name} required />
      </div>

      <div className="space-y-1">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          name="slug"
          defaultValue={venue?.slug}
          pattern="^[a-z0-9-]+$"
          title="Lowercase alphanumeric and hyphens only"
          required
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="websiteUrl">Website URL</Label>
        <Input
          id="websiteUrl"
          name="websiteUrl"
          type="url"
          defaultValue={venue?.websiteUrl}
          required
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="city">City</Label>
        <Input
          id="city"
          name="city"
          defaultValue={venue?.city ?? 'Denver'}
          required
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="contactEmail">Contact Email (optional)</Label>
        <Input
          id="contactEmail"
          name="contactEmail"
          type="email"
          defaultValue={venue?.contactEmail ?? ''}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="crawlNotes">Crawl Notes (optional)</Label>
        <Input
          id="crawlNotes"
          name="crawlNotes"
          defaultValue={venue?.crawlNotes ?? ''}
        />
      </div>

      {venue && (
        <input type="hidden" name="active" value={String(venue.active)} />
      )}

      <SubmitButton />
    </form>
  )
}

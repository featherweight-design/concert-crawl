'use client'

import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { generateInviteCode } from '@/lib/actions/invite-codes'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Generating…' : 'Generate Code'}
    </Button>
  )
}

export function GenerateInviteForm() {
  const handleSubmit = (formData: FormData) => {
    const expiresAt = formData.get('expiresAt')
    if (expiresAt) {
      formData.set('expiresAt', new Date(expiresAt as string).toISOString())
    }
    generateInviteCode(formData)
  }

  return (
    <form action={handleSubmit} className="flex items-end gap-4">
      <div className="space-y-1">
        <Label htmlFor="expiresAt">Expires (optional)</Label>
        <Input id="expiresAt" name="expiresAt" type="date" />
      </div>
      <SubmitButton />
    </form>
  )
}

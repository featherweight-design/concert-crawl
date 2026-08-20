import { redirect } from 'next/navigation'

// Stored notification `actionUrl`s still carry `/admin/prices`
// (packages/db/seed.ts), so this stays a redirect rather than a deletion.
export default function PricesRedirectPage() {
  redirect('/admin/review?tab=prices')
}

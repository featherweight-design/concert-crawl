import { redirect } from 'next/navigation'

// The submissions UI now lives inside Review as its own tab. Bookmarks and
// stored deep links keep resolving through this redirect.
export default function PricesSubmissionsPage() {
  redirect('/admin/review?tab=submissions')
}

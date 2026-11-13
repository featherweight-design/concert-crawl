import { redirect } from 'next/navigation';
import { PRICES_SUBMITTED_HREF } from '@/lib/admin/review-tabs';

// Submitted prices is a tab of /admin/prices. Bookmarks and stored deep links
// keep resolving through this redirect.
export default function PricesSubmissionsPage() {
  redirect(PRICES_SUBMITTED_HREF);
}

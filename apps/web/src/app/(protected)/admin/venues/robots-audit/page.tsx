import { redirect } from 'next/navigation';

/**
 * The robots.txt audit lives on Venues now: the Disallowed filter and the
 * robots column (`04/venues-desktop`). The old address keeps working.
 */
export default function RobotsAuditPage() {
  redirect('/admin/venues?robots=disallowed');
}

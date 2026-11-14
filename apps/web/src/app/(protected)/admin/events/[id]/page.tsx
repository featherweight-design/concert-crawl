import { redirect } from 'next/navigation';
import { editEventHref } from '@/lib/admin/edit-event-link';

/**
 * `/admin/events/<id>` has no page of its own: a show opens in its editor.
 * Any link or bookmark to the bare path lands there instead of a 404. The
 * editor's own page checks admin access and the id.
 */
export default async function AdminEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // `id` arrives decoded: re-encode it so a `%2F`, `%3F` or `%23` stays
  // inside its segment.
  redirect(editEventHref(encodeURIComponent(id)));
}

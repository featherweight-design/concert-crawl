import { notFound } from 'next/navigation';
import { auth, requireAdminUser } from '@/lib/auth';
import { apiClient, ApiError } from '@/lib/api';
import { DENVER_TIME_ZONE, localDateString } from '@/lib/time';
import { EventEdit } from '@/components/admin/events/edit/EventEdit';
import { eventDetailFrom } from '@/components/admin/events/edit/event-detail';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Event edit (`06/event-edit`). A missing show (404) or a malformed id (the
 * API's 400) is Not found; any other failure, a payload that drifted
 * included, reaches the admin-wide `admin/error.tsx`, which draws Couldn't
 * load inside the shell.
 */
export default async function EventEditPage({ params }: PageProps) {
  await requireAdminUser();
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) return null;

  const { id } = await params;
  let payload: unknown;
  try {
    payload = await apiClient.get<unknown>(`/v1/admin/events/${id}`, token);
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 400)
    ) {
      notFound();
    }
    throw error;
  }
  const detail = eventDetailFrom(payload);
  if (detail === null) throw new Error('event detail');
  return (
    <EventEdit detail={detail} today={localDateString(DENVER_TIME_ZONE)} />
  );
}

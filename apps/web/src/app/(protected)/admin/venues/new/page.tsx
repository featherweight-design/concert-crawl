import { notFound, redirect } from 'next/navigation';
import type { Venue } from '@concert-crawl/types';
import { auth, requireAdminUser } from '@/lib/auth';
import { ApiError, apiClient } from '@/lib/api';
import { AddVenueFlow } from '@/components/admin/add-venue/AddVenueFlow';
import {
  basicsOf,
  resumeStepOf,
} from '@/components/admin/add-venue/add-venue-rules';

interface Props {
  searchParams: Promise<{
    id?: string | string[];
    step?: string | string[];
    fresh?: string | string[];
  }>;
}

/**
 * Add a venue (3e, `05-add-a-venue`). Without `?id` it opens on Start; with
 * one it resumes that draft (plan decision 2). A venue that has gone live
 * belongs on its own page, so it goes there.
 */
export default async function AddVenuePage({ searchParams }: Props) {
  await requireAdminUser();
  const { id, step, fresh } = await searchParams;
  // Add another sends a new `fresh` value, so the flow starts over instead of
  // keeping the last venue's state; the id change after a first save does not.
  const key = typeof fresh === 'string' ? fresh : undefined;
  if (typeof id !== 'string' || id === '') {
    return <AddVenueFlow key={key} draft={null} />;
  }

  const { getToken } = await auth();
  const token = await getToken();
  if (!token) return null;

  let venue: Venue;
  try {
    venue = await apiClient.get<Venue>(
      `/v1/admin/venues/${encodeURIComponent(id)}`,
      token,
    );
  } catch (err: unknown) {
    // Only a missing venue is a 404; a failed read goes to the error
    // boundary, so a resumable draft never looks deleted.
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  // Only an explicit null is a draft (`deriveVenueStatusChips`).
  if (venue.wentLiveAt !== null) redirect(`/admin/venues/${venue.id}`);
  return (
    <AddVenueFlow
      key={key}
      draft={{
        id: venue.id,
        basics: basicsOf(venue),
        step: resumeStepOf(step),
      }}
    />
  );
}

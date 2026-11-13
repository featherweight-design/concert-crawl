'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { apiClient, ApiError } from '@/lib/api';
import type {
  CrawlPauseRequest,
  PlatformProbeResult,
  Venue,
  VenueGuide,
  VenueGuideChip,
  VenueHideReason,
  VenuePlatform,
} from '@concert-crawl/types';
import type { PauseOutcome } from '@/components/admin/venues/pause-rules';
import {
  deleteBlockersOf,
  isVenueNotFound,
  type DeleteVenueOutcome,
} from '@/components/admin/venues/delete-rules';
import { triggerVenueCrawl } from '@/components/admin/crawl-trigger-button/lib/crawl';
import { buildUpdateVenueBody } from './build-update-venue-body';

async function getToken(): Promise<string> {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) throw new Error('Not authenticated');
  return token;
}

// What Show on site and Resume crawling come back with. A venue removed at its
// own request is refused by the API (409, code `venue_removed`): that refusal
// comes back as a value carrying the API's message, because a server action's
// thrown message is redacted in production. Anything else still throws.
export type VenueChangeOutcome = { ok: true } | { ok: false; error: string };

// The API's refusal of a removed venue (`venueRemovedBody` in the API's
// venue-hide.ts), read from the error body itself.
const isVenueRemovedRefusal = (err: unknown): err is ApiError =>
  err instanceof ApiError &&
  err.status === 409 &&
  typeof err.body === 'object' &&
  err.body !== null &&
  'code' in err.body &&
  err.body.code === 'venue_removed';

/** Returns a removed venue's refusal as a value; rethrows anything else. */
const venueRemovedOutcome = (
  err: unknown,
  action: string,
  id: string,
): VenueChangeOutcome => {
  if (!isVenueRemovedRefusal(err)) throw err;
  console.warn(`${action}: venue removed`, { id });
  return { ok: false, error: err.message };
};

async function getCurrentUserName(): Promise<string | null> {
  const user = await currentUser();
  if (!user) return null;
  const parts = [user.firstName, user.lastName].filter(Boolean);
  return parts.length > 0
    ? parts.join(' ')
    : (user.emailAddresses[0]?.emailAddress ?? null);
}

export interface CreateVenueResult {
  success: boolean;
  data?: Venue;
  error?: string;
  field?: string;
}

export async function createVenue(
  formData: FormData,
): Promise<CreateVenueResult> {
  const token = await getToken();

  try {
    const addressRaw = formData.get('address');
    const address =
      addressRaw !== null && String(addressRaw).trim()
        ? String(addressRaw).trim()
        : null;

    const venue = await apiClient.post<Venue>('/v1/admin/venues', token, {
      name: formData.get('name'),
      slug: formData.get('slug'),
      websiteUrl: formData.get('websiteUrl'),
      city: formData.get('city') || 'Denver',
      active: formData.get('active') !== 'false',
      address,
    });
    revalidatePath('/admin/venues');
    return { success: true, data: venue };
  } catch (err: unknown) {
    if (err instanceof ApiError && err.status === 409) {
      return { success: false, error: 'Slug already in use', field: 'slug' };
    }
    throw err;
  }
}

export async function createVenueAndCrawl(
  formData: FormData,
): Promise<CreateVenueResult> {
  const token = await getToken();

  const result = await createVenue(formData);
  if (!result.success || !result.data) return result;

  try {
    await triggerVenueCrawl(result.data.id, token);
  } catch (err: unknown) {
    // Crawl trigger failure is non-fatal — venue was created
    console.warn('createVenueAndCrawl: first crawl not queued', {
      id: result.data.id,
      err,
    });
  }

  return result;
}

export async function updateVenue(
  id: string,
  formData: FormData,
): Promise<{
  success: boolean;
  error?: string;
  // Any input the API names; the form marks the ones it renders and shows the
  // message at the top for the rest.
  field?: string;
}> {
  const token = await getToken();

  try {
    await apiClient.patch<Venue>(
      `/v1/admin/venues/${id}`,
      token,
      buildUpdateVenueBody(formData),
    );
    revalidatePath('/admin/venues');
    revalidatePath(`/admin/venues/${id}`);
    return { success: true };
  } catch (err: unknown) {
    // A removed venue's crawl fields can't change (409 venue_removed). It is
    // not a slug clash, so it goes to the page's banner, not the slug input.
    if (isVenueRemovedRefusal(err)) {
      console.warn('updateVenue: venue removed', { id });
      return { success: false, error: err.message };
    }
    if (err instanceof ApiError && err.status === 409) {
      console.warn('updateVenue: slug conflict', { id });
      return { success: false, error: 'Slug already in use', field: 'slug' };
    }
    if (err instanceof ApiError && err.status === 400 && err.zodIssues) {
      const apiAccountIdIssue = err.zodIssues.find(
        (issue) => issue.path[0] === 'apiAccountId',
      );
      if (apiAccountIdIssue) {
        console.warn('updateVenue: apiAccountId validation failed', {
          id,
          message: apiAccountIdIssue.message,
        });
        return {
          success: false,
          error: apiAccountIdIssue.message,
          field: 'apiAccountId',
        };
      }
    }
    // Any other 400 says what was wrong: either a hand-rolled rule with its
    // own message and `field` (the browser-mode wait-selector guard), or a Zod
    // issue, whose message and path name the input. Rethrowing showed the
    // admin "An unexpected error occurred" and nothing else (#1344).
    if (err instanceof ApiError && err.status === 400) {
      const zodPath = err.zodIssues?.[0]?.path[0];
      const field =
        err.field ?? (typeof zodPath === 'string' ? zodPath : undefined);
      console.warn('updateVenue: rejected', { id, field });
      return {
        success: false,
        error: err.message,
        ...(field === undefined ? {} : { field }),
      };
    }
    // Unexpected failure — the branches above convert the expected 409/400
    // cases, so anything reaching here is worth surfacing in server logs.
    console.error('updateVenue: unexpected error', err);
    throw err;
  }
}

export async function pauseVenue(id: string): Promise<void> {
  const token = await getToken();
  await apiClient.patch<Venue>(`/v1/admin/venues/${id}`, token, {
    active: false,
  });
  revalidatePath('/admin/venues');
  revalidatePath(`/admin/venues/${id}`);
}

// Sends the whole pause body (reason, note, resume) to the API, as given. A
// reason-only pause is a valid body: the API defaults resume to manual.
// A refusal comes back as a value, not a throw, because a server action's
// thrown message is redacted in production: the Pause panel shows the API's
// 422 date errors ("Pick a date after today") inline, so it needs the text.
export async function pauseCrawling(
  id: string,
  body: CrawlPauseRequest,
): Promise<PauseOutcome> {
  const token = await getToken();
  try {
    await apiClient.post<Venue>(
      `/v1/admin/venues/${id}/crawl-pause`,
      token,
      body,
    );
  } catch (err: unknown) {
    if (!(err instanceof ApiError)) throw err;
    console.warn('pauseCrawling: refused', { id, status: err.status });
    return { ok: false, error: err.status === 422 ? err.message : null };
  }
  revalidatePath('/admin/venues');
  revalidatePath(`/admin/venues/${id}`);
  return { ok: true };
}

// Queues one venue's crawl now, through the same `triggerVenueCrawl` the
// venue page's Re-crawl uses (POST /v1/admin/crawl/:id). A failure carries the
// API's status: 400 (hidden or unverified) and 409 (paused, or robots.txt
// disallows it: `robots_disallowed`) are the API refusing that venue;
// anything else is an error, logged as one. A failure before any response
// (the network) still throws. A queued crawl refreshes the venue's pages.
export async function recrawlVenue(
  id: string,
): Promise<{ ok: true } | { ok: false; status: number }> {
  const token = await getToken();
  try {
    await triggerVenueCrawl(id, token);
    revalidatePath('/admin/venues');
    revalidatePath(`/admin/venues/${id}`);
    return { ok: true };
  } catch (err: unknown) {
    if (!(err instanceof ApiError)) throw err;
    if (err.status === 400 || err.status === 409) {
      console.warn('recrawlVenue: refused', { id, status: err.status });
    } else {
      console.error('recrawlVenue: failed', { id, status: err.status });
    }
    return { ok: false, status: err.status };
  }
}

export async function resumeCrawling(id: string): Promise<VenueChangeOutcome> {
  const token = await getToken();
  try {
    await apiClient.delete<Venue>(`/v1/admin/venues/${id}/crawl-pause`, token);
  } catch (err: unknown) {
    return venueRemovedOutcome(err, 'resumeCrawling', id);
  }
  revalidatePath('/admin/venues');
  revalidatePath(`/admin/venues/${id}`);
  return { ok: true };
}

export interface VenueRemovalResult {
  submissionsDeleted: number;
  eventPricesCleared: number;
}

// Honours a venue's removal request: shows off the site, crawling stopped,
// every price for its shows deleted. See POST /v1/admin/venues/:id/remove.
export async function removeVenue(
  id: string,
  reason: string,
): Promise<VenueRemovalResult> {
  const token = await getToken();
  const result = await apiClient.post<VenueRemovalResult & { venue: Venue }>(
    `/v1/admin/venues/${id}/remove`,
    token,
    { reason },
  );
  revalidatePath('/admin/venues');
  revalidatePath(`/admin/venues/${id}`);
  return {
    submissionsDeleted: result.submissionsDeleted,
    eventPricesCleared: result.eventPricesCleared,
  };
}

export async function deleteVenue(
  id: string,
): Promise<{ eventsDetached: number }> {
  const token = await getToken();
  const result = await apiClient.delete<{ eventsDetached: number }>(
    `/v1/admin/venues/${id}`,
    token,
  );
  revalidatePath('/admin/venues');
  return result;
}

// The venue page's Delete. A venue with shows or Watchers is refused with a
// 409 and its counts, which come back as a value (a server action's thrown
// message is redacted in production) so the page can say why. It wraps
// `deleteVenue`, so there is one DELETE call. The route's own "Venue not found"
// 404 means the venue is already gone (another tab, a double submit), which is
// what was asked; any other 404 (a missing route, version skew) is a failure.
export async function tryDeleteVenue(id: string): Promise<DeleteVenueOutcome> {
  try {
    const { eventsDetached } = await deleteVenue(id);
    return { ok: true, eventsDetached };
  } catch (err: unknown) {
    if (!(err instanceof ApiError)) throw err;
    if (err.status === 404 && isVenueNotFound(err.body)) {
      console.info('tryDeleteVenue: already gone', { id });
      revalidatePath('/admin/venues');
      return { ok: true, eventsDetached: 0 };
    }
    console.warn('tryDeleteVenue: refused', { id, status: err.status });
    return {
      ok: false,
      refused: err.status === 409 ? deleteBlockersOf(err.body) : null,
    };
  }
}

// Hide from site with the drawn Why (`A3/03/hide-other-d`). The API stores the
// reason on the venue and writes the `venue.hide` audit row.
export async function hideVenue(
  id: string,
  hideReason: VenueHideReason,
  hideNote: string | null,
): Promise<void> {
  const token = await getToken();
  await apiClient.patch<Venue>(`/v1/admin/venues/${id}`, token, {
    active: false,
    hideReason,
    ...(hideNote === null ? {} : { hideNote }),
  });
  revalidatePath('/admin/venues');
  revalidatePath(`/admin/venues/${id}`);
}

export async function setVenueFeatured(
  id: string,
  featured: boolean,
): Promise<void> {
  const token = await getToken();
  await apiClient.patch<Venue>(`/v1/admin/venues/${id}`, token, { featured });
  revalidatePath('/admin/venues');
  revalidatePath(`/admin/venues/${id}`);
}

export async function activateVenue(id: string): Promise<VenueChangeOutcome> {
  const token = await getToken();
  try {
    await apiClient.patch<Venue>(`/v1/admin/venues/${id}`, token, {
      active: true,
    });
  } catch (err: unknown) {
    return venueRemovedOutcome(err, 'activateVenue', id);
  }
  revalidatePath('/admin/venues');
  return { ok: true };
}

export async function verifyVenue(id: string): Promise<void> {
  const [token, verifiedBy] = await Promise.all([
    getToken(),
    getCurrentUserName(),
  ]);
  await apiClient.patch<Venue>(`/v1/admin/venues/${id}`, token, {
    verified: true,
    verifiedBy,
  });
  revalidatePath('/admin/venues');
  revalidatePath(`/admin/venues/${id}`);
}

export async function unverifyVenue(id: string): Promise<void> {
  const token = await getToken();
  await apiClient.patch<Venue>(`/v1/admin/venues/${id}`, token, {
    verified: false,
  });
  revalidatePath('/admin/venues');
  revalidatePath(`/admin/venues/${id}`);
}

export interface GenerateAboutResult {
  success: boolean;
  data?: {
    capacity: number | null;
    venueType: string;
    neighborhood: string;
    about: string;
  };
  error?: string;
}

export async function generateVenueAbout(
  id: string,
): Promise<GenerateAboutResult> {
  const token = await getToken();
  try {
    const data = await apiClient.post<{
      capacity: number | null;
      venueType: string;
      neighborhood: string;
      about: string;
    }>(`/v1/admin/venues/${id}/generate-about`, token, {});
    return { success: true, data };
  } catch (err: unknown) {
    const message =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Generation failed';
    return { success: false, error: message };
  }
}

export interface ProbeVenuePlatformResult {
  success: boolean;
  data?: PlatformProbeResult;
  error?: string;
}

// Dry-run probe of a proposed platform config (#665). Passes the CURRENT
// form values so admins can validate before saving; nothing is persisted.
export async function probeVenuePlatform(
  id: string,
  proposed: {
    platform: VenuePlatform | null;
    platformVenueId: string | null;
  },
): Promise<ProbeVenuePlatformResult> {
  const token = await getToken();
  try {
    const data = await apiClient.post<PlatformProbeResult>(
      `/v1/admin/venues/${id}/probe-platform`,
      token,
      proposed,
    );
    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Probe request failed';
    return { success: false, error: message };
  }
}

// --- #764 first-timer guide -------------------------------------------------
//
// Three actions mirroring the three admin endpoints. Saving a draft never
// touches publication; publishing re-derives the accessibility gate server-side
// and can fail with a 400 the block renders inline, so the gate result is
// returned rather than thrown.

export interface VenueGuideActionResult {
  success: boolean;
  data?: VenueGuide;
  error?: string;
  field?: 'accessibility';
}

export interface SaveVenueGuidePayload {
  insiderTip: string | null;
  chips: VenueGuideChip[];
}

export async function saveVenueGuide(
  venueId: string,
  payload: SaveVenueGuidePayload,
): Promise<VenueGuideActionResult> {
  try {
    // Inside the try: getToken() throws on an expired or missing session, and
    // an unhandled throw from a Server Action replaces the whole admin page
    // with Next's error screen — losing the draft the admin was typing.
    const token = await getToken();
    const data = await apiClient.put<VenueGuide>(
      `/v1/admin/venues/${venueId}/guide`,
      token,
      payload,
    );
    revalidatePath(`/admin/venues/${venueId}`);
    return { success: true, data };
  } catch (err: unknown) {
    console.error('saveVenueGuide: failed', { venueId, err });
    // Only an ApiError carries a message the API meant for a human. Anything
    // else — an expired getToken(), a network fault — would put raw auth or
    // infra strings in front of the admin, so the component falls back to
    // GUIDE_COPY.status.saveError and the string stays in copy.ts.
    return {
      success: false,
      ...(err instanceof ApiError ? { error: err.message } : {}),
    };
  }
}

export async function publishVenueGuide(
  venueId: string,
): Promise<VenueGuideActionResult> {
  try {
    // Inside the try — see saveVenueGuide.
    const token = await getToken();
    const data = await apiClient.post<VenueGuide>(
      `/v1/admin/venues/${venueId}/guide/publish`,
      token,
      {},
    );
    revalidatePath(`/admin/venues/${venueId}`);
    return { success: true, data };
  } catch (err: unknown) {
    // A 400 here is the accessibility publish gate, not a malformed request —
    // the body carries no Zod issues because nothing was validated.
    if (err instanceof ApiError && err.status === 400 && !err.zodIssues) {
      console.warn('publishVenueGuide: blocked by accessibility gate', {
        venueId,
      });
      return { success: false, error: err.message, field: 'accessibility' };
    }
    console.error('publishVenueGuide: unexpected error', { venueId, err });
    // Only an ApiError carries a message the API meant for a human. Anything
    // else — an expired getToken(), a network fault — would put raw auth or
    // infra strings in front of the admin, so the component falls back to
    // GUIDE_COPY.status.saveError and the string stays in copy.ts.
    return {
      success: false,
      ...(err instanceof ApiError ? { error: err.message } : {}),
    };
  }
}

export async function unpublishVenueGuide(
  venueId: string,
): Promise<VenueGuideActionResult> {
  try {
    // Inside the try — see saveVenueGuide.
    const token = await getToken();
    const data = await apiClient.post<VenueGuide>(
      `/v1/admin/venues/${venueId}/guide/unpublish`,
      token,
      {},
    );
    revalidatePath(`/admin/venues/${venueId}`);
    return { success: true, data };
  } catch (err: unknown) {
    console.error('unpublishVenueGuide: failed', { venueId, err });
    // Only an ApiError carries a message the API meant for a human. Anything
    // else — an expired getToken(), a network fault — would put raw auth or
    // infra strings in front of the admin, so the component falls back to
    // GUIDE_COPY.status.saveError and the string stays in copy.ts.
    return {
      success: false,
      ...(err instanceof ApiError ? { error: err.message } : {}),
    };
  }
}

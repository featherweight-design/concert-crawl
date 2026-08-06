import type {
  Crew,
  CrewDetail,
  CrewInvite,
  CrewSummary,
} from '@concert-crawl/types'
import { apiClient } from './api'

interface CrewsListResponse {
  crews: CrewSummary[]
}

interface CrewCreateResponse {
  crew: CrewSummary
}

export async function fetchCrews(token: string): Promise<CrewSummary[]> {
  const data = await apiClient.get<CrewsListResponse>('/v1/crews', token)
  return data.crews
}

/**
 * The client mints the crew id so the create sheet can draw the real patch
 * before the row exists: the artwork is seeded from `(id, patchSalt)`, so a
 * server-assigned id would mean previewing one crew and creating a different
 * looking one.
 */
export async function createCrew(
  token: string,
  crew: { id: string; name: string },
): Promise<CrewSummary> {
  const data = await apiClient.post<CrewCreateResponse>(
    '/v1/crews',
    token,
    crew,
  )
  return data.crew
}

/** The crew home payload. Throws `ApiError` 403 for a non-member. */
export async function fetchCrew(
  token: string,
  crewId: string,
): Promise<CrewDetail> {
  return apiClient.get<CrewDetail>(`/v1/crews/${crewId}`, token)
}

/**
 * The invite sheet needs the token in hand before the copy button is tapped:
 * `writeText` after an `await` has already lost the user-activation grant
 * (the #72 lesson), so the link is fetched on open and copied synchronously.
 */
export async function fetchCurrentInvite(
  token: string,
  crewId: string,
): Promise<CrewInvite | null> {
  const data = await apiClient.get<{ invite: CrewInvite | null }>(
    `/v1/crews/${crewId}/invites/current`,
    token,
  )
  return data.invite
}

export async function mintInvite(
  token: string,
  crewId: string,
): Promise<CrewInvite> {
  const data = await apiClient.post<{ invite: CrewInvite }>(
    `/v1/crews/${crewId}/invites`,
    token,
    {},
  )
  return data.invite
}

export async function revokeInvite(
  token: string,
  crewId: string,
  inviteId: string,
): Promise<void> {
  await apiClient.post(
    `/v1/crews/${crewId}/invites/${inviteId}/revoke`,
    token,
    {},
  )
}

/**
 * The salt is server-side (`patchSalt + 1`) — the client asks for the next
 * one and never proposes a value, so a candidate it previews is only honest
 * if it is drawn at exactly `patchSalt + 1`.
 */
export async function rerollPatch(
  token: string,
  crewId: string,
): Promise<Pick<Crew, 'id' | 'name' | 'patchSalt'>> {
  const data = await apiClient.post<{
    crew: Pick<Crew, 'id' | 'name' | 'patchSalt'>
  }>(`/v1/crews/${crewId}/patch/reroll`, token, {})
  return data.crew
}

/**
 * Leaving is the one call that can come back 409. The code it carries is what
 * selects the confirm's kind — the client never re-derives keeper-ness, so the
 * two sides cannot disagree about whether a handoff is required.
 */
export async function leaveCrew(token: string, crewId: string): Promise<void> {
  await apiClient.post(`/v1/crews/${crewId}/leave`, token, {})
}

export async function handoffCrew(
  token: string,
  crewId: string,
  newKeeperId: string,
): Promise<void> {
  await apiClient.post(`/v1/crews/${crewId}/handoff`, token, { newKeeperId })
}

export async function removeMember(
  token: string,
  crewId: string,
  memberId: string,
): Promise<void> {
  await apiClient.delete(`/v1/crews/${crewId}/members/${memberId}`, token)
}

export async function deleteCrew(token: string, crewId: string): Promise<void> {
  await apiClient.delete(`/v1/crews/${crewId}`, token)
}

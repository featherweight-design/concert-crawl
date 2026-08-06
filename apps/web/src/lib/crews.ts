import type { CrewSummary } from '@concert-crawl/types'
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

import { apiClient } from '@/lib/api'
import { parseTriageResponse } from '@/components/admin/triage/lib/parse-triage'
import type {
  AcknowledgedFault,
  TriageCondition,
  TriageFault,
} from '@/components/admin/triage/definitions/types'

export interface VenueFault {
  fault: TriageFault | null
  acknowledged: AcknowledgedFault | null
}

export interface FaultAcknowledgementBody {
  condition: TriageCondition
  evidenceKind: 'pinned_count' | 'horizon_shrank' | null
  evidenceValue: string | null
  reason: string
}

/**
 * The venue's row from the triage payload, if it has one.
 *
 * Triage is the authority on what a fault currently looks like, so the control
 * reads from it rather than deriving a second view of the same evidence. An
 * unusable payload reads as no fault: this control is a strip inside a crawl
 * inspector tab that has nothing else to do with triage, and it should not take
 * the tab down with it.
 */
export const fetchVenueFault = async (
  venueId: string,
  token: string,
): Promise<VenueFault> => {
  const raw = await apiClient.get<unknown>('/v1/admin/triage', token)
  const parsed = parseTriageResponse(raw)
  if (parsed === null) return { fault: null, acknowledged: null }
  return {
    fault: parsed.faults.find((row) => row.venueId === venueId) ?? null,
    acknowledged:
      parsed.acknowledged.find((row) => row.venueId === venueId) ?? null,
  }
}

export const acknowledgeFault = async (
  venueId: string,
  body: FaultAcknowledgementBody,
  token: string,
): Promise<void> => {
  await apiClient.post<unknown>(
    `/v1/admin/venues/${venueId}/fault-acknowledgements`,
    token,
    body,
  )
}

export const unacknowledgeFault = async (
  venueId: string,
  condition: TriageCondition,
  token: string,
): Promise<void> => {
  await apiClient.delete<unknown>(
    `/v1/admin/venues/${venueId}/fault-acknowledgements/${condition}`,
    token,
  )
}

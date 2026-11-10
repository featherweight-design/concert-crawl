// Client-side mirror of `faultAcknowledgementKey` in
// apps/api/src/routes/admin/lib/triage.ts.
//
// The control pre-fills the figure the operator is looking at rather than
// asking them to retype it — a typo would store a key that can never match,
// which reads as the acknowledgement having silently failed. The API re-derives
// and validates the same figure, so this is a convenience, not the authority.

import { isAccountWideErrorClass } from '@concert-crawl/crawler-core/crawl-error-class';
import type { TriageFault } from '@/components/admin/triage/definitions/types';

export interface AcknowledgementEvidence {
  evidenceKind: 'pinned_count' | 'horizon_shrank' | null;
  evidenceValue: string | null;
}

export const acknowledgementEvidence = (
  fault: TriageFault,
): AcknowledgementEvidence => {
  switch (fault.condition) {
    case 'ceiling':
      return {
        evidenceKind: fault.evidence.kind,
        evidenceValue:
          fault.evidence.kind === 'horizon_shrank'
            ? fault.evidence.furthest
            : String(fault.evidence.count),
      };
    case 'wentDark':
      return {
        evidenceKind: null,
        evidenceValue: String(fault.evidence.count),
      };
    case 'coverage':
      return {
        evidenceKind: null,
        evidenceValue: String(fault.evidence.uncovered),
      };
    case 'blocked':
      return {
        evidenceKind: null,
        evidenceValue:
          fault.evidence.status === null ? null : String(fault.evidence.status),
      };
    case 'failed':
      // Mirrors the API's failedEvidenceValue: an account-wide class is keyed
      // with its streak start, so acknowledging one outage never hides the next.
      return {
        evidenceKind: null,
        evidenceValue: isAccountWideErrorClass(fault.evidence.errorClass)
          ? `${fault.evidence.errorClass}@${fault.persistedSince}`
          : fault.evidence.errorClass,
      };
  }
};

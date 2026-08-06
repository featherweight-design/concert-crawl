import { CrewsContent } from '@/components/consumer/crews'

// The loading state is the destination itself in its loading state, so the
// header and the row geometry are identical either side of the resolve and
// nothing shifts.
export default function CrewsLoading() {
  return <CrewsContent initialCrews={[]} scaRegion={false} loading />
}

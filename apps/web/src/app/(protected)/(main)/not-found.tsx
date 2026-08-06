// Not-found boundary for every route inside the app shell (#1115, PR-E).
//
// Nothing owned one before this: `notFound()` from the venue and event routes
// fell through to Next's unstyled default page, outside the app chrome. Living
// at `(main)` means the nav and theme survive, and all three verticals get the
// same treatment.
import { NotFoundSurface } from '@/components/consumer/not-found-surface'

const NotFound = () => <NotFoundSurface />

export default NotFound

// Every adapter's `firstPageOnly` request profile in one exhaustive map, for
// the admin probe's budget. A new PlatformSource is a compile error here
// until its adapter declares one.

import { AEG_PROBE_REQUESTS } from './aeg.js';
import { DETAIL_PAGE_PROBE_REQUESTS } from './detail-page.js';
import type { PlatformSource, ProbeRequests } from './index.js';
import { LIVENATION_PROBE_REQUESTS } from './livenation.js';
import { VENUEPILOT_PROBE_REQUESTS } from './venuepilot.js';

export const PROBE_REQUESTS: Readonly<Record<PlatformSource, ProbeRequests>> = {
  aeg: AEG_PROBE_REQUESTS,
  venuepilot: VENUEPILOT_PROBE_REQUESTS,
  livenation: LIVENATION_PROBE_REQUESTS,
  'detail-page': DETAIL_PAGE_PROBE_REQUESTS,
};

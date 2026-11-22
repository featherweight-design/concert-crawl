'use client';

/**
 * Add a venue (3e-1b): Start, then the step shell. The shell's body is empty
 * until Basics lands in 3e-1c, which also saves the draft on Continue and
 * resumes one from `?id`. Steps 2 to 5 land in later PRs; until then the rail
 * draws them as not-yet steps.
 */

import { useEffect, useState } from 'react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { useIsPhone } from '@/components/admin/primitives';
import { usePageTitle } from '@/components/admin/shell/PageTitleContext';
import { AddVenueShell } from './AddVenueShell';
import { StartScreen } from './StartScreen';
import type { AddVenueStep } from './add-venue-rules';

const COPY = ADMIN_COPY.addVenue;
const VENUES_HREF = '/admin/venues';
const NOTHING_DONE: ReadonlySet<AddVenueStep> = new Set();

export const AddVenueFlow = () => {
  const phone = useIsPhone();
  const { setPageTitle, setPhoneBack } = usePageTitle();
  const [stage, setStage] = useState<'start' | 'basics'>('start');

  // "Venues / Add a venue" (`basics-desktop`'s crumbs).
  useEffect(() => {
    setPageTitle(COPY.crumb);
    return () => setPageTitle(null);
  }, [setPageTitle]);
  // The phone's Start draws "‹ Venues" in place of the title bar.
  useEffect(() => {
    setPhoneBack({ label: ADMIN_COPY.venuesList.title, href: VENUES_HREF });
    return () => setPhoneBack(null);
  }, [setPhoneBack]);

  if (stage === 'start') {
    return <StartScreen phone={phone} onStart={() => setStage('basics')} />;
  }
  return (
    <AddVenueShell
      phone={phone}
      step="basics"
      done={NOTHING_DONE}
      name=""
      busy={false}
      onBack={() => setStage('start')}
      // Continue saves Basics as a draft, which 3e-1c builds; the route has
      // no link to it until then (plan decision 12).
      onContinue={() => undefined}
    >
      {null}
    </AddVenueShell>
  );
};

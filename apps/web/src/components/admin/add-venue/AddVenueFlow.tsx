'use client';

/**
 * Add a venue (3e-1c-i): Start, then Basics in the step shell. Continue checks
 * Basics and marks what is wrong; saving the draft on Continue, and resuming
 * one from `?id`, land in 3e-1c-ii (plan decision 2). Steps 2 to 5 land in
 * later PRs; until then the rail draws them as not-yet steps.
 */

import { useEffect, useState } from 'react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { useIsPhone } from '@/components/admin/primitives';
import { usePageTitle } from '@/components/admin/shell/PageTitleContext';
import { slugify } from '@/components/admin/venues/details/details-rules';
import { AddVenueShell } from './AddVenueShell';
import { BasicsStep } from './BasicsStep';
import { StartScreen } from './StartScreen';
import {
  BASICS_FIELD_ORDER,
  basicsFieldId,
  EMPTY_BASICS,
  validateBasics,
  type AddVenueStep,
  type BasicsDraft,
  type BasicsErrors,
} from './add-venue-rules';

const COPY = ADMIN_COPY.addVenue;
const VENUES_HREF = '/admin/venues';
const NOTHING_DONE: ReadonlySet<AddVenueStep> = new Set();

/** Moves focus to the first field Basics marked, so the error is announced. */
const focusFirstInvalid = (errors: BasicsErrors) => {
  const first = BASICS_FIELD_ORDER.find((key) => errors[key] !== undefined);
  if (first !== undefined)
    document.getElementById(basicsFieldId(first))?.focus();
};

export const AddVenueFlow = () => {
  const phone = useIsPhone();
  const { setPageTitle, setPhoneBack } = usePageTitle();
  const [stage, setStage] = useState<'start' | 'basics'>('start');
  const [basics, setBasics] = useState<BasicsDraft>(EMPTY_BASICS);
  // Once the admin types a link, the name no longer remakes it.
  const [slugEdited, setSlugEdited] = useState(false);
  const [errors, setErrors] = useState<BasicsErrors>({});

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

  const change = (patch: Partial<BasicsDraft>) => {
    const next = { ...basics, ...patch };
    if (patch.slug !== undefined) setSlugEdited(true);
    else if (patch.name !== undefined && !slugEdited) {
      next.slug = slugify(patch.name);
    }
    setBasics(next);
    // An edited field's error goes with the edit.
    setErrors((prev) => {
      const rest = { ...prev };
      for (const key of Object.keys(patch)) {
        if (
          key === 'name' ||
          key === 'slug' ||
          key === 'capacity' ||
          key === 'website'
        ) {
          delete rest[key];
        }
      }
      if (patch.name !== undefined && !slugEdited) delete rest.slug;
      return rest;
    });
  };

  // Continue marks what Basics is missing. A valid Basics stays put until
  // 3e-1c-ii saves it as a draft; the route has no link to it until then
  // (plan decision 12).
  const check = () => {
    const found = validateBasics(basics);
    setErrors(found);
    focusFirstInvalid(found);
  };

  const back = () => {
    setErrors({});
    setStage('start');
  };

  if (stage === 'start') {
    return <StartScreen phone={phone} onStart={() => setStage('basics')} />;
  }
  return (
    <AddVenueShell
      phone={phone}
      step="basics"
      done={NOTHING_DONE}
      name={basics.name}
      busy={false}
      onBack={back}
      onContinue={check}
    >
      <BasicsStep
        phone={phone}
        draft={basics}
        errors={errors}
        formError={null}
        busy={false}
        onChange={change}
      />
    </AddVenueShell>
  );
};

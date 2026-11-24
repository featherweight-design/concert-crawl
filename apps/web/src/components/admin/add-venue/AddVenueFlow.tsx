'use client';

/**
 * Add a venue (3e-1): Start, then Basics in the step shell. The venue is
 * saved as a draft on Basics' first Continue (plan decision 2), and the URL
 * becomes `?id=…&step=basics` so a reload resumes it. Steps 2 to 5 land in
 * later PRs; until then the rail draws them as not-yet steps.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { useIsPhone } from '@/components/admin/primitives';
import { usePageTitle } from '@/components/admin/shell/PageTitleContext';
import { slugify } from '@/components/admin/venues/details/details-rules';
import { createDraftVenue, updateVenue } from '@/lib/actions/venues';
import { AddVenueShell } from './AddVenueShell';
import { AskVenueSheet } from './AskVenueSheet';
import { BasicsStep } from './BasicsStep';
import { SourceStep } from './SourceStep';
import { StartScreen } from './StartScreen';
import {
  BASICS_FIELD_ORDER,
  basicsFieldId,
  EMPTY_BASICS,
  addVenueHref,
  basicsColumnsOf,
  basicsFormData,
  changedBasics,
  saveErrorOf,
  normalizeWebsite,
  validateBasics,
  type AddVenueStep,
  type BasicsColumns,
  type BasicsDraft,
  type BasicsErrors,
} from './add-venue-rules';

const COPY = ADMIN_COPY.addVenue;
const VENUES_HREF = '/admin/venues';
const NOTHING_DONE: ReadonlySet<AddVenueStep> = new Set();
const BASICS_DONE: ReadonlySet<AddVenueStep> = new Set(['basics']);
const SOURCE_STEP = 'source';

export interface AddVenueDraft {
  id: string;
  basics: BasicsDraft;
  /** The step the address names: Source resumes there, anything else on Basics. */
  step?: 'basics' | 'source';
}

type SaveOutcome = {
  success: boolean;
  id?: string;
  field?: string;
  conflict?: boolean;
};

/** Moves focus to the first field Basics marked, so the error is announced. */
const focusFirstInvalid = (errors: BasicsErrors) => {
  const first = BASICS_FIELD_ORDER.find((key) => errors[key] !== undefined);
  if (first !== undefined)
    document.getElementById(basicsFieldId(first))?.focus();
};

export const AddVenueFlow = ({ draft }: { draft: AddVenueDraft | null }) => {
  const router = useRouter();
  const phone = useIsPhone();
  const { setPageTitle, setPhoneBack } = usePageTitle();
  const [stage, setStage] = useState<'start' | 'basics' | 'source'>(
    draft === null ? 'start' : (draft.step ?? 'basics'),
  );
  const [venueId, setVenueId] = useState<string | null>(draft?.id ?? null);
  const [asking, setAsking] = useState(false);
  const [basics, setBasics] = useState<BasicsDraft>(
    draft?.basics ?? EMPTY_BASICS,
  );
  const [saved, setSaved] = useState<BasicsColumns | null>(
    draft === null ? null : basicsColumnsOf(draft.basics),
  );
  // A saved link is the admin's, never remade from the name.
  const [slugEdited, setSlugEdited] = useState(draft !== null);
  const [errors, setErrors] = useState<BasicsErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // State is stale inside a click's closure, so a second tap before the
  // re-render would start a second create; the ref closes that window.
  const saving = useRef(false);
  // The draft's id the moment a create returns, before `venueId` re-renders.
  const idRef = useRef<string | null>(draft?.id ?? null);

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
    setFormError(null);
  };

  /** True once Basics is saved as shown; false when it can't be. */
  const save = async (): Promise<boolean> => {
    if (saving.current) return false;
    const found = validateBasics(basics);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) {
      focusFirstInvalid(found);
      return false;
    }
    const next = basicsColumnsOf(basics);
    const keys = changedBasics(next, saved);
    if (keys.length === 0) return true;
    saving.current = true;
    setBusy(true);
    let outcome: SaveOutcome;
    try {
      const body = basicsFormData(next, keys);
      outcome =
        venueId === null
          ? await createDraftVenue(body)
          : await updateVenue(venueId, body);
    } catch {
      outcome = { success: false };
    }
    saving.current = false;
    setBusy(false);
    if (!outcome.success) {
      const field = saveErrorOf(outcome);
      if (field !== null) {
        setErrors(field);
        focusFirstInvalid(field);
      } else setFormError(COPY.errors.saveFailed);
      return false;
    }
    setSaved(next);
    if (venueId === null && outcome.id !== undefined) {
      setVenueId(outcome.id);
      idRef.current = outcome.id;
      // The link is set once saved; a later name edit no longer remakes it.
      setSlugEdited(true);
      // A replace, so Back leaves the flow rather than returning to an
      // unsaved Basics (plan decision 2).
      router.replace(addVenueHref(outcome.id, 'basics'));
    }
    return true;
  };

  // Continue: Basics saved as shown, then Source, which tests the page at once.
  const toSource = async () => {
    if (!(await save())) return;
    const id = venueId ?? idRef.current;
    if (id === null) return;
    setStage('source');
    router.replace(addVenueHref(id, SOURCE_STEP));
  };

  // From Source, Back returns to Basics. Before the draft exists, Back returns
  // to Start; after, it saves any edits
  // ("Saved as you go") and leaves for Venues, where the draft waits under
  // Drafts. An edit that can't be saved keeps the admin here with its error.
  const back = async () => {
    if (stage === 'source') {
      setStage('basics');
      if (venueId !== null) router.replace(addVenueHref(venueId, 'basics'));
    } else if (venueId === null) {
      setErrors({});
      setFormError(null);
      setStage('start');
    } else if (await save()) router.push(VENUES_HREF);
  };

  if (stage === 'start') {
    return <StartScreen phone={phone} onStart={() => setStage('basics')} />;
  }
  const onSource = stage === 'source' && venueId !== null;
  return (
    <>
      <AddVenueShell
        phone={phone}
        step={onSource ? 'source' : 'basics'}
        done={saved === null ? NOTHING_DONE : BASICS_DONE}
        name={basics.name}
        busy={busy}
        onBack={() => void back()}
        onContinue={() => void toSource()}
        continueDisabled={onSource}
      >
        {onSource ? (
          <SourceStep
            phone={phone}
            venueId={venueId}
            venueName={basics.name}
            pageUrl={normalizeWebsite(basics.website) ?? basics.website}
            onPageSaved={(url) => {
              setBasics((prev) => ({ ...prev, website: url }));
              setSaved((prev) =>
                prev === null ? prev : { ...prev, websiteUrl: url },
              );
            }}
            onAsk={() => setAsking(true)}
          />
        ) : (
          <BasicsStep
            phone={phone}
            draft={basics}
            errors={errors}
            formError={formError}
            busy={busy}
            onChange={change}
          />
        )}
      </AddVenueShell>
      {asking && venueId !== null && (
        <AskVenueSheet
          phone={phone}
          venueId={venueId}
          venueName={basics.name}
          onClose={() => setAsking(false)}
        />
      )}
    </>
  );
};

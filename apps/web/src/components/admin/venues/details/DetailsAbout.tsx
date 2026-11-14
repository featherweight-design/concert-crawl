'use client';

import { useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { generateVenueAbout } from '@/lib/actions/venues';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminButton, AdminCard as Card } from '@/components/admin/primitives';
import {
  GenerateField,
  type GenerateFieldResult,
  type GenerateFieldState,
} from '@/components/admin/generate-field/GenerateField';
import { inputStyle } from '../source/source-parts';
import { smallButton } from './details-parts';
import {
  capacityTypeLabel,
  editedFields,
  nearestCapacityType,
  type DetailsDraft,
} from './details-rules';

const COPY = ADMIN_COPY.venueDetails;

type Drafted = {
  result: GenerateFieldResult;
  capacity: number | null;
  venueType: string;
  neighborhood: string;
};

/** Where the About draft stands: the review UI's state and what it holds. */
export type AboutReview = {
  state: GenerateFieldState;
  drafted: Drafted | null;
  failed: string | undefined;
};

const IDLE: AboutReview = { state: 'idle', drafted: null, failed: undefined };

/** The fields an accepted draft fills besides About. */
type FilledKey = 'capacity' | 'venueType' | 'neighborhood';
const FILLED_KEYS: readonly FilledKey[] = [
  'capacity',
  'venueType',
  'neighborhood',
];

/** What the last accepted draft put in each field it filled. */
export type AboutFilled = Partial<Pick<DetailsDraft, FilledKey>>;

/**
 * The About draft's request and review, held by the Details tab rather than
 * the card: the card sits in a different parent on phone and desktop, so it
 * remounts across the breakpoint, and a paid draft in review must survive
 * that. Each request carries a token; only the latest one lands, so a
 * cancelled or overtaken draft never opens a review. It also remembers what
 * the last accepted draft filled, so a later draft may replace those values:
 * a draft's fill is not an admin's edit.
 */
export const useAboutDraft = (venueId: string) => {
  const [review, setReview] = useState<AboutReview>(IDLE);
  const [filled, setFilled] = useState<AboutFilled>({});
  const latest = useRef(0);

  const run = async () => {
    latest.current += 1;
    const token = latest.current;
    const settle = (next: AboutReview) => {
      if (token === latest.current) setReview(next);
    };
    setReview({ state: 'loading', drafted: null, failed: undefined });
    try {
      const result = await generateVenueAbout(venueId);
      if (!result.success || !result.data) {
        settle({
          state: 'error',
          drafted: null,
          failed: result.error ?? COPY.errors.draftFailed,
        });
        return;
      }
      const { about, capacity, venueType, neighborhood } = result.data;
      settle({
        state: 'review',
        drafted: {
          result: { content: about },
          capacity,
          venueType,
          neighborhood,
        },
        failed: undefined,
      });
    } catch (err) {
      // Logged even when overtaken: a stale failure is still a failure.
      console.error('DetailsAbout: draft failed', { venueId, err });
      settle({
        state: 'error',
        drafted: null,
        failed: COPY.errors.draftUnreachable,
      });
    }
  };

  /** Back to idle; any request still out is ignored when it lands. */
  const stop = () => {
    latest.current += 1;
    setReview(IDLE);
  };

  /** Stop, and forget the last draft's fills (the edits were discarded). */
  const reset = () => {
    stop();
    setFilled({});
  };

  return { review, filled, run, stop, reset, remember: setFilled };
};

/**
 * The About card (`details-d`): the text (280 at most, as the API takes;
 * a longer one is refused on save, never cut), then Write a draft, which
 * keeps the `generate-about` review: accept or discard, so a draft never
 * lands unreviewed. Accepting also fills capacity, type and neighborhood,
 * but only those the admin hasn't edited: a draft never replaces an edit.
 * Each is an edit until saved.
 */
export const DetailsAbout = ({
  id,
  draft,
  saved,
  error,
  saving,
  edit,
  review,
  filled,
  onDraft,
  onStop,
  onFilled,
}: {
  id: string;
  draft: DetailsDraft;
  /** The saved row as a draft: a field equal to it is unedited. */
  saved: DetailsDraft;
  error: string | undefined;
  /** A save is in flight: nothing may be drafted or accepted. */
  saving: boolean;
  edit: (patch: Partial<DetailsDraft>) => void;
  review: AboutReview;
  /** What the last accepted draft filled: still unedited if unchanged. */
  filled: AboutFilled;
  onDraft: () => void;
  onStop: () => void;
  onFilled: (filled: AboutFilled) => void;
}) => {
  const { state, drafted, failed } = review;

  const accept = (content: string) => {
    if (drafted !== null) {
      const edited = new Set(editedFields(draft, saved));
      // Unedited: as saved, or still what the last accepted draft put there.
      const unedited = (key: FilledKey) =>
        !edited.has(key) ||
        (filled[key] !== undefined && draft[key] === filled[key]);
      const patch: Partial<DetailsDraft> = { about: content };
      const fills: AboutFilled = {};
      for (const key of FILLED_KEYS) {
        // A fill the admin hasn't touched stays replaceable by a later draft.
        const kept = filled[key];
        if (kept !== undefined && draft[key] === kept) fills[key] = kept;
      }
      const fill = (key: FilledKey, value: string) => {
        patch[key] = value;
        fills[key] = value;
      };
      if (unedited('capacity') && drafted.capacity !== null) {
        fill('capacity', drafted.capacity.toLocaleString('en-US'));
      }
      if (unedited('venueType')) {
        const nearest = nearestCapacityType(drafted.venueType);
        fill(
          'venueType',
          nearest === null ? drafted.venueType : capacityTypeLabel(nearest),
        );
      }
      if (unedited('neighborhood')) {
        fill('neighborhood', drafted.neighborhood);
      }
      edit(patch);
      onFilled(fills);
    }
    onStop();
  };

  return (
    <Card title={COPY.cards.about} phone={false} testId="details-about">
      <textarea
        id={id}
        aria-label={COPY.cards.about}
        aria-invalid={error !== undefined}
        value={draft.about}
        // No maxLength: the browser would cut a long paste silently. Over
        // ABOUT_MAX is refused on save instead, with the text kept.
        disabled={saving || state === 'loading' || state === 'review'}
        onChange={(evt) => edit({ about: evt.target.value })}
        style={{
          ...inputStyle(error !== undefined),
          height: 'auto',
          minHeight: 96,
          padding: '10px 12px',
          lineHeight: 1.5,
          resize: 'vertical',
          fontFamily: 'inherit',
        }}
      />
      {error !== undefined && (
        <div role="alert" style={{ fontSize: 12, color: 'var(--danger)' }}>
          {error}
        </div>
      )}
      {state === 'idle' ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* The generator writes from the venue's name, address and type
              only; it never reads the site. Site-sourced drafts arrive with
              3d (drafting from allowed pages only). */}
          <AdminButton
            type="button"
            variant="outline"
            icon={Sparkles}
            disabled={saving}
            onClick={onDraft}
            style={smallButton}
          >
            {COPY.fields.about.draft}
          </AdminButton>
          <span
            style={{
              fontSize: 12,
              color: 'var(--fg-subtle)',
              alignSelf: 'center',
            }}
          >
            {COPY.fields.about.hint}
          </span>
        </div>
      ) : (
        <GenerateField
          state={state}
          result={drafted?.result}
          errorMessage={failed}
          onGenerate={onDraft}
          onRegenerate={onDraft}
          onCancel={onStop}
          onAccept={accept}
          onDiscard={onStop}
          disabled={saving}
        />
      )}
    </Card>
  );
};

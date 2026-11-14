'use client';

import { useState } from 'react';
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

/**
 * The About card (`details-d`): the text (280 at most, as the API takes),
 * then Draft from the venue's site, which keeps the `generate-about` review:
 * accept or discard, never saved unseen.
 */
export const DetailsAbout = ({
  venueId,
  id,
  draft,
  error,
  saving,
  edit,
}: {
  venueId: string;
  id: string;
  draft: DetailsDraft;
  error: string | undefined;
  saving: boolean;
  edit: (patch: Partial<DetailsDraft>) => void;
}) => {
  const [state, setState] = useState<GenerateFieldState>('idle');
  const [drafted, setDrafted] = useState<Drafted | null>(null);
  const [failed, setFailed] = useState<string | undefined>();

  const run = async () => {
    setState('loading');
    setFailed(undefined);
    setDrafted(null);
    try {
      const result = await generateVenueAbout(venueId);
      if (!result.success || !result.data) {
        setFailed(result.error ?? COPY.errors.draftFailed);
        setState('error');
        return;
      }
      const { about, capacity, venueType, neighborhood } = result.data;
      setDrafted({
        result: { content: about },
        capacity,
        venueType,
        neighborhood,
      });
      setState('review');
    } catch (err) {
      console.error('DetailsAbout: draft failed', { venueId, err });
      setFailed(COPY.errors.draftUnreachable);
      setState('error');
    }
  };

  // Accepting the draft also takes its capacity, type and neighborhood, as
  // the old editorial section did; each is an edit until saved.
  const accept = (content: string) => {
    if (drafted !== null) {
      const nearest = nearestCapacityType(drafted.venueType);
      edit({
        about: content.slice(0, 280),
        capacity:
          drafted.capacity === null
            ? draft.capacity
            : drafted.capacity.toLocaleString('en-US'),
        venueType:
          nearest === null ? drafted.venueType : capacityTypeLabel(nearest),
        neighborhood: drafted.neighborhood || draft.neighborhood,
      });
    }
    setState('idle');
    setDrafted(null);
  };

  const close = () => {
    setState('idle');
    setDrafted(null);
  };

  return (
    <Card title={COPY.cards.about} phone={false} testId="details-about">
      <textarea
        id={id}
        aria-label={COPY.cards.about}
        aria-invalid={error !== undefined}
        value={draft.about}
        maxLength={280}
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
          <AdminButton
            type="button"
            variant="outline"
            icon={Sparkles}
            disabled={saving}
            onClick={() => void run()}
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
          onGenerate={() => void run()}
          onRegenerate={() => void run()}
          onCancel={close}
          onAccept={accept}
          onDiscard={close}
        />
      )}
    </Card>
  );
};

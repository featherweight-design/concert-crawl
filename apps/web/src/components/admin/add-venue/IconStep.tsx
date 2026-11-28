'use client';

/**
 * Add a venue, step 3: Icon (`05/step-3-icon-optional`, `icon-drafting`,
 * `icon-drafts-failed-the-style-check`, `icon-mobile`). Reference images and
 * the name draft icons; one is chosen, the venue page hero is previewed on a
 * backdrop for its setting, and Continue saves both. The state lives in
 * `useIconDrafts`, held by the flow, so leaving and returning keeps the drafts.
 */

import { useRef, type CSSProperties, type ReactNode } from 'react';
import { Plus, Sparkles, X } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminButton, StatusBadge } from '@/components/admin/primitives';
import {
  Card,
  errorStyle,
  inputStyle,
} from '@/components/admin/venues/source/source-parts';
import { capacityTypeLabel } from '@/components/admin/venues/details/details-rules';
import { CustomNeonHero } from '@/components/consumer/venue-glyph/CustomNeonHero';
import { VenueGlyph } from '@/components/consumer/venue-glyph';
import type { VenueHeroSetting } from '@/components/consumer/venue-glyph/definitions/venue-settings';
import {
  HERO_SETTINGS_DESKTOP,
  HERO_SETTINGS_PHONE,
  REFERENCE_LIMIT,
  referenceSrc,
  type IconChoice,
} from './icon-rules';
import type { IconDrafts } from './useIconDrafts';

const COPY = ADMIN_COPY.addVenue.icon;
const SKELETON_ROWS = 3;

const lineStyle: CSSProperties = {
  fontSize: 13,
  color: 'var(--fg-muted)',
  lineHeight: 1.45,
  margin: 0,
};

/** The pill picker's chip: the chosen one carries the gradient edge. */
const chipStyle = (on: boolean): CSSProperties => ({
  height: 34,
  padding: '0 14px',
  borderRadius: 999,
  border: `1px solid ${on ? 'var(--signal)' : 'var(--border)'}`,
  background: on ? 'var(--surface-2)' : 'transparent',
  color: on ? 'var(--fg)' : 'var(--fg-muted)',
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: on ? 700 : 600,
  cursor: 'pointer',
});

/** A glyph in the rounded tile the boards draw it in. */
const GlyphTile = ({ svg, size }: { svg: string; size: number }) => (
  <span
    aria-hidden
    style={{
      width: size + 16,
      height: size + 16,
      flex: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Math.round((size + 16) / 3.2),
      border: '1px solid var(--border-strong)',
      background: 'var(--bg)',
      color: 'var(--signal)',
    }}
  >
    <VenueGlyph glyphKey={null} glyphSvg={svg} size={size} />
  </span>
);

interface IconStepProps {
  phone: boolean;
  venueId: string;
  venueName: string;
  icon: IconDrafts;
  /** Skip for now sits in the failed card as well as the footer. */
  onSkip: () => void;
}

const References = ({ phone, icon }: { phone: boolean; icon: IconDrafts }) => {
  const input = useRef<HTMLInputElement>(null);
  const full = icon.references.length >= REFERENCE_LIMIT;
  const files = (
    <input
      ref={input}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      multiple
      hidden
      data-testid="add-venue-icon-file"
      onChange={(event) => {
        const picked = Array.from(event.target.files ?? []);
        event.target.value = '';
        void icon.addFiles(picked);
      }}
    />
  );
  const steer = (
    <div>
      <input
        type="text"
        aria-label={COPY.references.steerLabel}
        placeholder={COPY.references.steerPlaceholder}
        maxLength={200}
        value={icon.steer}
        onChange={(event) => icon.setSteer(event.target.value)}
        data-testid="add-venue-icon-steer"
        style={{
          ...inputStyle(false),
          // iOS Safari zooms a focused input under 16px.
          ...(phone ? { fontSize: 16 } : {}),
        }}
      />
    </div>
  );
  const error =
    icon.error === null ? null : (
      <p role="alert" data-testid="add-venue-icon-error" style={errorStyle}>
        {icon.error}
      </p>
    );
  if (phone) {
    return (
      <>
        {files}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={full}
            data-testid="add-venue-icon-add"
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              height: 46,
              borderRadius: 10,
              border: '1px solid var(--border-strong)',
              background: 'var(--surface-2)',
              color: 'var(--fg)',
              fontFamily: 'inherit',
              fontSize: 15,
              fontWeight: 600,
              cursor: full ? 'not-allowed' : 'pointer',
              opacity: full ? 0.5 : 1,
            }}
          >
            <Plus size={16} aria-hidden />
            {COPY.references.addPhone}
          </button>
          {icon.references.length > 0 && (
            <span style={{ ...lineStyle, flex: 'none' }}>
              {COPY.references.added(icon.references.length)}
            </span>
          )}
        </div>
        {steer}
        {error}
      </>
    );
  }
  return (
    <>
      {files}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {icon.references.map((reference, index) => (
          <figure
            key={`${reference.name}-${index}`}
            data-testid="add-venue-icon-reference"
            style={{ margin: 0, width: 132 }}
          >
            <div style={{ position: 'relative' }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- a data URL of a file the admin just picked; next/image can't optimise it */}
              <img
                src={referenceSrc(reference)}
                alt=""
                width={132}
                height={88}
                style={{
                  width: 132,
                  height: 88,
                  objectFit: 'cover',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  display: 'block',
                }}
              />
              <button
                type="button"
                aria-label={COPY.references.remove(reference.name)}
                onClick={() => icon.removeReference(index)}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'color-mix(in srgb, var(--bg) 80%, transparent)',
                  color: 'var(--fg)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={12} aria-hidden />
              </button>
            </div>
            <figcaption
              style={{
                ...lineStyle,
                fontSize: 12,
                marginTop: 4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {reference.name}
            </figcaption>
          </figure>
        ))}
        {!full && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            data-testid="add-venue-icon-add"
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              width: 134,
              height: 94,
              borderRadius: 10,
              border: '1px dashed var(--border-strong)',
              background: 'transparent',
              color: 'var(--fg-muted)',
              fontFamily: 'inherit',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            <Plus size={14} aria-hidden />
            {COPY.references.add}
          </button>
        )}
      </div>
      <p style={lineStyle}>{COPY.references.hint}</p>
      {steer}
      {error}
    </>
  );
};

const Skeleton = () => (
  <div
    aria-hidden
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '14px 16px',
      borderRadius: 12,
      border: '1px solid var(--border)',
      background: 'var(--bg)',
    }}
  >
    <span
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: 'var(--surface-2)',
      }}
    />
    <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span
        style={{
          height: 9,
          width: 100,
          borderRadius: 5,
          background: 'var(--surface-2)',
        }}
      />
      <span
        style={{
          height: 9,
          width: 64,
          borderRadius: 5,
          background: 'var(--surface-2)',
        }}
      />
    </span>
    <span
      style={{
        height: 40,
        width: 150,
        borderRadius: 10,
        background: 'var(--surface-2)',
      }}
    />
  </div>
);

const DraftRow = ({
  choice,
  index,
  on,
  onPick,
}: {
  choice: IconChoice;
  index: number;
  on: boolean;
  onPick: () => void;
}) => (
  <label
    data-testid="add-venue-icon-draft"
    data-selected={on ? 'true' : undefined}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '12px 16px',
      borderRadius: 12,
      border: `1px solid ${on ? 'var(--signal)' : 'var(--border)'}`,
      background: on ? 'var(--surface-2)' : 'var(--bg)',
      cursor: 'pointer',
    }}
  >
    <input
      type="radio"
      name="add-venue-icon-draft"
      checked={on}
      onChange={onPick}
      aria-label={`${COPY.drafts.pick}: ${choice.label} (${index + 1})`}
    />
    <span style={{ flex: 1, minWidth: 0 }}>
      <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>
        {choice.label}
      </span>
      <span style={{ ...lineStyle, display: 'block', fontSize: 12.5 }}>
        {choice.caption}
      </span>
    </span>
    <GlyphTile svg={choice.svg} size={14} />
    <GlyphTile svg={choice.svg} size={20} />
    <GlyphTile svg={choice.svg} size={32} />
  </label>
);

const PhoneDraft = ({
  choice,
  on,
  onPick,
}: {
  choice: IconChoice;
  on: boolean;
  onPick: () => void;
}) => (
  <button
    type="button"
    role="radio"
    aria-checked={on}
    onClick={onPick}
    data-testid="add-venue-icon-draft"
    data-selected={on ? 'true' : undefined}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
      padding: '18px 8px 14px',
      borderRadius: 12,
      border: `1px solid ${on ? 'var(--signal)' : 'var(--border)'}`,
      background: on ? 'var(--surface-2)' : 'var(--bg)',
      color: 'var(--fg-muted)',
      fontFamily: 'inherit',
      fontSize: 14,
      cursor: 'pointer',
    }}
  >
    <GlyphTile svg={choice.svg} size={40} />
    {choice.label}
  </button>
);

const HeroPicker = ({ phone, icon }: { phone: boolean; icon: IconDrafts }) => {
  const order = phone ? HERO_SETTINGS_PHONE : HERO_SETTINGS_DESKTOP;
  return (
    <div
      role="radiogroup"
      aria-label={COPY.hero.setting}
      style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
    >
      {order.map((setting: VenueHeroSetting) => (
        <button
          key={setting}
          type="button"
          role="radio"
          aria-checked={icon.setting === setting}
          onClick={() => icon.setSetting(setting)}
          data-testid={`add-venue-icon-setting-${setting}`}
          style={chipStyle(icon.setting === setting)}
        >
          {capacityTypeLabel(setting)}
        </button>
      ))}
    </div>
  );
};

const HeroPreview = ({
  svg,
  setting,
  height,
  glyphSize,
}: {
  svg: string;
  setting: VenueHeroSetting;
  height: number;
  glyphSize: number;
}) => (
  <div
    data-testid="add-venue-icon-hero"
    style={{
      position: 'relative',
      height,
      borderRadius: 12,
      overflow: 'hidden',
      border: '1px solid var(--border)',
    }}
  >
    <CustomNeonHero glyphSvg={svg} setting={setting} glyphSize={glyphSize} />
  </div>
);

export const IconStep = ({
  phone,
  venueName,
  venueId,
  icon,
  onSkip,
}: IconStepProps) => {
  const upload = useRef<HTMLInputElement>(null);
  const drafting = icon.phase === 'drafting';
  const have = icon.choices.length > 0;
  const sources = [
    ...icon.references.map((reference) => reference.name),
    COPY.drafts.draftingSourceName,
  ];
  const sourceText =
    sources.length === 1
      ? sources[0]!
      : `${sources.slice(0, -1).join(', ')} and ${sources[sources.length - 1]!}`;
  const name = venueName.trim() || ADMIN_COPY.addVenue.rail.unnamed;

  const actions: ReactNode = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <input
        ref={upload}
        type="file"
        accept=".svg,image/svg+xml"
        hidden
        data-testid="add-venue-icon-upload"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file !== undefined) void icon.upload(file);
        }}
      />
      <AdminButton
        variant="outline"
        icon={Sparkles}
        disabled={drafting}
        onClick={() => void icon.draft(venueId)}
        data-testid="add-venue-icon-draft-button"
      >
        {have ? COPY.drafts.more(4) : COPY.drafts.draft}
      </AdminButton>
      <button
        type="button"
        onClick={() => upload.current?.click()}
        style={{
          padding: 0,
          background: 'none',
          border: 'none',
          fontFamily: 'inherit',
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--fg)',
          cursor: 'pointer',
        }}
      >
        {COPY.drafts.upload}
      </button>
      {!phone && <span style={lineStyle}>{COPY.drafts.gridNote}</span>}
    </div>
  );

  const failed = icon.phase === 'failed' && icon.hidden !== null;
  const list = drafting ? (
    <div
      data-testid="add-venue-icon-drafting"
      aria-live="polite"
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
          {COPY.drafts.drafting(4)}
        </h3>
        <StatusBadge kind="signal">{COPY.drafts.draftingBadge}</StatusBadge>
      </div>
      <p style={lineStyle}>{COPY.drafts.draftingSub(sourceText)}</p>
      {Array.from({ length: SKELETON_ROWS }, (_, row) => (
        <Skeleton key={row} />
      ))}
    </div>
  ) : failed && icon.hidden !== null ? (
    <div
      data-testid="add-venue-icon-failed"
      role="status"
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
          {COPY.drafts.failedTitle}
        </h3>
        <StatusBadge kind="warning">{icon.hidden.badge}</StatusBadge>
      </div>
      <p style={lineStyle}>{icon.hidden.body}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <AdminButton
          variant="gradient"
          icon={Sparkles}
          onClick={() => void icon.draft(venueId)}
        >
          {COPY.drafts.draftAgain}
        </AdminButton>
        <AdminButton variant="outline" onClick={() => upload.current?.click()}>
          {COPY.drafts.upload}
        </AdminButton>
        <button
          type="button"
          onClick={onSkip}
          style={{
            padding: '0 8px',
            background: 'none',
            border: 'none',
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--fg-muted)',
            cursor: 'pointer',
          }}
        >
          {ADMIN_COPY.addVenue.footer.skip}
        </button>
      </div>
    </div>
  ) : have ? (
    <div
      role={phone ? 'radiogroup' : undefined}
      aria-label={COPY.drafts.title}
      style={
        phone
          ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }
          : { display: 'flex', flexDirection: 'column', gap: 10 }
      }
    >
      {icon.choices.map((choice, index) =>
        phone ? (
          <PhoneDraft
            key={`${choice.label}-${index}`}
            choice={choice}
            on={icon.chosen === index}
            onPick={() => icon.choose(index)}
          />
        ) : (
          <DraftRow
            key={`${choice.label}-${index}`}
            choice={choice}
            index={index}
            on={icon.chosen === index}
            onPick={() => icon.choose(index)}
          />
        ),
      )}
    </div>
  ) : null;

  const hero =
    icon.picked === null ? null : (
      <>
        <HeroPreview
          svg={icon.picked.svg}
          setting={icon.setting}
          height={phone ? 150 : 270}
          glyphSize={phone ? 90 : 150}
        />
        {!phone && <p style={lineStyle}>{COPY.hero.note}</p>}
        <HeroPicker phone={phone} icon={icon} />
      </>
    );

  if (phone) {
    return (
      <div
        data-testid="add-venue-icon"
        style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>
          {COPY.phoneTitle(name)}
        </h1>
        <References phone icon={icon} />
        {list}
        {!failed && actions}
        {icon.picked !== null && (
          <>
            <div style={{ ...lineStyle, fontWeight: 600 }}>
              {COPY.hero.backdrop}
            </div>
            {hero}
          </>
        )}
      </div>
    );
  }
  return (
    <div
      data-testid="add-venue-icon"
      style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
    >
      <div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>
          {COPY.title(name)}
        </h1>
        <p style={{ ...lineStyle, marginTop: 4 }}>{COPY.sub}</p>
      </div>
      <Card
        title={`1 · ${COPY.references.title}`}
        phone={false}
        testId="add-venue-icon-references"
      >
        <References phone={false} icon={icon} />
      </Card>
      <Card
        title={`2 · ${COPY.drafts.title}`}
        phone={false}
        testId="add-venue-icon-drafts"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {list}
          {!failed && actions}
        </div>
      </Card>
      {hero !== null && (
        <Card
          title={`3 · ${COPY.hero.title}`}
          phone={false}
          testId="add-venue-icon-hero-card"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {hero}
          </div>
        </Card>
      )}
    </div>
  );
};

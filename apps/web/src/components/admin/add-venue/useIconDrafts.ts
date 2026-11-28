'use client';

import { useCallback, useRef, useState } from 'react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import type { VenueHeroSetting } from '@/components/consumer/venue-glyph/definitions/venue-settings';
import type { GlyphReference } from '@/lib/admin/glyph-drafts-schema';
import { draftVenueGlyphs } from '@/lib/actions/venues';
import {
  REFERENCE_LIMIT,
  REFERENCE_MAX_CHARS,
  base64Of,
  checkReferenceFile,
  choicesOf,
  heroSettingGuess,
  hiddenSummary,
  uploadChoice,
  type IconChoice,
} from './icon-rules';

const COPY = ADMIN_COPY.addVenue.icon;

const readDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('not text'));
    reader.onerror = () => reject(reader.error ?? new Error('unreadable'));
    reader.readAsDataURL(file);
  });

export type IconPhase = 'idle' | 'drafting' | 'failed';

/**
 * The Icon step's state, kept by the flow so Back and Continue keep the
 * references, drafts and choice (a draft costs a model call; leaving the step
 * must not throw four away). Nothing here is saved until the flow saves the
 * chosen icon.
 */
export const useIconDrafts = (capacityType: string) => {
  const [references, setReferences] = useState<GlyphReference[]>([]);
  const [steer, setSteer] = useState('');
  const [choices, setChoices] = useState<IconChoice[]>([]);
  const [chosen, setChosen] = useState<number | null>(null);
  const [setting, setSetting] = useState<VenueHeroSetting | null>(null);
  const [phase, setPhase] = useState<IconPhase>('idle');
  const [hidden, setHidden] = useState<{ badge: string; body: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  // One ask at a time: a second tap before the re-render would pay twice.
  const asking = useRef(false);
  // The list as of now, so an ask that lands later numbers its rows from the
  // list it joins, not the one it started from.
  const choicesRef = useRef<IconChoice[]>([]);
  const append = useCallback((fresh: IconChoice[], select: 'first' | 'new') => {
    const start = choicesRef.current.length;
    choicesRef.current = [...choicesRef.current, ...fresh];
    setChoices(choicesRef.current);
    setChosen((prev) => (select === 'new' ? start : (prev ?? start)));
  }, []);

  const addFiles = useCallback(
    async (files: readonly File[]) => {
      setError(null);
      const room = REFERENCE_LIMIT - references.length;
      if (room <= 0) {
        setError(COPY.references.limit);
        return;
      }
      const added: GlyphReference[] = [];
      for (const file of files.slice(0, room)) {
        const check = checkReferenceFile(file);
        if (!check.ok) {
          setError(check.error);
          continue;
        }
        try {
          const data = base64Of(await readDataUrl(file));
          if (data.length > REFERENCE_MAX_CHARS) {
            setError(COPY.references.tooLarge(file.name));
            continue;
          }
          added.push({ name: file.name, mediaType: check.mediaType, data });
        } catch {
          setError(COPY.references.unreadable(file.name));
        }
      }
      if (files.length > room) setError(COPY.references.limit);
      if (added.length > 0) setReferences((prev) => [...prev, ...added]);
    },
    [references.length],
  );

  const removeReference = useCallback((index: number) => {
    setError(null);
    setReferences((prev) => prev.filter((_, at) => at !== index));
  }, []);

  const draft = useCallback(
    async (venueId: string) => {
      if (asking.current) return;
      asking.current = true;
      setPhase('drafting');
      setError(null);
      setHidden(null);
      const outcome = await draftVenueGlyphs(venueId, references, steer);
      asking.current = false;
      if (!outcome.ok) {
        setPhase('idle');
        setError(outcome.error ?? COPY.drafts.requestFailed);
        return;
      }
      const fresh = choicesOf(outcome.data);
      if (fresh.length === 0) {
        setHidden(hiddenSummary(outcome.data.hidden));
        setPhase('failed');
        return;
      }
      setPhase('idle');
      append(fresh, 'first');
    },
    [references, steer, append],
  );

  const upload = useCallback(
    async (file: File) => {
      setError(null);
      let text: string;
      try {
        text = await file.text();
      } catch {
        setError(COPY.references.unreadable(file.name));
        return;
      }
      const result = uploadChoice(text, file.name);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPhase('idle');
      setHidden(null);
      append([result.choice], 'new');
    },
    [append],
  );

  const picked = chosen === null ? null : (choices[chosen] ?? null);
  return {
    references,
    steer,
    setSteer,
    choices,
    chosen,
    choose: setChosen,
    picked,
    setting: setting ?? heroSettingGuess(capacityType),
    setSetting,
    phase,
    hidden,
    error,
    addFiles,
    removeReference,
    draft,
    upload,
    fail: setError,
  };
};

export type IconDrafts = ReturnType<typeof useIconDrafts>;

'use client';

import { useEffect, useState } from 'react';

/**
 * The admin shell's one breakpoint (plan decision 16). The shell keeps its own
 * `MOBILE_BREAKPOINT` constant until 0a and 0b both land; 0c points it here.
 */
export const ADMIN_PHONE_MAX_WIDTH = 720;

/**
 * As `useIsPhone`, but null until the media query has been read, for a
 * surface that must not paint its desktop form for a frame on a phone (a
 * modal that would flash as a centred dialog before becoming a sheet).
 */
export const useIsPhoneResolved = (): boolean | null => {
  const [isPhone, setIsPhone] = useState<boolean | null>(null);
  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${ADMIN_PHONE_MAX_WIDTH}px)`);
    const update = () => setIsPhone(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return isPhone;
};

/**
 * Below this viewport width a 440 panel docked beside the list would leave the
 * list a sliver (the admin sidebar and gutters take 288 of it), so the panel
 * overlays instead. The boards draw only the wide desktop.
 */
export const DOCKED_PANEL_MIN_VIEWPORT = 1100;

/**
 * True on a desktop too narrow to dock a panel beside the list. False until
 * mounted (and where there is no `matchMedia`), so the panel docks by default.
 */
export const useIsNarrowDesktop = (): boolean => {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(
      `(max-width: ${DOCKED_PANEL_MIN_VIEWPORT - 1}px)`,
    );
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return narrow;
};

/** True below the admin breakpoint. False until mounted, so SSR renders desktop. */
export const useIsPhone = (): boolean => {
  const [isPhone, setIsPhone] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${ADMIN_PHONE_MAX_WIDTH}px)`);
    const update = () => setIsPhone(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return isPhone;
};

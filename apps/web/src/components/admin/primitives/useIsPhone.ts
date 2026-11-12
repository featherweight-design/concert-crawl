'use client';

import { useEffect, useState } from 'react';

/**
 * The admin shell's one breakpoint (plan decision 16). The shell keeps its own
 * `MOBILE_BREAKPOINT` constant until 0a and 0b both land; 0c points it here.
 */
export const ADMIN_PHONE_MAX_WIDTH = 720;

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

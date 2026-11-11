'use client';

import { useMediaQuery } from '@/lib/hooks/useMediaQuery';

import { REDUCED_MOTION_QUERY } from './index';

/** Follows the reduced-motion setting, including changes while mounted. */
export function useReducedMotion(): boolean {
  return useMediaQuery(REDUCED_MOTION_QUERY);
}

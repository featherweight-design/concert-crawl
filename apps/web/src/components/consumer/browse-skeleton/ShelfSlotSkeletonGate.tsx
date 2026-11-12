'use client';

import type { ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { isShelfSlotOpenForParams } from '@/lib/browse-shelf-slot';

// Route fallbacks get no searchParams, and Next reuses a prefetched loading
// boundary across URLs, so the server cannot know which view the viewer is
// heading to. The client can: this reads the live URL and draws the shelf
// skeleton only where page.tsx would draw a shelf (list view, no crew lens).
export const ShelfSlotSkeletonGate = ({
  children,
}: {
  children: ReactNode;
}) => {
  const searchParams = useSearchParams();
  return isShelfSlotOpenForParams(searchParams) ? children : null;
};

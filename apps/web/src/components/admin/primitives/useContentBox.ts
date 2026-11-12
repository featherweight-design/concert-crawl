'use client';

import { useLayoutEffect, useState } from 'react';

export interface ContentBox {
  top: number;
  left: number;
}

/**
 * Where the admin content area starts, for layers that cover it and leave the
 * sidebar and topbar alone: a side panel's scrim (`03/llm-budget-panel`), the
 * Venues Select bar (`A3/03/venues-select-d`). The shell marks that area with
 * `data-admin-content`; without it (tests, the phone) the box is the viewport.
 */
export const useContentBox = (): ContentBox => {
  const [box, setBox] = useState<ContentBox>({ top: 0, left: 0 });
  useLayoutEffect(() => {
    const content = document.querySelector('[data-admin-content]');
    if (!content) return;
    const measure = () => {
      const rect = content.getBoundingClientRect();
      setBox({ top: rect.top, left: rect.left });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  return box;
};

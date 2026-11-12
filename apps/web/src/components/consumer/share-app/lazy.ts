'use client';

// The Share Concert Crawl sheet, loaded on demand.
//
// The account menu lives in the app-wide provider, so a static import would put
// the QR encoder on every page for a sheet most visits never open. Mounted on
// the first open and kept mounted after, so closing still runs the sheet's own
// exit path. Same shape as `tier-picker/lazy.ts`.

import dynamic from 'next/dynamic';
import { createElement, useState, type ComponentType } from 'react';
import type { ShareAppSheetProps } from './ShareAppSheet';

const DynamicShareAppSheet: ComponentType<ShareAppSheetProps> = dynamic(
  () => import('./ShareAppSheet').then((mod) => mod.ShareAppSheet),
  { ssr: false },
);

export const ShareAppSheet = (props: ShareAppSheetProps) => {
  const [hasOpened, setHasOpened] = useState(props.open);
  if (props.open && !hasOpened) setHasOpened(true);
  return hasOpened || props.open
    ? createElement(DynamicShareAppSheet, props)
    : null;
};

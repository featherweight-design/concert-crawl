'use client';

import type { ReactNode } from 'react';
import { BottomSheet } from '@/components/pwa/BottomSheet';
import { AUTH_FLOW_COPY } from './definitions/copy';

const COPY = AUTH_FLOW_COPY;

/**
 * Terms, Privacy and the Beta Agreement open in place, so the form behind
 * keeps its fields and its tick. A bottom sheet on the phone, a 640px dialog
 * from `lg`. The page is the live legal page; this is only the frame.
 */
export function LegalSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      maxWidth={640}
      edgeFromSm
      raised
      handle
      eyebrow={COPY.legal.eyebrow}
      eyebrowTone="signal"
      closeText={COPY.legal.done}
      closeVariant="bare"
    >
      {children}
    </BottomSheet>
  );
}

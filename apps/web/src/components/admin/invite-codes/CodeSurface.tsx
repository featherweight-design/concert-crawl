'use client';

import type { ReactNode } from 'react';
import {
  AdminSheet,
  KindLabel,
  SidePanel,
  useIsPhone,
} from '@/components/admin/primitives';
import { MONO } from './code-styles';

/** A code's big mono heading, as `07/a-code-in-flow` draws it. */
export const CodeTitle = ({ code }: { code: string }) => (
  <span style={{ ...MONO, fontSize: 22, fontWeight: 700 }}>{code}</span>
);

/**
 * Where a code's panels open: the side panel on desktop, a sheet on the phone
 * (plan decision 1). `fullScreen` is for the code panel; edits are bottom
 * sheets.
 */
export const CodeSurface = ({
  title,
  label,
  subtitle,
  children,
  footer,
  onClose,
  fullScreen = false,
  dismissible = true,
  footerLayout = 'end',
}: {
  title: ReactNode;
  /** The accessible name when `title` is a node. */
  label: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  fullScreen?: boolean;
  dismissible?: boolean;
  /** The desktop panel's footer layout; see `SidePanel`. */
  footerLayout?: 'end' | 'ruled';
}) => {
  const isPhone = useIsPhone();
  const sub = subtitle ? { subtitle } : {};
  if (isPhone) {
    return (
      <AdminSheet
        title={title}
        label={label}
        {...sub}
        footer={footer}
        onClose={onClose}
        fullScreen={fullScreen}
        dismissible={dismissible}
      >
        {children}
      </AdminSheet>
    );
  }
  return (
    <SidePanel
      eyebrow={<KindLabel kind="inviteCode" />}
      title={title}
      {...sub}
      footer={footer}
      footerLayout={footerLayout}
      onClose={onClose}
      dismissible={dismissible}
    >
      {children}
    </SidePanel>
  );
};

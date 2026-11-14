'use client';

import { createContext, useContext, useState } from 'react';
import type { Crumb } from './breadcrumbs';

interface PageTitleContextValue {
  pageTitle: string | null;
  setPageTitle: (title: string | null) => void;
  /**
   * The crumbs after the section, for a page deeper than one level (Inspect:
   * Venues / {Venue} / Runs / Inspect). Wins over `pageTitle`; its last crumb
   * is the phone header's title.
   */
  pageTrail: readonly Crumb[] | null;
  setPageTrail: (trail: readonly Crumb[] | null) => void;
  /**
   * A page whose phone board draws a "‹ Parent" back link in place of the
   * title bar (the venue page: `venue-overview-m`, `source-feed-edited`).
   * Set, it replaces the phone header; other routes keep the title bar.
   */
  phoneBack: PhoneBack | null;
  setPhoneBack: (back: PhoneBack | null) => void;
}

export interface PhoneBack {
  label: string;
  href: string;
}

export const PageTitleContext = createContext<PageTitleContextValue>({
  pageTitle: null,
  setPageTitle: () => {},
  pageTrail: null,
  setPageTrail: () => {},
  phoneBack: null,
  setPhoneBack: () => {},
});

export const usePageTitle = () => useContext(PageTitleContext);

export const PageTitleProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [pageTitle, setPageTitle] = useState<string | null>(null);
  const [pageTrail, setPageTrail] = useState<readonly Crumb[] | null>(null);
  const [phoneBack, setPhoneBack] = useState<PhoneBack | null>(null);
  return (
    <PageTitleContext.Provider
      value={{
        pageTitle,
        setPageTitle,
        pageTrail,
        setPageTrail,
        phoneBack,
        setPhoneBack,
      }}
    >
      {children}
    </PageTitleContext.Provider>
  );
};

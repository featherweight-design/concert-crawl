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
}

export const PageTitleContext = createContext<PageTitleContextValue>({
  pageTitle: null,
  setPageTitle: () => {},
  pageTrail: null,
  setPageTrail: () => {},
});

export const usePageTitle = () => useContext(PageTitleContext);

export const PageTitleProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [pageTitle, setPageTitle] = useState<string | null>(null);
  const [pageTrail, setPageTrail] = useState<readonly Crumb[] | null>(null);
  return (
    <PageTitleContext.Provider
      value={{ pageTitle, setPageTitle, pageTrail, setPageTrail }}
    >
      {children}
    </PageTitleContext.Provider>
  );
};

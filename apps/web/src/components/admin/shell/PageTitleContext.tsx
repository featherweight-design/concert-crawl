'use client'

import { createContext, useContext, useState } from 'react'

interface PageTitleContextValue {
  pageTitle: string | null
  setPageTitle: (title: string | null) => void
}

export const PageTitleContext = createContext<PageTitleContextValue>({
  pageTitle: null,
  setPageTitle: () => {},
})

export const usePageTitle = () => useContext(PageTitleContext)

export const PageTitleProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [pageTitle, setPageTitle] = useState<string | null>(null)
  return (
    <PageTitleContext.Provider value={{ pageTitle, setPageTitle }}>
      {children}
    </PageTitleContext.Provider>
  )
}

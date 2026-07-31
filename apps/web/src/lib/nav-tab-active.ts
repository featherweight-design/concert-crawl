interface NavTab {
  href: string
  matchPrefixes?: readonly string[]
}

// "My shows" owns two routes (/watching and /history), so href alone can no
// longer decide the active tab. matchPrefixes is additive — href always
// matches, so a tab can never stop lighting on its own destination.
export const isTabActive = (tab: NavTab, pathname: string): boolean =>
  [tab.href, ...(tab.matchPrefixes ?? [])].some((prefix) =>
    pathname.startsWith(prefix),
  )

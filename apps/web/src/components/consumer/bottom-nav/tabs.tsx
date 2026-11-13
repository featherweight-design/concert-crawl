import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

// The bottom nav's four link tabs. Its own module so the offline page can draw
// the same tabs without importing BottomNav, which pulls in Clerk and React
// Query.
const COPY = CONSUMER_COPY.bottomNav;

export const STATIC_TABS = [
  {
    key: COPY.nav.tabs[0].key,
    label: COPY.nav.tabs[0].label,
    href: COPY.nav.tabs[0].href,
    matchPrefixes: COPY.nav.tabs[0].matchPrefixes,
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <line
          x1="2"
          y1="4.5"
          x2="16"
          y2="4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="2"
          y1="9"
          x2="16"
          y2="9"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="2"
          y1="13.5"
          x2="16"
          y2="13.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    key: COPY.nav.tabs[1].key,
    label: COPY.nav.tabs[1].label,
    href: COPY.nav.tabs[1].href,
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path
          d="M9 1.5C6.515 1.5 4.5 3.515 4.5 6c0 3.375 4.5 10.5 4.5 10.5S13.5 9.375 13.5 6c0-2.485-2.015-4.5-4.5-4.5z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx="9" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    key: COPY.nav.tabs[2].key,
    label: COPY.nav.tabs[2].label,
    href: COPY.nav.tabs[2].href,
    matchPrefixes: COPY.nav.tabs[2].matchPrefixes,
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path
          d="M1 9C1 9 4 3 9 3s8 6 8 6-3 6-8 6-8-6-8-6z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    key: COPY.nav.tabs[3].key,
    label: COPY.nav.tabs[3].label,
    href: COPY.nav.tabs[3].href,
    // Three overlapping rings: a small group. Deliberately not the Watching
    // eye and deliberately not a heart — a crew is a set of people.
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <circle
          cx="6"
          cy="6.75"
          r="3.75"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle
          cx="12"
          cy="6.75"
          r="3.75"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle
          cx="9"
          cy="11.25"
          r="3.75"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    ),
  },
] as const;

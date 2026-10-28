# Concert Crawl extension for css-layout-triage

## Reference incident

The generic skill's reference incident is Issue #33 (browse-page horizontal
overflow, July 2026). Three container fixes failed because the overflow came
from a `.sr-only` element with no positioned ancestor; the fix was adding
`relative` to the page-chrome wrapper.

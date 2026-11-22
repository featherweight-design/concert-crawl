import { vi } from 'vitest';
import type * as FollowedNamesModule from '@/lib/queries/use-followed-artist-names';

// jsdom ships no ResizeObserver, and the row's measure passes construct one on
// mount — without this every test that renders a row throws before asserting.
// The stub never fires, so those passes fall through to their pre-layout
// defaults, which is what a layout-less environment should show.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// The Followed highlight reads the viewer's follows through react-query and
// Clerk, and neither provider exists in a row-level render test. Default to
// "follows nobody" everywhere; a test that wants a mark overrides it with
// `vi.mocked(useFollowedArtistNames).mockReturnValue(new Set([...]))`.
vi.mock('@/lib/queries/use-followed-artist-names', async (importOriginal) => ({
  ...(await importOriginal<typeof FollowedNamesModule>()),
  useFollowedArtistNames: vi.fn(() => new Set<string>()),
  useInvalidateFollowedArtistNames: vi.fn(() => () => {}),
}));

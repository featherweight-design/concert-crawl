import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({ requireAdminUser: vi.fn(async () => ({})) }));
vi.mock('@/components/admin/prices/PricesClient', () => ({
  PricesClient: () => null,
}));

// The page returns the client element; its prop is what the page decides.
const tabOf = async (searchParams?: Record<string, string>) => {
  const { default: Page } = await import('./page');
  const element = await Page(
    searchParams === undefined
      ? {}
      : { searchParams: Promise.resolve(searchParams) },
  );
  return element.props.initialTab;
};

describe('/admin/prices', () => {
  it('opens the Missing a price tab by default', async () => {
    expect(await tabOf()).toBe('missing');
  });

  it('opens the tab ?tab= names, and Missing for anything else', async () => {
    expect(await tabOf({ tab: 'submitted' })).toBe('submitted');
    expect(await tabOf({ tab: 'checks' })).toBe('checks');
    expect(await tabOf({ tab: 'nope' })).toBe('missing');
  });
});

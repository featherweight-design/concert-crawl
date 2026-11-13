import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/auth', () => ({ requireAdminUser: vi.fn(async () => ({})) }));
vi.mock('@/components/admin/prices/PricesClient', () => ({
  PricesClient: ({ initialTab }: { initialTab: string }) => (
    <div data-testid="prices-client">{initialTab}</div>
  ),
}));

describe('/admin/prices', () => {
  it('opens the Missing a price tab by default', async () => {
    const { default: Page } = await import('./page');
    render(await Page({}));
    expect(screen.getByTestId('prices-client').textContent).toBe('missing');
  });

  it('opens the tab ?tab= names, and Missing for anything else', async () => {
    const { default: Page } = await import('./page');
    render(await Page({ searchParams: Promise.resolve({ tab: 'submitted' }) }));
    expect(screen.getByTestId('prices-client').textContent).toBe('submitted');
    render(await Page({ searchParams: Promise.resolve({ tab: 'nope' }) }));
    expect(screen.getAllByTestId('prices-client')[1]?.textContent).toBe(
      'missing',
    );
  });
});

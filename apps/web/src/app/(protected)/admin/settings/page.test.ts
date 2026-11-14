import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  permanentRedirect: (href: string) => {
    throw new Error(`NEXT_REDIRECT ${href}`);
  },
}));

import SettingsPage from './page';

describe('old /admin/settings URL', () => {
  it('forwards to Operations › Emails, where the test email moved', () => {
    expect(() => SettingsPage()).toThrow(
      'NEXT_REDIRECT /admin/operations?tab=emails',
    );
  });
});

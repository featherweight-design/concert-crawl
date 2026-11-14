// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import AdminNotFound from './not-found';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  PageTitleProvider,
  usePageTitle,
} from '@/components/admin/shell/PageTitleContext';

const TitleProbe = () => {
  const { pageTitle } = usePageTitle();
  return <output data-testid="page-title">{pageTitle ?? ''}</output>;
};

afterEach(cleanup);

describe('AdminNotFound', () => {
  it('names its own crumb, so a failed venue page drops the loading "…"', () => {
    render(
      <PageTitleProvider>
        <AdminNotFound />
        <TitleProbe />
      </PageTitleProvider>,
    );
    expect(screen.getByTestId('page-title').textContent).toBe(
      ADMIN_COPY.shell.crumbs.notFound,
    );
  });

  it('clears the crumb when it unmounts', () => {
    const { rerender } = render(
      <PageTitleProvider>
        <AdminNotFound />
        <TitleProbe />
      </PageTitleProvider>,
    );
    rerender(
      <PageTitleProvider>
        <TitleProbe />
      </PageTitleProvider>,
    );
    expect(screen.getByTestId('page-title').textContent).toBe('');
  });
});

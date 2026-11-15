// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AUTH_FLOW_COPY } from './definitions/copy';
import { IntentCard, intentText } from './IntentCard';

const COPY = AUTH_FLOW_COPY.intent;
afterEach(() => {
  cleanup();
});

const show = {
  kind: 'show',
  title: 'Static Dress',
  eyebrow: 'Fri, Nov 14 · Marquis',
} as const;

describe('intentText', () => {
  it('says what pressing Watch will do', () => {
    expect(intentText(show)).toEqual({
      eyebrow: 'Fri, Nov 14 · Marquis',
      title: 'Sign in to watch Static Dress',
      sub: COPY.watchSub,
    });
  });

  it('names a page, and has nothing for the generic subject', () => {
    expect(intentText({ kind: 'page', page: 'My shows' })).toEqual({
      eyebrow: 'My shows',
      title: 'Sign in to see My shows',
      sub: COPY.pageSub,
    });
    expect(intentText({ kind: 'generic' })).toBeNull();
  });
});

describe('IntentCard', () => {
  it('is the page title (h1) on sign-in', () => {
    render(<IntentCard subject={{ kind: 'page', page: 'Settings' }} asTitle />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Sign in to see Settings',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(COPY.pageSub)).toBeInTheDocument();
  });

  it('is styled as a title but is no heading on sign-up, where the form owns the h1', () => {
    render(<IntentCard subject={show} asTitle={false} />);
    expect(screen.queryByRole('heading')).toBeNull();
    expect(
      screen.getByText('Sign in to watch Static Dress'),
    ).toBeInTheDocument();
  });

  it('draws nothing for the generic subject', () => {
    const { container } = render(
      <IntentCard subject={{ kind: 'generic' }} asTitle />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

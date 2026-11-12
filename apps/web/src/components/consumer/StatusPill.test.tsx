// @vitest-environment jsdom

import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { StatusPill } from './StatusPill';

afterEach(cleanup);

describe('StatusPill', () => {
  it('renders nothing for an upcoming show', () => {
    const { container } = render(
      <StatusPill status="upcoming" fontSize={10} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('reads Cancelled, in the danger colour, for a confirmed cancellation', () => {
    render(<StatusPill status="cancelled" fontSize={10} />);
    const pill = screen.getByText(CONSUMER_COPY.cancelledLabel);
    expect(pill.className).not.toContain('border-dashed');
  });

  it('reads No longer listed, grey and dashed, for a delisted show', () => {
    render(<StatusPill status="cancelled" fontSize={10} delisted />);
    const pill = screen.getByTestId('status-pill-removed');
    expect(pill.textContent).toBe(CONSUMER_COPY.noLongerListedLabel);
    expect(pill.className).toContain('border-dashed');
  });
});

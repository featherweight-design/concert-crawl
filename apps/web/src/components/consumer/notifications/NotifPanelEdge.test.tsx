// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { NotifPanelEdge } from './NotifPanelEdge';

afterEach(cleanup);

describe('NotifPanelEdge', () => {
  it('renders a decorative svg that follows the border box', () => {
    render(<NotifPanelEdge />);
    const edge = screen.getByTestId('notif-panel-edge');
    expect(edge.tagName.toLowerCase()).toBe('svg');
    expect(edge.getAttribute('aria-hidden')).toBe('true');
    expect(edge.style.left).toBe('-1px');
    expect(edge.style.top).toBe('-1px');
  });
});

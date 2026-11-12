import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NotifPanelEdge } from './NotifPanelEdge';

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

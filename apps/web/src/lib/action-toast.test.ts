import { describe, it, expect } from 'vitest';
import {
  ACTION_TOAST_STYLE,
  TOAST_ACTION_STYLE,
  TOAST_ICON_SIZE,
  actionToastOptions,
} from './action-toast';

// Board 04/removed-d (B+ addendum 3): Undo in #7AE6FF at 800, a 16px check,
// on #1F2748. Each value is a theme token, never the hex.
describe('the shared action toast', () => {
  it('draws the action in signal cyan at weight 800, never the accent', () => {
    expect(TOAST_ACTION_STYLE.color).toBe('var(--signal)');
    expect(TOAST_ACTION_STYLE.fontWeight).toBe(800);
    expect(TOAST_ACTION_STYLE.background).toBe('transparent');
  });

  it('sits on the surface-3 token, the board #1F2748', () => {
    expect(ACTION_TOAST_STYLE.background).toBe('var(--surface-3)');
    expect(ACTION_TOAST_STYLE.color).toBe('var(--fg)');
  });

  it('sizes the icon at 16px', () => {
    expect(TOAST_ICON_SIZE).toBe(16);
  });

  it('bundles both styles for a toast to spread in', () => {
    expect(actionToastOptions).toEqual({
      style: ACTION_TOAST_STYLE,
      actionButtonStyle: TOAST_ACTION_STYLE,
    });
  });

  it('hard-codes no colour', () => {
    const values = [
      ...Object.values(ACTION_TOAST_STYLE),
      ...Object.values(TOAST_ACTION_STYLE),
    ];
    for (const value of values) {
      expect(String(value)).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    }
  });
});

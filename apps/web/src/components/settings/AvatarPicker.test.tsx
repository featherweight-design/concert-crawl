// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { AvatarColor } from '@concert-crawl/types';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { AvatarPicker } from './AvatarPicker';

const COPY = CONSUMER_COPY.settings;

const pairLabel = (first: AvatarColor, second: AvatarColor) =>
  COPY.avatarPairSwatchAriaLabel(
    COPY.avatarColorNames[first],
    COPY.avatarColorNames[second],
  );
const solidLabel = (color: AvatarColor) =>
  COPY.avatarColorSwatchAriaLabel(COPY.avatarColorNames[color]);

afterEach(cleanup);

const pressed = () =>
  screen
    .getAllByRole('button')
    .filter((button) => button.getAttribute('aria-pressed') === 'true')
    .map((button) => button.getAttribute('aria-label'));

describe('AvatarPicker', () => {
  // The board's order (more-s-e_mix), written out: reordering a pair in the
  // constants must fail here, not follow it.
  it('draws the six pairs in the board order, then four solids', () => {
    render(
      <AvatarPicker
        handle="adal"
        avatarColor="signal"
        avatarSecondColor="accent"
        onChange={vi.fn()}
      />,
    );
    const labels = screen
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label'));
    expect(labels).toEqual([
      'Avatar colors: blue and pink',
      'Avatar colors: pink and amber',
      'Avatar colors: green and blue',
      'Avatar colors: amber and green',
      'Avatar colors: pink and green',
      'Avatar colors: blue and amber',
      'Avatar color: blue',
      'Avatar color: pink',
      'Avatar color: green',
      'Avatar color: amber',
    ]);
  });

  it('labels the two rows as groups, for a screen reader', () => {
    render(
      <AvatarPicker
        handle="adal"
        avatarColor="signal"
        avatarSecondColor="accent"
        onChange={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('group', { name: COPY.avatarMixTwoEyebrow }),
    ).toBeTruthy();
    expect(
      screen.getByRole('group', { name: COPY.avatarSolidEyebrow }),
    ).toBeTruthy();
  });

  it('marks the saved pair as the selected swatch, and no solid', () => {
    render(
      <AvatarPicker
        handle="adal"
        avatarColor="accent"
        avatarSecondColor="warning"
        onChange={vi.fn()}
      />,
    );
    expect(pressed()).toEqual([pairLabel('accent', 'warning')]);
  });

  // Seed, admin or legacy data can hold a pair in either order; the avatar is
  // drawn the same, so one swatch is selected.
  it('selects a pair stored the other way round', () => {
    render(
      <AvatarPicker
        handle="adal"
        avatarColor="warning"
        avatarSecondColor="accent"
        onChange={vi.fn()}
      />,
    );
    expect(pressed()).toEqual([pairLabel('accent', 'warning')]);
  });

  it('marks the saved solid, and no pair', () => {
    render(
      <AvatarPicker
        handle="adal"
        avatarColor="success"
        avatarSecondColor={null}
        onChange={vi.fn()}
      />,
    );
    expect(pressed()).toEqual([solidLabel('success')]);
  });

  // A profile with no colour draws the house pair, so the board's first swatch
  // is the selected one.
  it('selects the house pair for a profile with no colour yet', () => {
    render(
      <AvatarPicker
        handle="adal"
        avatarColor={null}
        avatarSecondColor={null}
        onChange={vi.fn()}
      />,
    );
    expect(pressed()).toEqual([pairLabel('signal', 'accent')]);
  });

  it('hands a pair, or a solid with a null second colour, to onChange', () => {
    const onChange = vi.fn();
    render(
      <AvatarPicker
        handle="adal"
        avatarColor="signal"
        avatarSecondColor="accent"
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByLabelText(pairLabel('success', 'signal')));
    expect(onChange).toHaveBeenLastCalledWith('success', 'signal');
    fireEvent.click(screen.getByLabelText(solidLabel('warning')));
    expect(onChange).toHaveBeenLastCalledWith('warning', null);
  });

  it('previews the avatar centred, in a ring', () => {
    render(
      <AvatarPicker
        handle="adal"
        avatarColor="signal"
        avatarSecondColor="accent"
        onChange={vi.fn()}
      />,
    );
    const preview = screen.getByTestId('avatar-picker-preview');
    expect(preview).toHaveStyle({ width: '114px', height: '114px' });
    expect(preview.textContent).toBe('A');
  });
});
